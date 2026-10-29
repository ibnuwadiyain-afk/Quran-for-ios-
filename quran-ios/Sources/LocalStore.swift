import Foundation

final class LocalStore {
    static let shared = LocalStore()
    private let defaults = UserDefaults.standard
    private let bookmarksKey = "savedQuranBookmarks"
    private let lastReadKey = "lastReadVerseKey"
    private let chaptersKey = "cachedChapterIndex"
    private init() {}

    func cacheChapters(_ chapters: [Chapter]) {
        if let data = try? JSONEncoder().encode(chapters) { defaults.set(data, forKey: chaptersKey) }
    }

    func cachedChapters() -> [Chapter]? {
        if let data = defaults.data(forKey: chaptersKey),
           let decoded = try? JSONDecoder().decode([Chapter].self, from: data),
           !decoded.isEmpty {
            return decoded
        }
        return bundledChapters()
    }

    func bundledChapters() -> [Chapter]? {
        guard let url = Bundle.main.url(forResource: "chapters", withExtension: "json") ?? Bundle.main.url(forResource: "chapters", withExtension: "json", subdirectory: "BundledData"),
              let data = try? Data(contentsOf: url),
              let root = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let rows = root["chapters"] as? [[String: Any]] else {
            return nil
        }
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
            return Chapter(
                id: id,
                nameArabic: arabic,
                nameSimple: simple,
                translatedName: translated,
                versesCount: row["verses_count"] as? Int ?? 0,
                revelationPlace: row["revelation_place"] as? String ?? ""
            )
        }
        return parsed.isEmpty ? nil : parsed
    }

    func bundledResources(kind: String) -> [QuranResource]? {
        guard let url = Bundle.main.url(forResource: "resources_catalog", withExtension: "json") ?? Bundle.main.url(forResource: "resources_catalog", withExtension: "json", subdirectory: "BundledData"),
              let data = try? Data(contentsOf: url),
              let root = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let section = root[kind] as? [String: Any] else {
            return nil
        }
        let key = kind == "chapter_reciters" ? "reciters" : kind
        guard let rows = section[key] as? [[String: Any]] else { return nil }
        let values = rows.compactMap { row -> QuranResource? in
            guard let id = row["id"] as? Int else { return nil }
            let name = row["name"] as? String ?? "Resource \(id)"
            let translated = (row["translated_name"] as? [String: Any])?["name"] as? String
            let author = row["author_name"] as? String ?? ""
            return QuranResource(id: id, name: translated ?? name, languageName: row["language_name"] as? String ?? "", authorName: author)
        }
        return values.isEmpty ? nil : values
    }

    var lastReadVerseKey: String? {
        get { defaults.string(forKey: lastReadKey) }
        set { defaults.set(newValue, forKey: lastReadKey) }
    }

    func bookmarks() -> [Bookmark] {
        guard let data = defaults.data(forKey: bookmarksKey), let values = try? JSONDecoder().decode([Bookmark].self, from: data) else { return [] }
        return values.sorted { $0.createdAt > $1.createdAt }
    }

    func isBookmarked(_ key: String) -> Bool { bookmarks().contains { $0.verseKey == key } }

    func toggle(_ bookmark: Bookmark) -> Bool {
        var values = bookmarks()
        if let index = values.firstIndex(where: { $0.verseKey == bookmark.verseKey }) {
            values.remove(at: index); save(values); return false
        }
        values.append(bookmark); save(values); return true
    }

    func removeBookmark(_ key: String) { save(bookmarks().filter { $0.verseKey != key }) }

    private func save(_ values: [Bookmark]) {
        if let data = try? JSONEncoder().encode(values) { defaults.set(data, forKey: bookmarksKey) }
    }

    private var supportDirectory: URL {
        let url = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
        try? FileManager.default.createDirectory(at: url, withIntermediateDirectories: true, attributes: nil)
        return url
    }

    private var readerCacheDirectory: URL {
        let url = supportDirectory.appendingPathComponent("QuranCache", isDirectory: true)
        try? FileManager.default.createDirectory(at: url, withIntermediateDirectories: true, attributes: nil)
        return url
    }

    private var offlineDirectory: URL {
        let url = supportDirectory.appendingPathComponent("OfflineQuran", isDirectory: true)
        try? FileManager.default.createDirectory(at: url, withIntermediateDirectories: true, attributes: nil)
        return url
    }

    private var pageImagesDirectory: URL {
        let url = offlineDirectory.appendingPathComponent("MushafPages", isDirectory: true)
        try? FileManager.default.createDirectory(at: url, withIntermediateDirectories: true, attributes: nil)
        return url
    }

    private var pageDataDirectory: URL {
        let url = offlineDirectory.appendingPathComponent("PageData", isDirectory: true)
        try? FileManager.default.createDirectory(at: url, withIntermediateDirectories: true, attributes: nil)
        return url
    }

    private func chapterCacheURL(_ chapterID: Int, words: Bool) -> URL {
        let suffix = words ? "-words" : ""
        return readerCacheDirectory.appendingPathComponent("chapter-\(chapterID)-translation-\(AppSettings.translationID)\(suffix).json")
    }

    func cache(verses: [Verse], chapterID: Int, includeWords: Bool = false) {
        if let data = try? JSONEncoder().encode(verses) { try? data.write(to: chapterCacheURL(chapterID, words: includeWords), options: .atomic) }
    }

    func cachedVerses(chapterID: Int, includeWords: Bool = false) -> [Verse]? {
        let url = chapterCacheURL(chapterID, words: includeWords)
        if let data = try? Data(contentsOf: url), let verses = try? JSONDecoder().decode([Verse].self, from: data), !verses.isEmpty {
            return verses
        }
        if chapterID == 1 && AppSettings.translationID == 20 {
            if let bundledData = offlinePageData(1, translationID: 20),
               let verses = try? QuranAPI.decodeVersePayload(bundledData), !verses.isEmpty {
                return verses
            }
        }
        return nil
    }

    private func pageDataURL(_ page: Int, translationID: Int) -> URL {
        pageDataDirectory.appendingPathComponent(String(format: "page-%03d-translation-%d.json", page, translationID))
    }

    func offlinePageData(_ page: Int, translationID: Int) -> Data? {
        if let saved = try? Data(contentsOf: pageDataURL(page, translationID: translationID)) {
            return saved
        }
        let resourceName = String(format: "page-%03d-translation-%d", page, translationID)
        if let bundledURL = Bundle.main.url(forResource: resourceName, withExtension: "json") ?? Bundle.main.url(forResource: resourceName, withExtension: "json", subdirectory: "BundledData") {
            return try? Data(contentsOf: bundledURL)
        }
        return nil
    }

    func saveOfflinePageData(_ data: Data, page: Int, translationID: Int) throws {
        try data.write(to: pageDataURL(page, translationID: translationID), options: .atomic)
    }

    func saveOfflinePageImage(_ data: Data, page: Int) throws {
        try data.write(to: pageImagesDirectory.appendingPathComponent(String(format: "page%03d.png", page)), options: .atomic)
    }

    func pageImageURL(_ page: Int) -> URL? {
        let url = pageImagesDirectory.appendingPathComponent(String(format: "page%03d.png", page))
        if FileManager.default.fileExists(atPath: url.path) { return url }
        let name = String(format: "page%03d", page)
        if let bundled = Bundle.main.url(forResource: name, withExtension: "png") ?? Bundle.main.url(forResource: name, withExtension: "png", subdirectory: "BundledData") {
            return bundled
        }
        return nil
    }

    func pageDataExists(_ page: Int, translationID: Int) -> Bool {
        FileManager.default.fileExists(atPath: pageDataURL(page, translationID: translationID).path)
    }

    func pageImageExists(_ page: Int) -> Bool { pageImageURL(page) != nil }

    func cacheOfflineChapter(_ verses: [Verse], chapterID: Int, translationID: Int) {
        let suffix = "chapter-\(chapterID)-translation-\(translationID)-words.json"
        let url = readerCacheDirectory.appendingPathComponent(suffix)
        if let data = try? JSONEncoder().encode(verses) { try? data.write(to: url, options: .atomic) }
    }

    func clearReaderCache() { try? FileManager.default.removeItem(at: readerCacheDirectory) }
    func clearOfflineQuran() { try? FileManager.default.removeItem(at: offlineDirectory) }
}
