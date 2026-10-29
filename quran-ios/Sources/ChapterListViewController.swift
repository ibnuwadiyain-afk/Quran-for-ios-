import UIKit

final class ChapterListViewController: UITableViewController {
    private var chapters: [Chapter] = []
    private var filtered: [Chapter] = []
    private var searchController: UISearchController!
    private let loading = UIActivityIndicatorView(style: .gray)

    override func viewDidLoad() {
        super.viewDidLoad()
        title = "The Holy Quran"
        tableView.register(ChapterCell.self, forCellReuseIdentifier: "chapter")
        tableView.rowHeight = 72
        tableView.tableFooterView = UIView()
        searchController = UISearchController(searchResultsController: nil)
        searchController.searchResultsUpdater = self
        searchController.obscuresBackgroundDuringPresentation = false
        searchController.searchBar.placeholder = "Search surahs"
        navigationItem.searchController = searchController
        navigationItem.hidesSearchBarWhenScrolling = false
        definesPresentationContext = true
        loadChapters()
    }

    private func loadChapters() {
        loading.startAnimating()
        tableView.backgroundView = loading
        QuranAPI.shared.chapters { [weak self] result in
            guard let self = self else { return }
            self.loading.stopAnimating()
            self.tableView.backgroundView = nil
            switch result {
            case .success(let chapters):
                self.chapters = chapters
                self.filtered = chapters
                self.tableView.reloadData()
                self.openLastReadIfAvailable()
            case .failure(let error):
                self.showNotice("Could not load the surah list. Please connect to the internet and retry.\n\n\(error.localizedDescription)")
                self.navigationItem.rightBarButtonItem = UIBarButtonItem(title: "Retry", style: .plain, target: self, action: #selector(self.retry))
            }
        }
    }

    @objc private func retry() { loadChapters() }
    private func openLastReadIfAvailable() {
        guard let key = LocalStore.shared.lastReadVerseKey else { return }
        let parts = key.split(separator: ":").map(String.init)
        guard let chapterText = parts.first, let chapterID = Int(chapterText), let chapter = chapters.first(where: { $0.id == chapterID }) else { return }
        let verseNumber = parts.count > 1 ? Int(parts[1]) : nil
        let reader = ReaderViewController(chapter: chapter, jumpToVerse: verseNumber)
        navigationController?.pushViewController(reader, animated: false)
    }
    private var visibleChapters: [Chapter] { searchController.isActive ? filtered : chapters }

    override func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int { visibleChapters.count }
    override func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
        let cell = tableView.dequeueReusableCell(withIdentifier: "chapter", for: indexPath) as! ChapterCell
        let chapter = visibleChapters[indexPath.row]
        cell.configure(chapter)
        return cell
    }
    override func tableView(_ tableView: UITableView, didSelectRowAt indexPath: IndexPath) {
        tableView.deselectRow(at: indexPath, animated: true)
        navigationController?.pushViewController(ReaderViewController(chapter: visibleChapters[indexPath.row]), animated: true)
    }
}

extension ChapterListViewController: UISearchResultsUpdating {
    func updateSearchResults(for searchController: UISearchController) {
        let q = (searchController.searchBar.text ?? "").trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        filtered = q.isEmpty ? chapters : chapters.filter { $0.nameSimple.lowercased().contains(q) || $0.translatedName.lowercased().contains(q) || $0.nameArabic.contains(q) }
        tableView.reloadData()
    }
}

final class ChapterCell: UITableViewCell {
    private let number = UILabel()
    private let english = UILabel()
    private let subtitle = UILabel()
    private let arabic = UILabel()
    override init(style: UITableViewCell.CellStyle, reuseIdentifier: String?) {
        super.init(style: style, reuseIdentifier: reuseIdentifier)
        selectionStyle = .default
        number.font = .systemFont(ofSize: 15, weight: .semibold)
        number.textColor = .gray
        english.font = .systemFont(ofSize: 17, weight: .semibold)
        subtitle.font = .systemFont(ofSize: 12)
        subtitle.textColor = .gray
        arabic.font = .systemFont(ofSize: 22)
        arabic.textAlignment = .right
        let labels = UIStackView(arrangedSubviews: [english, subtitle])
        labels.axis = .vertical
        labels.spacing = 4
        let row = UIStackView(arrangedSubviews: [number, labels, arabic])
        row.axis = .horizontal
        row.alignment = .center
        row.spacing = 12
        number.widthAnchor.constraint(equalToConstant: 28).isActive = true
        arabic.widthAnchor.constraint(greaterThanOrEqualToConstant: 75).isActive = true
        row.translatesAutoresizingMaskIntoConstraints = false
        contentView.addSubview(row)
        NSLayoutConstraint.activate([row.leadingAnchor.constraint(equalTo: contentView.leadingAnchor, constant: 16), row.trailingAnchor.constraint(equalTo: contentView.trailingAnchor, constant: -16), row.topAnchor.constraint(equalTo: contentView.topAnchor, constant: 8), row.bottomAnchor.constraint(equalTo: contentView.bottomAnchor, constant: -8)])
    }
    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }
    func configure(_ chapter: Chapter) {
        number.text = "\(chapter.id)"
        english.text = chapter.nameSimple
        subtitle.text = "\(chapter.translatedName)  ·  \(chapter.versesCount) verses  ·  \(chapter.revelationPlace.capitalized)"
        arabic.text = chapter.nameArabic
    }
}
