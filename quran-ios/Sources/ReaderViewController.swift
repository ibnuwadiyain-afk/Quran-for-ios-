import UIKit

final class ReaderViewController: UITableViewController {
    private let chapter: Chapter
    private let jumpToVerse: Int?
    private var verses: [Verse] = []
    private var refresh = UIRefreshControl()
    private var showingWords = false
    private var loadedTranslationID = AppSettings.translationID

    init(chapter: Chapter, jumpToVerse: Int? = nil) {
        self.chapter = chapter
        self.jumpToVerse = jumpToVerse
        super.init(style: .plain)
    }
    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

    override func viewDidLoad() {
        super.viewDidLoad()
        title = chapter.nameSimple
        tableView.register(VerseCell.self, forCellReuseIdentifier: "verse")
        tableView.rowHeight = UITableView.automaticDimension
        tableView.estimatedRowHeight = 190
        tableView.separatorInset = UIEdgeInsets(top: 0, left: 18, bottom: 0, right: 18)
        tableView.tableFooterView = UIView()
        refresh.addTarget(self, action: #selector(loadVerses), for: .valueChanged)
        tableView.refreshControl = refresh
        navigationItem.rightBarButtonItems = [
            UIBarButtonItem(title: "Audio", style: .plain, target: self, action: #selector(playChapter)),
            UIBarButtonItem(title: "Words", style: .plain, target: self, action: #selector(toggleWords)),
            UIBarButtonItem(title: "More", style: .plain, target: self, action: #selector(showMore))
        ]
        loadVerses()
    }

    @objc private func loadVerses() {
        QuranAPI.shared.verses(chapterID: chapter.id, includeWords: showingWords) { [weak self] result in
            guard let self = self else { return }
            self.refresh.endRefreshing()
            switch result {
            case .success(let verses):
                self.verses = verses
                self.loadedTranslationID = AppSettings.translationID
                LocalStore.shared.cache(verses: verses, chapterID: self.chapter.id, includeWords: self.showingWords)
                self.tableView.reloadData()
                if let n = self.jumpToVerse, n > 0, n <= verses.count {
                    DispatchQueue.main.asyncAfter(deadline: .now() + 0.15) {
                        self.tableView.scrollToRow(at: IndexPath(row: n - 1, section: 0), at: .top, animated: false)
                    }
                }
            case .failure(let error):
                if let cached = LocalStore.shared.cachedVerses(chapterID: self.chapter.id, includeWords: self.showingWords) ?? LocalStore.shared.cachedVerses(chapterID: self.chapter.id, includeWords: !self.showingWords) {
                    self.verses = cached
                    self.tableView.reloadData()
                    self.showNotice("Showing the saved copy. Connect to the internet to refresh the text.")
                } else {
                    self.showNotice("Could not load this surah. Please try again.\n\n\(error.localizedDescription)")
                }
            }
        }
    }

    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        if loadedTranslationID != AppSettings.translationID {
            showingWords = false
            loadVerses()
        } else {
            tableView.reloadData()
        }
    }

    override func viewWillDisappear(_ animated: Bool) {
        super.viewWillDisappear(animated)
        if isMovingFromParent { AudioPlayer.shared.stop() }
    }

    @objc private func toggleWords() {
        showingWords.toggle()
        if let items = navigationItem.rightBarButtonItems, items.count > 1 { items[1].title = showingWords ? "Hide words" : "Words" }
        loadVerses()
    }

    private func showTafsir(for verse: Verse) {
        navigationController?.pushViewController(TafsirViewController(verseKey: verse.verseKey), animated: true)
    }

    private func playWord(_ word: WordInfo) {
        guard let path = word.audioURL, !path.isEmpty else { showNotice("Word audio is not available for this resource."); return }
        let full = path.hasPrefix("http") ? path : "https://audio.qurancdn.com/\(path.hasPrefix("/") ? String(path.dropFirst()) : path)"
        guard let url = URL(string: full) else { showNotice("The word-audio URL is invalid."); return }
        AudioPlayer.shared.play(url, title: "\(chapter.nameSimple) · \(word.transliteration)")
    }

    private func playVerse(_ verse: Verse) {
        QuranAPI.shared.verseAudioURL(verseKey: verse.verseKey) { [weak self] result in
            guard let self = self else { return }
            switch result {
            case .success(let url): AudioPlayer.shared.play(url, title: "\(self.chapter.nameSimple) (\(verse.verseKey))")
            case .failure(let error): self.showNotice("Ayah recitation could not be started. \(error.localizedDescription)")
            }
        }
    }

    @objc private func playChapter() {
        if let local = AudioPlayer.shared.downloadedURL(chapterID: chapter.id) {
            AudioPlayer.shared.play(local, title: "Surah \(chapter.nameSimple)")
            return
        }
        QuranAPI.shared.chapterAudioURL(chapterID: chapter.id) { [weak self] result in
            guard let self = self else { return }
            switch result {
            case .success(let url): AudioPlayer.shared.play(url, title: "Surah \(self.chapter.nameSimple)")
            case .failure(let error): self.showNotice("Recitation could not be started.\n\n\(error.localizedDescription)")
            }
        }
    }

    @objc private func showMore() {
        let sheet = UIAlertController(title: chapter.nameSimple, message: "Reader actions", preferredStyle: .actionSheet)
        sheet.addAction(UIAlertAction(title: "Download recitation", style: .default) { [weak self] _ in self?.downloadAudio() })
        sheet.addAction(UIAlertAction(title: "Play / pause audio", style: .default) { _ in AudioPlayer.shared.toggle() })
        sheet.addAction(UIAlertAction(title: "Cancel", style: .cancel))
        if let pop = sheet.popoverPresentationController { pop.barButtonItem = navigationItem.rightBarButtonItems?.last }
        present(sheet, animated: true)
    }

    private func downloadAudio() {
        QuranAPI.shared.chapterAudioURL(chapterID: chapter.id) { [weak self] result in
            switch result {
            case .failure(let error): self?.showNotice("Could not prepare the audio download.\n\n\(error.localizedDescription)")
            case .success(let url):
                guard let self = self else { return }
                AudioPlayer.shared.download(url, chapterID: self.chapter.id) { result in
                    switch result {
                    case .success: self.showNotice("Recitation saved for offline playback.")
                    case .failure(let error): self.showNotice("Download failed. \(error.localizedDescription)")
                    }
                }
            }
        }
    }

    override func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int { verses.count }
    override func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
        let cell = tableView.dequeueReusableCell(withIdentifier: "verse", for: indexPath) as! VerseCell
        let verse = verses[indexPath.row]
        cell.configure(verse: verse, bookmarked: LocalStore.shared.isBookmarked(verse.verseKey), showWords: showingWords)
        cell.onBookmark = { [weak self] in
            guard let self = self else { return }
            let mark = Bookmark(verseKey: verse.verseKey, chapterName: self.chapter.nameSimple, arabic: verse.arabic, translation: verse.translation, createdAt: Date())
            let saved = LocalStore.shared.toggle(mark)
            cell.setBookmarked(saved)
        }
        cell.onPlay = { [weak self] in self?.playVerse(verse) }
        cell.onTafsir = { [weak self] in self?.showTafsir(for: verse) }
        cell.onWordAudio = { [weak self] word in self?.playWord(word) }
        return cell
    }
    override func tableView(_ tableView: UITableView, willDisplay cell: UITableViewCell, forRowAt indexPath: IndexPath) {
        guard indexPath.row < verses.count else { return }
        LocalStore.shared.lastReadVerseKey = verses[indexPath.row].verseKey
    }

    override func tableView(_ tableView: UITableView, didSelectRowAt indexPath: IndexPath) {
        tableView.deselectRow(at: indexPath, animated: true)
        guard indexPath.row < verses.count else { return }
        LocalStore.shared.lastReadVerseKey = verses[indexPath.row].verseKey
    }
}

final class VerseCell: UITableViewCell {
    private let keyLabel = UILabel()
    private let arabicLabel = UILabel()
    private let wordStack = UIStackView()
    private let translationLabel = UILabel()
    private let bookmarkButton = UIButton(type: .system)
    private let playButton = UIButton(type: .system)
    private let tafsirButton = UIButton(type: .system)
    var onBookmark: (() -> Void)?
    var onPlay: (() -> Void)?
    var onTafsir: (() -> Void)?
    var onWordAudio: ((WordInfo) -> Void)?

    override init(style: UITableViewCell.CellStyle, reuseIdentifier: String?) {
        super.init(style: style, reuseIdentifier: reuseIdentifier)
        selectionStyle = .none
        keyLabel.font = .systemFont(ofSize: 12, weight: .semibold)
        keyLabel.textColor = .gray
        arabicLabel.font = .systemFont(ofSize: 28)
        arabicLabel.textAlignment = .right
        arabicLabel.numberOfLines = 0
        wordStack.axis = .vertical
        wordStack.spacing = 5
        wordStack.isHidden = true
        translationLabel.font = .systemFont(ofSize: 17)
        translationLabel.textColor = .darkGray
        translationLabel.numberOfLines = 0
        for button in [bookmarkButton, playButton, tafsirButton] { button.titleLabel?.font = .systemFont(ofSize: 14, weight: .medium) }
        bookmarkButton.addTarget(self, action: #selector(bookmarkTapped), for: .touchUpInside)
        playButton.addTarget(self, action: #selector(playTapped), for: .touchUpInside)
        tafsirButton.addTarget(self, action: #selector(tafsirTapped), for: .touchUpInside)
        let actions = UIStackView(arrangedSubviews: [bookmarkButton, playButton, tafsirButton])
        actions.axis = .horizontal
        actions.spacing = 16
        let stack = UIStackView(arrangedSubviews: [keyLabel, arabicLabel, wordStack, translationLabel, actions])
        stack.axis = .vertical
        stack.spacing = 12
        stack.translatesAutoresizingMaskIntoConstraints = false
        contentView.addSubview(stack)
        NSLayoutConstraint.activate([
            stack.leadingAnchor.constraint(equalTo: contentView.leadingAnchor, constant: 18),
            stack.trailingAnchor.constraint(equalTo: contentView.trailingAnchor, constant: -18),
            stack.topAnchor.constraint(equalTo: contentView.topAnchor, constant: 16),
            stack.bottomAnchor.constraint(equalTo: contentView.bottomAnchor, constant: -16)
        ])
    }
    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }
    func configure(verse: Verse, bookmarked: Bool, showWords: Bool) {
        keyLabel.text = verse.verseKey
        arabicLabel.font = .systemFont(ofSize: AppSettings.arabicFontSize)
        translationLabel.font = .systemFont(ofSize: max(15, AppSettings.arabicFontSize - 11))
        arabicLabel.text = verse.arabic
        translationLabel.text = HTMLTextSanitizer.clean(verse.translation)
        wordStack.arrangedSubviews.forEach { subview in wordStack.removeArrangedSubview(subview); subview.removeFromSuperview() }
        let wordItems = showWords ? (verse.words ?? []) : []
        for word in wordItems {
            let button = WordInfoButton(frame: .zero)
            let details = [word.arabic, word.transliteration, HTMLTextSanitizer.clean(word.translation)].filter { !$0.isEmpty }.joined(separator: "  ·  ")
            button.setTitle(details, for: .normal)
            button.setTitleColor(.darkGray, for: .normal)
            button.titleLabel?.font = .systemFont(ofSize: 15)
            button.titleLabel?.numberOfLines = 0
            button.contentHorizontalAlignment = .right
            button.backgroundColor = UIColor(white: 0.96, alpha: 1)
            button.layer.cornerRadius = 5
            button.contentEdgeInsets = UIEdgeInsets(top: 7, left: 9, bottom: 7, right: 9)
            button.handler = { [weak self] in self?.onWordAudio?(word) }
            wordStack.addArrangedSubview(button)
        }
        wordStack.isHidden = !showWords || wordItems.isEmpty
        setBookmarked(bookmarked)
        playButton.setTitle("Play ayah", for: .normal)
        tafsirButton.setTitle("Tafsir", for: .normal)
    }
    func setBookmarked(_ saved: Bool) { bookmarkButton.setTitle(saved ? "✓ Bookmarked" : "☆ Bookmark", for: .normal) }
    @objc private func bookmarkTapped() { onBookmark?() }
    @objc private func playTapped() { onPlay?() }
    @objc private func tafsirTapped() { onTafsir?() }
}

private final class WordInfoButton: UIButton {
    var handler: (() -> Void)?
    override init(frame: CGRect) { super.init(frame: frame); addTarget(self, action: #selector(tapped), for: .touchUpInside) }
    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }
    @objc private func tapped() { handler?() }
}
