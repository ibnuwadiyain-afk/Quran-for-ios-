import Foundation

final class QuranAPI {
    static let shared = QuranAPI()
    private let base = URL(string: "https://api.quran.com/api/v4")!
    private let session: URLSession
    private init() {
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 30
        config.timeoutIntervalForResource = 90
        config.requestCachePolicy = .useProtocolCachePolicy
        session = URLSession(configuration: config)
    }

    func chapters(completion: @escaping (Result<[Chapter], Error>) -> Void) {
        request(path: "chapters", query: [URLQueryItem(name: "language", value: "en")]) { result in
            switch result {
            case .failure(let error):
                if let cached = LocalStore.shared.cachedChapters() { completion(.success(cached)) }
                else { completion(.failure(error)) }
            case .success(let data):
                do {
                    let root = try JSONSerialization.jsonObject(with: data) as? [String: Any]
                    let rows = root?["chapters"] as? [[String: Any]] ?? []
                    let parsed = rows.compactMap { row -> Chapter? in
                        guard let id = row["id"] as? Int,
                              let arabic = row["name_arabic"] as? String,
                              let simple = row["name_simple"] as? String else { return nil }
                        let translated: String
                        if let object = row["translated_name"] as? [String: Any] {
                            translated = object["name"] as? String ?? simple
                        } else {
                            translated = row["translated_name"] as? String ?? simple
                        }
                        return Chapter(id: id, nameArabic: arabic, nameSimple: simple, translatedName: translated,
                                       versesCount: row["verses_count"] as? Int ?? 0,
                                       revelationPlace: row["revelation_place"] as? String ?? "")
                    }
                    if !parsed.isEmpty {
                        LocalStore.shared.cacheChapters(parsed)
                        completion(.success(parsed))
                    } else if let cached = LocalStore.shared.cachedChapters() {
                        completion(.success(cached))
                    } else {
                        completion(.failure(APIError.invalidResponse))
                    }
                } catch {
                    if let cached = LocalStore.shared.cachedChapters() { completion(.success(cached)) }
                    else { completion(.failure(error)) }
                }
            }
        }
    }

    func verses(chapterID: Int, includeWords: Bool = false, completion: @escaping (Result<[Verse], Error>) -> Void) {
        var all: [Verse] = []
        func load(page: Int) {
            var query = [
                URLQueryItem(name: "language", value: "en"),
                URLQueryItem(name: "fields", value: "text_uthmani"),
                URLQueryItem(name: "translations", value: String(AppSettings.translationID)),
                URLQueryItem(name: "per_page", value: "50"),
                URLQueryItem(name: "page", value: String(page))
            ]
            if includeWords {
                query.append(URLQueryItem(name: "words", value: "true"))
                query.append(URLQueryItem(name: "word_fields", value: "text_uthmani,translation,transliteration,audio_url"))
            }
            request(path: "verses/by_chapter/\(chapterID)", query: query) { result in
                switch result {
                case .failure(let error): completion(.failure(error))
                case .success(let data):
                    do {
                        let parsed = try Self.decodeVersePayload(data)
                        all.append(contentsOf: parsed)
                        let root = try JSONSerialization.jsonObject(with: data) as? [String: Any]
                        let pagination = root?["pagination"] as? [String: Any]
                        let totalPages = pagination?["total_pages"] as? Int ?? page
                        if page < totalPages { load(page: page + 1) } else { completion(.success(all)) }
                    } catch { completion(.failure(error)) }
                }
            }
        }
        load(page: 1)
    }

    func pageVerses(page: Int, translationID: Int, completion: @escaping (Result<[Verse], Error>) -> Void) {
        let query = [
            URLQueryItem(name: "language", value: "en"),
            URLQueryItem(name: "fields", value: "text_uthmani"),
            URLQueryItem(name: "translations", value: String(translationID)),
            URLQueryItem(name: "words", value: "true"),
            URLQueryItem(name: "word_fields", value: "text_uthmani,translation,transliteration,audio_url"),
            URLQueryItem(name: "per_page", value: "50")
        ]
        request(path: "verses/by_page/\(page)", query: query) { result in
            completion(result.flatMap { data -> Result<[Verse], Error> in
                do { return .success(try Self.decodeVersePayload(data)) }
                catch { return .failure(error) }
            })
        }
    }

