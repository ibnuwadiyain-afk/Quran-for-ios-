import UIKit

final class BookmarksViewController: UITableViewController {
    private var items: [Bookmark] = []
    private let emptyLabel = UILabel()

    override func viewDidLoad() {
        super.viewDidLoad()
        title = "Bookmarks"
        tableView.register(BookmarkCell.self, forCellReuseIdentifier: "bookmark")
        tableView.rowHeight = UITableView.automaticDimension
        tableView.estimatedRowHeight = 145
        tableView.tableFooterView = UIView()
        emptyLabel.text = "No bookmarked verses yet.\nTap “☆ Bookmark” on any verse while reading to save it here."
        emptyLabel.textAlignment = .center
        emptyLabel.textColor = .gray
        emptyLabel.numberOfLines = 0
        emptyLabel.font = .systemFont(ofSize: 15)
    }

    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        reload()
    }

    private func reload() {
        items = LocalStore.shared.bookmarks()
        tableView.backgroundView = items.isEmpty ? emptyLabel : nil
        tableView.reloadData()
    }

    override func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int { items.count }

    override func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
        let cell = tableView.dequeueReusableCell(withIdentifier: "bookmark", for: indexPath) as! BookmarkCell
        cell.configure(items[indexPath.row])
        return cell
    }

    override func tableView(_ tableView: UITableView, didSelectRowAt indexPath: IndexPath) {
        tableView.deselectRow(at: indexPath, animated: true)
        let mark = items[indexPath.row]
        let parts = mark.verseKey.split(separator: ":").map { String($0) }
        guard let firstPart = parts.first, let chapterID = Int(firstPart) else { return }
        let verseNumber = parts.count > 1 ? Int(parts[1]) : nil
        QuranAPI.shared.chapters { [weak self] result in
            guard let self = self else { return }
            let chapter = (try? result.get())?.first(where: { $0.id == chapterID }) ?? Chapter(id: chapterID, nameArabic: "", nameSimple: mark.chapterName, translatedName: "", versesCount: 0, revelationPlace: "")
            self.navigationController?.pushViewController(ReaderViewController(chapter: chapter, jumpToVerse: verseNumber), animated: true)
        }
    }

    override func tableView(_ tableView: UITableView, canEditRowAt indexPath: IndexPath) -> Bool { true }

    override func tableView(_ tableView: UITableView, commit editingStyle: UITableViewCell.EditingStyle, forRowAt indexPath: IndexPath) {
        if editingStyle == .delete { LocalStore.shared.removeBookmark(items[indexPath.row].verseKey); reload() }
    }
}

final class BookmarkCell: UITableViewCell {
    private let titleLabel = UILabel()
    private let arabicLabel = UILabel()
    private let translationLabel = UILabel()

    override init(style: UITableViewCell.CellStyle, reuseIdentifier: String?) {
        super.init(style: style, reuseIdentifier: reuseIdentifier)
        titleLabel.font = .systemFont(ofSize: 13, weight: .semibold)
        titleLabel.textColor = .gray
        arabicLabel.font = .systemFont(ofSize: 23)
        arabicLabel.textAlignment = .right
        arabicLabel.numberOfLines = 2
        translationLabel.font = .systemFont(ofSize: 15)
        translationLabel.numberOfLines = 3
        let stack = UIStackView(arrangedSubviews: [titleLabel, arabicLabel, translationLabel])
        stack.axis = .vertical
        stack.spacing = 8
        stack.translatesAutoresizingMaskIntoConstraints = false
        contentView.addSubview(stack)
        NSLayoutConstraint.activate([
            stack.leadingAnchor.constraint(equalTo: contentView.leadingAnchor, constant: 16),
            stack.trailingAnchor.constraint(equalTo: contentView.trailingAnchor, constant: -16),
            stack.topAnchor.constraint(equalTo: contentView.topAnchor, constant: 12),
            stack.bottomAnchor.constraint(equalTo: contentView.bottomAnchor, constant: -12)
        ])
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

    func configure(_ bookmark: Bookmark) {
        titleLabel.text = "\(bookmark.chapterName)  ·  \(bookmark.verseKey)"
        arabicLabel.text = bookmark.arabic
        translationLabel.text = HTMLTextSanitizer.clean(bookmark.translation)
    }
}
