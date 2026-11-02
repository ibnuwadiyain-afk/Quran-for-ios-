import UIKit

final class SettingsViewController: UITableViewController {
    private var translations: [QuranResource] = []
    private var reciters: [QuranResource] = []
    private var tafsirs: [QuranResource] = []
    private let offlineDownloader = OfflineContentDownloader()
    private var progressAlert: UIAlertController?

    init() {
        super.init(style: .grouped)
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
        title = L10n.tr("tab.settings")
        tableView.tableFooterView = UIView()
        NotificationCenter.default.addObserver(self, selector: #selector(languageDidChange), name: .appLanguageDidChange, object: nil)
        loadCatalogs()
    }

    deinit {
        NotificationCenter.default.removeObserver(self)
    }

    @objc private func languageDidChange() {
        title = L10n.tr("tab.settings")
        tableView.reloadData()
    }

    private func loadCatalogs() {
        let group = DispatchGroup()
        group.enter(); QuranAPI.shared.resources(kind: "translations", language: nil) { [weak self] result in self?.translations = (try? result.get()) ?? []; group.leave() }
        group.enter(); QuranAPI.shared.resources(kind: "chapter_reciters", language: nil) { [weak self] result in self?.reciters = (try? result.get()) ?? []; group.leave() }
        group.enter(); QuranAPI.shared.resources(kind: "tafsirs", language: nil) { [weak self] result in self?.tafsirs = (try? result.get()) ?? []; group.leave() }
        group.notify(queue: .main) { [weak self] in self?.tableView.reloadData() }
    }

    override func numberOfSections(in tableView: UITableView) -> Int { 3 }
    override func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int { section == 0 ? 5 : (section == 1 ? 2 : 2) }
    override func tableView(_ tableView: UITableView, titleForHeaderInSection section: Int) -> String? {
        [
            L10n.tr("settings.section.reading"),
            L10n.tr("settings.section.offline"),
            L10n.tr("settings.section.about")
        ][section]
    }

    override func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
        let cell = UITableViewCell(style: .subtitle, reuseIdentifier: nil)
        cell.accessoryType = .disclosureIndicator
        cell.detailTextLabel?.textColor = .gray
        switch (indexPath.section, indexPath.row) {
        case (0, 0):
            cell.textLabel?.text = L10n.tr("settings.language")
            cell.detailTextLabel?.text = AppSettings.language.displayName
        case (0, 1):
            cell.textLabel?.text = L10n.tr("settings.translation")
            let countText = L10n.format("settings.catalog_entries", translations.count)
            cell.detailTextLabel?.text = selectedName(in: translations, id: AppSettings.translationID, fallback: "Resource \(AppSettings.translationID)") + "  ·  \(countText)"
        case (0, 2):
            cell.textLabel?.text = L10n.tr("settings.reciter")
            let countText = L10n.format("settings.catalog_entries", reciters.count)
            cell.detailTextLabel?.text = selectedName(in: reciters, id: AppSettings.reciterID, fallback: "Reciter \(AppSettings.reciterID)") + "  ·  \(countText)"
        case (0, 3):
            cell.textLabel?.text = L10n.tr("settings.tafsir")
            let countText = L10n.format("settings.catalog_entries", tafsirs.count)
            cell.detailTextLabel?.text = selectedName(in: tafsirs, id: AppSettings.tafsirID, fallback: "Tafsir \(AppSettings.tafsirID)") + "  ·  \(countText)"
        case (0, 4):
            cell.textLabel?.text = L10n.tr("settings.arabic_size")
            cell.detailTextLabel?.text = "\(Int(AppSettings.arabicFontSize)) pt"
        case (1, 0):
            cell.textLabel?.text = L10n.tr("settings.offline.download_title")
            cell.detailTextLabel?.text = L10n.tr("settings.offline.download_subtitle")
        case (1, 1):
            cell.textLabel?.text = L10n.tr("settings.offline.remove_title")
            cell.detailTextLabel?.text = L10n.tr("settings.offline.remove_subtitle")
        case (2, 0):
            cell.textLabel?.text = L10n.tr("settings.about.sources_title")
            cell.detailTextLabel?.text = L10n.tr("settings.about.sources_subtitle")
        default:
            cell.textLabel?.text = L10n.tr("settings.about.license_title")
            cell.detailTextLabel?.text = L10n.tr("settings.about.license_subtitle")
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
        case (0, 0):
            showLanguagePicker()
        case (0, 1):
            showPicker(title: L10n.tr("settings.choose_translation"), resources: translations, currentID: AppSettings.translationID) { [weak self] resource in
                AppSettings.translationID = resource.id
                LocalStore.shared.clearReaderCache()
                self?.tableView.reloadData()
            }
        case (0, 2):
            showPicker(title: L10n.tr("settings.choose_reciter"), resources: reciters, currentID: AppSettings.reciterID) { [weak self] resource in
                AppSettings.reciterID = resource.id
                self?.tableView.reloadData()
            }
        case (0, 3):
            showPicker(title: L10n.tr("settings.choose_tafsir"), resources: tafsirs, currentID: AppSettings.tafsirID) { [weak self] resource in
                AppSettings.tafsirID = resource.id
                self?.tableView.reloadData()
            }
        case (0, 4):
            showFontPicker()
        case (1, 0):
            confirmOfflineDownload()
        case (1, 1):
            confirmRemoveOffline()
        case (2, 0):
            showNotice("Quran text, translation catalogs, tafsir, and recitation catalogs are loaded from Quran.com API services. Madani Mushaf page images are downloaded from the Quran for Android data host. The app can download all 604 page images and the Arabic text, selected translation, and word-by-word data for offline use. Check the respective providers’ current licenses and terms before redistributing content.", title: L10n.tr("settings.about.sources_title"))
        default:
            showNotice("This app source is free software under GNU GPL version 3. You may redistribute and modify it under that license; it comes with no warranty. See the included LICENSE file. Quran text, translation, images, tafsir, fonts, and recitations may have separate terms.", title: L10n.tr("settings.about.license_title"))
        }
    }

