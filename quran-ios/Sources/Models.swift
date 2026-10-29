import Foundation
import UIKit

struct Chapter: Codable {
    let id: Int
    let nameArabic: String
    let nameSimple: String
    let translatedName: String
    let versesCount: Int
    let revelationPlace: String

    enum CodingKeys: String, CodingKey {
        case id
        case nameArabic = "name_arabic"
        case nameSimple = "name_simple"
        case translatedName = "translated_name"
        case versesCount = "verses_count"
        case revelationPlace = "revelation_place"
    }
}

struct Verse: Codable {
    let id: Int
    let verseKey: String
    let arabic: String
    let translation: String
    let words: [WordInfo]?

    enum CodingKeys: String, CodingKey {
        case id
        case verseKey = "verse_key"
        case arabic = "text_uthmani"
        case translation
        case words
    }
}

struct WordInfo: Codable {
    let position: Int
    let arabic: String
    let translation: String
    let transliteration: String
    let audioURL: String?
}

struct QuranResource: Codable {
    let id: Int
    let name: String
    let languageName: String
    let authorName: String

    var displayName: String { authorName.isEmpty || authorName == name ? name : "\(name) — \(authorName)" }
}

struct Bookmark: Codable {
    let verseKey: String
    let chapterName: String
    let arabic: String
    let translation: String
    let createdAt: Date
}

struct SearchResult {
    let verseKey: String
    let arabic: String
    let translation: String

    var chapterID: Int {
        let value = verseKey.split(separator: ":").first.map { String($0) } ?? "1"
        return Int(value) ?? 1
    }
    var verseNumber: Int {
        let value = verseKey.split(separator: ":").last.map { String($0) } ?? "1"
        return Int(value) ?? 1
    }
}

enum AppSettings {
    private static let translationKey = "translationResourceID"
    private static let reciterKey = "reciterID"
    private static let tafsirKey = "tafsirResourceID"
    private static let readingSizeKey = "readingSize"
    static var arabicFontSize: CGFloat {
        get { let size = UserDefaults.standard.integer(forKey: readingSizeKey); return size == 0 ? 28 : CGFloat(size) }
        set { UserDefaults.standard.set(Int(newValue), forKey: readingSizeKey) }
    }
    static var translationID: Int {
        get { UserDefaults.standard.integer(forKey: translationKey) == 0 ? 20 : UserDefaults.standard.integer(forKey: translationKey) }
        set { UserDefaults.standard.set(newValue, forKey: translationKey) }
    }
    static var reciterID: Int {
        get { UserDefaults.standard.integer(forKey: reciterKey) == 0 ? 7 : UserDefaults.standard.integer(forKey: reciterKey) }
        set { UserDefaults.standard.set(newValue, forKey: reciterKey) }
    }
    static var tafsirID: Int {
        get { UserDefaults.standard.integer(forKey: tafsirKey) == 0 ? 169 : UserDefaults.standard.integer(forKey: tafsirKey) }
        set { UserDefaults.standard.set(newValue, forKey: tafsirKey) }
    }
}
