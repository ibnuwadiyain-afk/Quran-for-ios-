import Foundation

final class OfflineContentDownloader {
    private let queue = OperationQueue()
    private let lock = NSLock()
    private var finishedCount = 0
    private var failedCount = 0
    private var versesByChapter: [Int: [Verse]] = [:]
    private var progress: ((Int, Int) -> Void)?
    private var completion: ((Int) -> Void)?
    private var activeTranslationID = 20
    private var isRunning = false
    private let totalPages = 604

    func start(translationID: Int, progress: @escaping (Int, Int) -> Void, completion: @escaping (Int) -> Void) {
        lock.lock()
        guard !isRunning else { lock.unlock(); completion(totalPages); return }
        isRunning = true
        finishedCount = 0
        failedCount = 0
        versesByChapter = [:]
        activeTranslationID = translationID
        self.progress = progress
        self.completion = completion
        lock.unlock()
        queue.maxConcurrentOperationCount = 3
        queue.qualityOfService = .utility

        for page in 1...totalPages {
            queue.addOperation { [weak self] in self?.downloadPage(page) }
        }
    }

    private func downloadPage(_ page: Int) {
        var pageFailure = false
        let store = LocalStore.shared
        let cachedPageData = store.offlinePageData(page, translationID: activeTranslationID)
        var decodedVerses: [Verse]? = cachedPageData.flatMap { try? QuranAPI.decodeVersePayload($0) }
        if decodedVerses == nil, let url = QuranAPI.offlinePageDataURL(page: page, translationID: activeTranslationID), let downloaded = fetch(url) {
            if let parsed = try? QuranAPI.decodeVersePayload(downloaded) {
                decodedVerses = parsed
                try? store.saveOfflinePageData(downloaded, page: page, translationID: activeTranslationID)
            }
        }
        if let verses = decodedVerses {
            lock.lock()
            for verse in verses {
                let chapterID = verse.verseKey.split(separator: ":").first.flatMap { Int(String($0)) } ?? 0
                if chapterID > 0 { versesByChapter[chapterID, default: []].append(verse) }
            }
            lock.unlock()
        } else { pageFailure = true }

        if !store.pageImageExists(page) {
            if let url = MushafPageStore.imageURL(page), let imageData = fetch(url), isPNG(imageData) {
                do { try store.saveOfflinePageImage(imageData, page: page) }
                catch { pageFailure = true }
            } else { pageFailure = true }
        }
        finishPage(failed: pageFailure)
    }

    private func fetch(_ url: URL) -> Data? {
        var request = URLRequest(url: url)
        request.timeoutInterval = 60
        request.setValue("QuranReader-iOS/1.0 (iOS 12 compatible; non-profit)", forHTTPHeaderField: "User-Agent")
        request.setValue("application/json,image/png,*/*", forHTTPHeaderField: "Accept")
        let semaphore = DispatchSemaphore(value: 0)
        var output: Data?
        URLSession.shared.dataTask(with: request) { data, response, error in
            if error == nil, let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) {
                output = data
            }
            semaphore.signal()
        }.resume()
        if semaphore.wait(timeout: .now() + 70) == .timedOut { return nil }
        return output
    }

    private func isPNG(_ data: Data) -> Bool {
        let signature: [UInt8] = [137, 80, 78, 71, 13, 10, 26, 10]
        return data.count > 8 && Array(data.prefix(8)) == signature
    }

    private func finishPage(failed: Bool) {
        lock.lock()
        finishedCount += 1
        if failed { failedCount += 1 }
        let finished = finishedCount
        let failures = failedCount
        let progressCallback = progress
        let finalCallback = completion
        var grouped: [Int: [Verse]] = [:]
        if finished == totalPages { grouped = versesByChapter }
        lock.unlock()

        DispatchQueue.main.async { progressCallback?(finished, self.totalPages) }
        guard finished == totalPages else { return }
        for (chapterID, verses) in grouped {
            let unique = Dictionary(grouping: verses, by: { $0.verseKey }).compactMap { $0.value.first }.sorted {
                let left = Int($0.verseKey.split(separator: ":").last.map { String($0) } ?? "0") ?? 0
                let right = Int($1.verseKey.split(separator: ":").last.map { String($0) } ?? "0") ?? 0
                return left < right
            }
            LocalStore.shared.cacheOfflineChapter(unique, chapterID: chapterID, translationID: activeTranslationID)
        }
        lock.lock(); isRunning = false; lock.unlock()
        DispatchQueue.main.async { finalCallback?(failures) }
    }
}