    static func decodeVersePayload(_ data: Data) throws -> [Verse] {
        guard let root = try JSONSerialization.jsonObject(with: data) as? [String: Any],
              let rows = root["verses"] as? [[String: Any]], !rows.isEmpty else { throw APIError.invalidResponse }
        let decoder = JSONDecoder()
        return try rows.map { row in
            let rawTrans = (row["translations"] as? [[String: Any]])?.first?["text"] as? String ?? ""
            let trans = HTMLTextSanitizer.clean(rawTrans)
            let words: [[String: Any]] = (row["words"] as? [[String: Any]] ?? []).filter { ($0["char_type_name"] as? String ?? "word") == "word" }.map { word in
                let translation = HTMLTextSanitizer.clean((word["translation"] as? [String: Any])?["text"] as? String ?? "")
                let transliteration = (word["transliteration"] as? [String: Any])?["text"] as? String ?? ""
                return [
                    "position": word["position"] as? Int ?? 0,
                    "arabic": word["text_uthmani"] as? String ?? word["text"] as? String ?? "",
                    "translation": translation,
                    "transliteration": transliteration,
                    "audioURL": word["audio_url"] as? String ?? ""
                ]
            }
            var normalized = row
            normalized["translation"] = trans
            normalized["words"] = words
            return try decoder.decode(Verse.self, from: JSONSerialization.data(withJSONObject: normalized))
        }
    }

    func resources(kind: String, language: String? = nil, completion: @escaping (Result<[QuranResource], Error>) -> Void) {
        let query = language.map { [URLQueryItem(name: "language", value: $0)] } ?? []
        request(path: "resources/\(kind)", query: query) { result in
            switch result {
            case .failure(let error):
                if let bundled = LocalStore.shared.bundledResources(kind: kind) {
                    completion(.success(bundled))
                } else {
                    completion(.failure(error))
                }
            case .success(let data):
                do {
                    let root = try JSONSerialization.jsonObject(with: data) as? [String: Any] ?? [:]
                    let key = kind == "chapter_reciters" ? "reciters" : kind
                    let rows = root[key] as? [[String: Any]] ?? []
                    let values = rows.compactMap { row -> QuranResource? in
                        guard let id = row["id"] as? Int else { return nil }
                        let name = row["name"] as? String ?? "Resource \(id)"
                        let translated = (row["translated_name"] as? [String: Any])?["name"] as? String
                        let author = row["author_name"] as? String ?? ""
                        return QuranResource(id: id, name: translated ?? name, languageName: row["language_name"] as? String ?? "", authorName: author)
                    }
                    if !values.isEmpty {
                        completion(.success(values))
                    } else if let bundled = LocalStore.shared.bundledResources(kind: kind) {
                        completion(.success(bundled))
                    } else {
                        completion(.failure(APIError.invalidResponse))
                    }
                } catch {
                    if let bundled = LocalStore.shared.bundledResources(kind: kind) {
                        completion(.success(bundled))
                    } else {
                        completion(.failure(error))
                    }
                }
            }
        }
    }

    func tafsir(resourceID: Int, verseKey: String, completion: @escaping (Result<(String, String), Error>) -> Void) {
        request(path: "tafsirs/\(resourceID)/by_ayah/\(verseKey)", query: []) { result in
            completion(result.flatMap { data in
                do {
                    let root = try JSONSerialization.jsonObject(with: data) as? [String: Any]
                    let payload = root?["tafsir"] as? [String: Any]
                    guard let text = payload?["text"] as? String else { throw APIError.invalidResponse }
                    let name = payload?["resource_name"] as? String ?? "Tafsir"
                    return .success((name, text))
                } catch { return .failure(error) }
            })
        }
    }

