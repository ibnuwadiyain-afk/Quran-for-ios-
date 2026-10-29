import UIKit

final class SettingsViewController: UITableViewController {
    private var translations: [QuranResource] = []
    private var reciters: [QuranResource] = []
    private var tafsirs: [QuranResource] = []
    private let offlineDownloader = OfflineContentDownloader()
    private var progressAlert: UIAlertController?

    override func viewDidLoad() {
        super.viewDidLoad()
        title = "Settings"
        tableView.tableFooterView = UIView()
        loadCatalogs()
    }
    private func loadCatalogs() {
        let group = DispatchGroup()
        group.enter(); QuranAPI.shared.resources(kind: "translations", language: nil) { [weak self] result in self?.translations = (try? result.get()) ?? []; group.leave() }
        group.enter(); QuranAPI.shared.resources(kind: "chapter_reciters", language: nil) { [weak self] result in self?.reciters = (try? result.get()) ?? []; group.leave() }
        group.enter(); QuranAPI.shared.resources(kind: "tafsirs", language: nil) { [weak self] result in self?.tafsirs = (try? result.get()) ?? []; group.leave() }
        group.notify(queue: .main) { [weak self] in self?.tableView.reloadData() }
    }
    override func numberOfSections(in tableView: UITableView) -> Int { 3 }
    override func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int { section == 0 ? 4 : (section == 1 ? 2 : 2) }
    override func tableView(_ tableView: UITableView, titleForHeaderInSection section: Int) -> String? { ["Reading catalogs", "Offline Quran", "About"][section] }
    override func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
        let cell = UITableViewCell(style: .subtitle, reuseIdentifier: nil)
        cell.accessoryType = .disclosureIndicator
        cell.detailTextLabel?.textColor = .gray
        switch (indexPath.section, indexPath.row) {
        case (0, 0):
            cell.textLabel?.text = "Translation"
            cell.detailTextLabel?.text = selectedName(in: translations, id: AppSettings.translationID, fallback: "Resource \(AppSettings.translationID)") + "  ·  \(translations.count) catalog entries"
        case (0, 1):
            cell.textLabel?.text = "Reciter"
            cell.detailTextLabel?.text = selectedName(in: reciters, id: AppSettings.reciterID, fallback: "Reciter \(AppSettings.reciterID)") + "  ·  \(reciters.count) catalog entries"
        case (0, 2):
            cell.textLabel?.text = "Tafsir"
            cell.detailTextLabel?.text = selectedName(in: tafsirs, id: AppSettings.tafsirID, fallback: "Tafsir \(AppSettings.tafsirID)") + "  ·  \(tafsirs.count) catalog entries"
        case (0, 3):
            cell.textLabel?.text = "Arabic text size"
            cell.detailTextLabel?.text = "\(Int(AppSettings.arabicFontSize)) pt"
        case (1, 0):
            cell.textLabel?.text = "Download complete Quran for offline use"
            cell.detailTextLabel?.text = "604 Mushaf pages, Arabic, selected translation, word-by-word data"
        case (1, 1):
            cell.textLabel?.text = "Remove downloaded Quran data"
            cell.detailTextLabel?.text = "Frees space; bookmarks are kept"
        case (2, 0):
            cell.textLabel?.text = "About & data sources"
            cell.detailTextLabel?.text = "Service, page-image and attribution information"
        default:
            cell.textLabel?.text = "Open-source license"
            cell.detailTextLabel?.text = "GNU GPL version 3"
        }
        cell.textLabel?.numberOfLines = 2
        cell.detailTextLabel?.numberOfLines = 2
        return cell
    }

    private func selectedName(in resources: [QuranResource], id: Int, fallback: String) -> String {
        resources.first(where: { $0.id == id })?.displayName ?? fallback
    }

    override func tableView(_ tableView: UITableView, didSelectRowAt indexPath: IndexPath) {
        tableView.deselectRow(at: indexPath, animated: true)
        switch (indexPath.section, indexPath.row) {
        case (0, 0): showPicker(title: "Choose translation", resources: translations, currentID: AppSettings.translationID) { [weak self] resource in AppSettings.translationID = resource.id; LocalStore.shared.clearReaderCache(); self?.tableView.reloadData() }
        case (0, 1): showPicker(title: "Choose reciter", resources: reciters, currentID: AppSettings.reciterID) { [weak self] resource in AppSettings.reciterID = resource.id; self?.tableView.reloadData() }
        case (0, 2): showPicker(title: "Choose tafsir", resources: tafsirs, currentID: AppSettings.tafsirID) { [weak self] resource in AppSettings.tafsirID = resource.id; self?.tableView.reloadData() }
        case (0, 3): showFontPicker()
        case (1, 0): confirmOfflineDownload()
        case (1, 1): confirmRemoveOffline()
        case (2, 0):
            showNotice("Quran text, translation catalogs, tafsir, and recitation catalogs are loaded from Quran.com API services. Madani Mushaf page images are downloaded from the Quran for Android data host. The app can download all 604 page images and the Arabic text, selected translation, and word-by-word data for offline use. Check the respective providers’ current licenses and terms before redistributing content.", title: "About & data sources")
        default:
            showNotice("This app source is free software under GNU GPL version 3. You may redistribute and modify it under that license; it comes with no warranty. See the included LICENSE file. Quran text, translation, images, tafsir, fonts, and recitations may have separate terms.", title: "Open-source license")
        }
    }

    private func showPicker(title: String, resources: [QuranResource], currentID: Int, selected: @escaping (QuranResource) -> Void) {
        guard !resources.isEmpty else {
            showNotice("The catalog is not available yet. Connect to the internet and reopen Settings.")
            return
        }
        let picker = ResourcePickerViewController(title: title, resources: resources, selectedID: currentID, onSelect: selected)
        let nav = UINavigationController(rootViewController: picker)
        nav.modalPresentationStyle = .formSheet
        present(nav, animated: true)
    }

    private func showFontPicker() {
        let options: [(Int, String)] = [(24, "Small"), (28, "Regular"), (34, "Large")]
        let alert = UIAlertController(title: "Arabic text size", message: nil, preferredStyle: .actionSheet)
        for (size, label) in options {
            alert.addAction(UIAlertAction(title: "\(label) — \(size) pt", style: .default) { [weak self] _ in AppSettings.arabicFontSize = CGFloat(size); self?.tableView.reloadData() })
        }
        alert.addAction(UIAlertAction(title: "Cancel", style: .cancel))
        if let pop = alert.popoverPresentationController { pop.sourceView = tableView; pop.sourceRect = tableView.rectForRow(at: IndexPath(row: 3, section: 0)) }
        present(alert, animated: true)
    }

    private func confirmOfflineDownload() {
        let alert = UIAlertController(title: "Download complete Quran?", message: "This downloads 604 Madani page images plus all Arabic verses, the selected translation, and word-by-word data. It may use substantial data and storage. Keep the app open and connected to Wi-Fi.", preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "Cancel", style: .cancel))
        alert.addAction(UIAlertAction(title: "Download", style: .default) { [weak self] _ in self?.startOfflineDownload() })
        present(alert, animated: true)
    }

    private func startOfflineDownload() {
        let alert = UIAlertController(title: "Downloading Quran", message: "Preparing offline content…", preferredStyle: .alert)
        progressAlert = alert
        present(alert, animated: true)
        offlineDownloader.start(translationID: AppSettings.translationID, progress: { [weak alert] done, total in
            alert?.message = "Downloading page and verse data… \(done) of \(total)"
        }, completion: { [weak self] failures in
            guard let self = self else { return }
            self.progressAlert?.dismiss(animated: true) {
                self.progressAlert = nil
                if failures == 0 {
                    self.showNotice("All 604 Mushaf pages and complete Arabic, translation, and word-by-word Quran data are saved for offline use.")
                } else {
                    self.showNotice("Download finished with \(failures) incomplete page(s). Run it again to retry; already saved pages will be reused.")
                }
            }
        })
    }

    private func confirmRemoveOffline() {
        let alert = UIAlertController(title: "Remove offline Quran?", message: "This removes downloaded Mushaf pages and chapter text caches. Bookmarks and audio downloads are kept.", preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "Cancel", style: .cancel))
        alert.addAction(UIAlertAction(title: "Remove", style: .destructive) { [weak self] _ in
            LocalStore.shared.clearOfflineQuran()
            LocalStore.shared.clearReaderCache()
            self?.showNotice("Downloaded Quran text and page images were removed.")
        })
        present(alert, animated: true)
    }
}