    private func showLanguagePicker() {
        let alert = UIAlertController(title: L10n.tr("settings.choose_language"), message: nil, preferredStyle: .actionSheet)
        for lang in AppLanguage.allCases {
            let prefix = (lang == AppSettings.language) ? "✓ " : ""
            alert.addAction(UIAlertAction(title: prefix + lang.displayName, style: .default) { [weak self] _ in
                AppSettings.language = lang
                self?.tableView.reloadData()
            })
        }
        alert.addAction(UIAlertAction(title: L10n.tr("common.cancel"), style: .cancel))
        if let pop = alert.popoverPresentationController {
            pop.sourceView = tableView
            pop.sourceRect = tableView.rectForRow(at: IndexPath(row: 0, section: 0))
        }
        present(alert, animated: true)
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
        let options: [(Int, String)] = [
            (24, L10n.tr("settings.size.small")),
            (28, L10n.tr("settings.size.regular")),
            (34, L10n.tr("settings.size.large"))
        ]
        let alert = UIAlertController(title: L10n.tr("settings.arabic_size"), message: nil, preferredStyle: .actionSheet)
        for (size, label) in options {
            alert.addAction(UIAlertAction(title: "\(label) — \(size) pt", style: .default) { [weak self] _ in AppSettings.arabicFontSize = CGFloat(size); self?.tableView.reloadData() })
        }
        alert.addAction(UIAlertAction(title: L10n.tr("common.cancel"), style: .cancel))
        if let pop = alert.popoverPresentationController { pop.sourceView = tableView; pop.sourceRect = tableView.rectForRow(at: IndexPath(row: 4, section: 0)) }
        present(alert, animated: true)
    }

    private func confirmOfflineDownload() {
        let alert = UIAlertController(title: L10n.tr("settings.offline.download_title"), message: L10n.tr("settings.offline.download_subtitle"), preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: L10n.tr("common.cancel"), style: .cancel))
        alert.addAction(UIAlertAction(title: L10n.tr("common.download"), style: .default) { [weak self] _ in self?.startOfflineDownload() })
        present(alert, animated: true)
    }

    private func startOfflineDownload() {
        let alert = UIAlertController(title: L10n.tr("common.download"), message: "Preparing offline content…", preferredStyle: .alert)
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
        let alert = UIAlertController(title: L10n.tr("settings.offline.remove_title"), message: L10n.tr("settings.offline.remove_subtitle"), preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: L10n.tr("common.cancel"), style: .cancel))
        alert.addAction(UIAlertAction(title: L10n.tr("common.remove"), style: .destructive) { [weak self] _ in
            LocalStore.shared.clearOfflineQuran()
            LocalStore.shared.clearReaderCache()
            self?.showNotice("Downloaded Quran text and page images were removed.")
        })
        present(alert, animated: true)
    }
}