    func search(_ text: String, completion: @escaping (Result<[SearchResult], Error>) -> Void) {
        let query = [URLQueryItem(name: "q", value: text), URLQueryItem(name: "language", value: "en"), URLQueryItem(name: "size", value: "30"), URLQueryItem(name: "translations", value: String(AppSettings.translationID))]
        request(path: "search", query: query) { result in
            completion(result.flatMap { data in
                do {
                    let root = try JSONSerialization.jsonObject(with: data) as? [String: Any]
                    let rows = (root?["search"] as? [String: Any])?["results"] as? [[String: Any]] ?? []
                    let mapped = rows.compactMap { item -> SearchResult? in
                        guard let key = item["verse_key"] as? String else { return nil }
                        let arabic = item["text"] as? String ?? item["text_uthmani"] as? String ?? ""
                        let translations = item["translations"] as? [[String: Any]]
                        let translation = HTMLTextSanitizer.clean(translations?.first?["text"] as? String ?? "")
                        return SearchResult(verseKey: key, arabic: arabic, translation: translation)
                    }
                    return .success(mapped)
                } catch { return .failure(error) }
            })
        }
    }

    func verseAudioURL(verseKey: String, completion: @escaping (Result<URL, Error>) -> Void) {
        let query = [URLQueryItem(name: "audio", value: String(AppSettings.reciterID)), URLQueryItem(name: "fields", value: "text_uthmani")]
        request(path: "verses/by_key/\(verseKey)", query: query) { result in
            completion(result.flatMap { data in
                do {
                    let root = try JSONSerialization.jsonObject(with: data) as? [String: Any]
                    let verse = root?["verse"] as? [String: Any]
                    let audio = verse?["audio"] as? [String: Any]
                    guard let path = audio?["url"] as? String else { throw APIError.invalidResponse }
                    let full = path.hasPrefix("http") ? path : "https://audio.qurancdn.com/\(path.hasPrefix("/") ? String(path.dropFirst()) : path)"
                    guard let url = URL(string: full) else { throw APIError.invalidResponse }
                    return .success(url)
                } catch { return .failure(error) }
            })
        }
    }

    func chapterAudioURL(chapterID: Int, completion: @escaping (Result<URL, Error>) -> Void) {
        request(path: "chapter_recitations/\(AppSettings.reciterID)/\(chapterID)", query: []) { result in
            completion(result.flatMap { data in
                do {
                    let root = try JSONSerialization.jsonObject(with: data) as? [String: Any]
                    let audio = root?["audio_file"] as? [String: Any]
                    guard let path = audio?["audio_url"] as? String else { throw APIError.invalidResponse }
                    let full = path.hasPrefix("http") ? path : "https://audio.qurancdn.com/\(path.hasPrefix("/") ? String(path.dropFirst()) : path)"
                    guard let url = URL(string: full) else { throw APIError.invalidResponse }
                    return .success(url)
                } catch { return .failure(error) }
            })
        }
    }

    static func offlinePageDataURL(page: Int, translationID: Int) -> URL? {
        var components = URLComponents(string: "https://api.quran.com/api/v4/verses/by_page/\(page)")
        components?.queryItems = [
            URLQueryItem(name: "language", value: "en"),
            URLQueryItem(name: "fields", value: "text_uthmani"),
            URLQueryItem(name: "translations", value: String(translationID)),
            URLQueryItem(name: "words", value: "true"),
            URLQueryItem(name: "word_fields", value: "text_uthmani,translation,transliteration,audio_url"),
            URLQueryItem(name: "per_page", value: "50")
        ]
        return components?.url
    }

    private func request(path: String, query: [URLQueryItem], completion: @escaping (Result<Data, Error>) -> Void) {
        var components = URLComponents(url: base.appendingPathComponent(path), resolvingAgainstBaseURL: false)!
        components.queryItems = query.isEmpty ? nil : query
        guard let url = components.url else { completion(.failure(APIError.invalidURL)); return }
        var request = URLRequest(url: url)
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        request.setValue("QuranReader-iOS/1.0 (iOS 12 compatible; non-profit)", forHTTPHeaderField: "User-Agent")
        session.dataTask(with: request) { data, response, error in
            if let error = error { DispatchQueue.main.async { completion(.failure(error)) }; return }
            guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode), let data = data else {
                DispatchQueue.main.async { completion(.failure(APIError.server)) }; return
            }
            DispatchQueue.main.async { completion(.success(data)) }
        }.resume()
    }
}

enum APIError: LocalizedError {
    case invalidURL, invalidResponse, server
    var errorDescription: String? {
        switch self {
        case .invalidURL: return "The request URL could not be created."
        case .invalidResponse: return "The service returned an unexpected response."
        case .server: return "The service could not be reached. Please check your connection and try again."
        }
    }
}
