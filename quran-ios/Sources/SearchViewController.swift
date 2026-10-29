import UIKit

final class SearchViewController: UITableViewController, UISearchBarDelegate {
    private let searchBar = UISearchBar()
    private var results: [SearchResult] = []
    private var chapters: [Chapter] = []
    private let statusLabel = UILabel()
    private var searchTask: DispatchWorkItem?

    override func viewDidLoad() {
        super.viewDidLoad()
        title = "Search Quran"
        searchBar.delegate = self
        searchBar.placeholder = "Search translation or Arabic"
        tableView.tableHeaderView = searchBar
        tableView.register(SearchResultCell.self, forCellReuseIdentifier: "result")
        tableView.rowHeight = UITableView.automaticDimension
        tableView.estimatedRowHeight = 150
        tableView.tableFooterView = UIView()
        statusLabel.text = "Enter a word or phrase to search the Quran."
        statusLabel.textAlignment = .center
        statusLabel.textColor = .gray
        statusLabel.numberOfLines = 0
        tableView.backgroundView = statusLabel
        QuranAPI.shared.chapters { [weak self] result in self?.chapters = (try? result.get()) ?? [] }
    }
    func searchBarSearchButtonClicked(_ searchBar: UISearchBar) { searchBar.resignFirstResponder(); runSearch(searchBar.text ?? "") }
    func searchBar(_ searchBar: UISearchBar, textDidChange searchText: String) {
        searchTask?.cancel()
        let task = DispatchWorkItem { [weak self] in self?.runSearch(searchText) }
        searchTask = task
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.55, execute: task)
    }
    private func runSearch(_ text: String) {
        let query = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard query.count >= 2 else { results = []; tableView.reloadData(); statusLabel.text = "Enter at least two characters to search."; return }
        statusLabel.text = "Searching…"
        tableView.backgroundView = statusLabel
        QuranAPI.shared.search(query) { [weak self] result in
            guard let self = self else { return }
            switch result {
            case .success(let results):
                self.results = results
                self.tableView.backgroundView = results.isEmpty ? self.statusLabel : nil
                self.statusLabel.text = results.isEmpty ? "No results found." : nil
                self.tableView.reloadData()
            case .failure(let error):
                self.results = []
                self.statusLabel.text = "Search failed. Check your connection.\n\(error.localizedDescription)"
                self.tableView.backgroundView = self.statusLabel
                self.tableView.reloadData()
            }
        }
    }
    override func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int { results.count }
    override func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
        let cell = tableView.dequeueReusableCell(withIdentifier: "result", for: indexPath) as! SearchResultCell
        cell.configure(results[indexPath.row])
        return cell
    }
    override func tableView(_ tableView: UITableView, didSelectRowAt indexPath: IndexPath) {
        tableView.deselectRow(at: indexPath, animated: true)
        let result = results[indexPath.row]
        guard let chapter = chapters.first(where: { $0.id == result.chapterID }) else {
            QuranAPI.shared.chapters { [weak self] response in
                guard let self = self, let chapter = (try? response.get())?.first(where: { $0.id == result.chapterID }) else { return }
                self.navigationController?.pushViewController(ReaderViewController(chapter: chapter, jumpToVerse: result.verseNumber), animated: true)
            }
            return
        }
        navigationController?.pushViewController(ReaderViewController(chapter: chapter, jumpToVerse: result.verseNumber), animated: true)
    }
}

final class SearchResultCell: UITableViewCell {
    private let location = UILabel()
    private let arabic = UILabel()
    private let translation = UILabel()
    override init(style: UITableViewCell.CellStyle, reuseIdentifier: String?) {
        super.init(style: style, reuseIdentifier: reuseIdentifier)
        location.font = .systemFont(ofSize: 12, weight: .semibold)
        location.textColor = .gray
        arabic.font = .systemFont(ofSize: 22)
        arabic.textAlignment = .right
        arabic.numberOfLines = 0
        translation.font = .systemFont(ofSize: 15)
        translation.numberOfLines = 0
        let stack = UIStackView(arrangedSubviews: [location, arabic, translation])
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
    func configure(_ result: SearchResult) {
        location.text = "Verse \(result.verseKey)"
        arabic.text = result.arabic
        translation.text = HTMLTextSanitizer.clean(result.translation)
    }
}
