import UIKit

final class ResourcePickerViewController: UITableViewController, UISearchBarDelegate {
    private let allResources: [QuranResource]
    private var visibleResources: [QuranResource]
    private let selectedID: Int
    private let onSelect: (QuranResource) -> Void
    private let searchBar = UISearchBar()

    init(title: String, resources: [QuranResource], selectedID: Int, onSelect: @escaping (QuranResource) -> Void) {
        self.allResources = resources.sorted { $0.displayName.localizedCaseInsensitiveCompare($1.displayName) == .orderedAscending }
        self.visibleResources = self.allResources
        self.selectedID = selectedID
        self.onSelect = onSelect
        super.init(style: .plain)
        self.title = title
    }
    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

    override func viewDidLoad() {
        super.viewDidLoad()
        tableView.rowHeight = UITableView.automaticDimension
        tableView.estimatedRowHeight = 64
        searchBar.delegate = self
        searchBar.placeholder = "Search the full catalog"
        tableView.tableHeaderView = searchBar
        navigationItem.leftBarButtonItem = UIBarButtonItem(title: "Cancel", style: .plain, target: self, action: #selector(cancel))
    }
    @objc private func cancel() { dismiss(animated: true) }
    func searchBar(_ searchBar: UISearchBar, textDidChange searchText: String) {
        let q = searchText.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        visibleResources = q.isEmpty ? allResources : allResources.filter {
            $0.displayName.lowercased().contains(q) || $0.languageName.lowercased().contains(q)
        }
        tableView.reloadData()
    }
    override func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int { visibleResources.count }
    override func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
        let resource = visibleResources[indexPath.row]
        let cell = UITableViewCell(style: .subtitle, reuseIdentifier: nil)
        cell.textLabel?.text = resource.displayName
        cell.textLabel?.numberOfLines = 2
        let language = resource.languageName.isEmpty ? "Language not specified" : resource.languageName.capitalized
        cell.detailTextLabel?.text = "\(language)  ·  ID \(resource.id)"
        cell.detailTextLabel?.textColor = .gray
        cell.accessoryType = resource.id == selectedID ? .checkmark : .none
        return cell
    }
    override func tableView(_ tableView: UITableView, didSelectRowAt indexPath: IndexPath) {
        tableView.deselectRow(at: indexPath, animated: true)
        onSelect(visibleResources[indexPath.row])
        dismiss(animated: true)
    }
}
