import UIKit

final class ChapterListViewController: UITableViewController, UISearchBarDelegate {
    private var chapters: [Chapter] = []
    private var filtered: [Chapter] = []
    private let searchBar = UISearchBar()
    private var isSearching = false
    private let loading = UIActivityIndicatorView(style: .gray)
    private var didCheckLastRead = false

    init() {
        super.init(style: .plain)
    }

    override init(style: UITableView.Style) {
        super.init(style: style)
    }

    override init(nibName nibNameOrNil: String?, bundle nibBundleOrNil: Bundle?) {
        super.init(nibName: nibNameOrNil, bundle: nibBundleOrNil)
    }

    required init?(coder: NSCoder) {
        super.init(coder: coder)
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        title = L10n.tr("app.title")
        tableView.register(ChapterCell.self, forCellReuseIdentifier: "chapter")
        tableView.rowHeight = 72
        tableView.tableFooterView = UIView()
        searchBar.delegate = self
        searchBar.placeholder = L10n.tr("surahs.search_placeholder")
        searchBar.sizeToFit()
        tableView.tableHeaderView = searchBar
        NotificationCenter.default.addObserver(self, selector: #selector(languageDidChange), name: .appLanguageDidChange, object: nil)

        if let cached = LocalStore.shared.cachedChapters(), !cached.isEmpty {
            chapters = cached
            filtered = cached
            tableView.reloadData()
        }
        loadChapters()
    }

    deinit {
        NotificationCenter.default.removeObserver(self)
    }

    @objc private func languageDidChange() {
        title = L10n.tr("app.title")
        searchBar.placeholder = L10n.tr("surahs.search_placeholder")
        tableView.reloadData()
        loadChapters()
    }

    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        if !didCheckLastRead && !chapters.isEmpty {
            didCheckLastRead = true
            openLastReadIfAvailable()
        }
    }

    private func loadChapters() {
        if chapters.isEmpty {
            loading.startAnimating()
            tableView.backgroundView = loading
        }
        QuranAPI.shared.chapters { [weak self] result in
            guard let self = self else { return }
            self.loading.stopAnimating()
            self.tableView.backgroundView = nil
            switch result {
            case .success(let chapters):
                self.chapters = chapters
                self.applyFilter(self.searchBar.text ?? "")
                self.tableView.reloadData()
                if !self.didCheckLastRead && self.viewIfLoaded?.window != nil {
                    self.didCheckLastRead = true
                    self.openLastReadIfAvailable()
                }
            case .failure(let error):
                if self.chapters.isEmpty {
                    self.showNotice("\(L10n.tr("surahs.load_error"))\n\n\(error.localizedDescription)")
                    self.navigationItem.rightBarButtonItem = UIBarButtonItem(title: L10n.tr("common.retry"), style: .plain, target: self, action: #selector(self.retry))
                }
            }
        }
    }

    @objc private func retry() { loadChapters() }

    private func openLastReadIfAvailable() {
        guard let key = LocalStore.shared.lastReadVerseKey else { return }
        let parts = key.split(separator: ":").map(String.init)
        guard let chapterText = parts.first,
              let chapterID = Int(chapterText),
              let chapter = chapters.first(where: { $0.id == chapterID }),
              navigationController?.topViewController === self else { return }
        let verseNumber = parts.count > 1 ? Int(parts[1]) : nil
        let reader = ReaderViewController(chapter: chapter, jumpToVerse: verseNumber)
        navigationController?.pushViewController(reader, animated: false)
    }

    private var visibleChapters: [Chapter] { isSearching ? filtered : chapters }

    private func applyFilter(_ text: String) {
        let q = text.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        isSearching = !q.isEmpty
        filtered = q.isEmpty ? chapters : chapters.filter {
            $0.nameSimple.lowercased().contains(q) ||
            $0.translatedName.lowercased().contains(q) ||
            $0.nameArabic.contains(q) ||
            String($0.id) == q
        }
    }

    func searchBar(_ searchBar: UISearchBar, textDidChange searchText: String) {
        applyFilter(searchText)
        tableView.reloadData()
    }

    func searchBarSearchButtonClicked(_ searchBar: UISearchBar) {
        searchBar.resignFirstResponder()
    }

    override func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int {
        visibleChapters.count
    }

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
        NSLayoutConstraint.activate([
            row.leadingAnchor.constraint(equalTo: contentView.leadingAnchor, constant: 16),
            row.trailingAnchor.constraint(equalTo: contentView.trailingAnchor, constant: -16),
            row.topAnchor.constraint(equalTo: contentView.topAnchor, constant: 8),
            row.bottomAnchor.constraint(equalTo: contentView.bottomAnchor, constant: -8)
        ])
    }

    required init?(coder: NSCoder) {
        super.init(coder: coder)
    }

    func configure(_ chapter: Chapter) {
        number.text = "\(chapter.id)"
        english.text = chapter.nameSimple
        let versesLabel = L10n.format("surahs.verses_count", chapter.versesCount)
        subtitle.text = "\(chapter.translatedName)  ·  \(versesLabel)  ·  \(chapter.revelationPlace.capitalized)"
        arabic.text = chapter.nameArabic
    }
}
