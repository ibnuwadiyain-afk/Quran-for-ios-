import UIKit

final class MushafViewController: UIViewController {
    private let imageView = UIImageView()
    private let spinner = UIActivityIndicatorView(style: .gray)
    private let pageLabel = UILabel()
    private let previousButton = UIButton(type: .system)
    private let nextButton = UIButton(type: .system)
    private var page = UserDefaults.standard.integer(forKey: "lastMushafPage")

    override func viewDidLoad() {
        super.viewDidLoad()
        if page < 1 || page > 604 { page = 1 }
        title = "Mushaf"
        view.backgroundColor = UIColor(red: 0.96, green: 0.94, blue: 0.87, alpha: 1)
        imageView.contentMode = .scaleAspectFit
        imageView.translatesAutoresizingMaskIntoConstraints = false
        spinner.translatesAutoresizingMaskIntoConstraints = false
        pageLabel.font = .systemFont(ofSize: 15, weight: .semibold)
        pageLabel.textAlignment = .center
        previousButton.setTitle("‹ Previous", for: .normal)
        nextButton.setTitle("Next ›", for: .normal)
        previousButton.addTarget(self, action: #selector(previousPage), for: .touchUpInside)
        nextButton.addTarget(self, action: #selector(nextPage), for: .touchUpInside)
        let controls = UIStackView(arrangedSubviews: [previousButton, pageLabel, nextButton])
        controls.axis = .horizontal
        controls.distribution = .equalSpacing
        controls.alignment = .center
        controls.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(imageView)
        view.addSubview(spinner)
        view.addSubview(controls)
        NSLayoutConstraint.activate([
            controls.leadingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.leadingAnchor, constant: 20),
            controls.trailingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.trailingAnchor, constant: -20),
            controls.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor, constant: -8),
            imageView.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor, constant: 8),
            imageView.leadingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.leadingAnchor, constant: 8),
            imageView.trailingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.trailingAnchor, constant: -8),
            imageView.bottomAnchor.constraint(equalTo: controls.topAnchor, constant: -8),
            spinner.centerXAnchor.constraint(equalTo: imageView.centerXAnchor),
            spinner.centerYAnchor.constraint(equalTo: imageView.centerYAnchor)
        ])
        navigationItem.rightBarButtonItem = UIBarButtonItem(title: "Go to…", style: .plain, target: self, action: #selector(jumpToPage))
        let swipeLeft = UISwipeGestureRecognizer(target: self, action: #selector(nextPage))
        swipeLeft.direction = .left
        let swipeRight = UISwipeGestureRecognizer(target: self, action: #selector(previousPage))
        swipeRight.direction = .right
        imageView.isUserInteractionEnabled = true
        imageView.addGestureRecognizer(swipeLeft)
        imageView.addGestureRecognizer(swipeRight)
        showPage()
    }

    @objc private func previousPage() { if page > 1 { page -= 1; showPage() } }
    @objc private func nextPage() { if page < 604 { page += 1; showPage() } }
    @objc private func jumpToPage() {
        let alert = UIAlertController(title: "Go to Mushaf page", message: "Enter a page number from 1 to 604.", preferredStyle: .alert)
        alert.addTextField { field in field.keyboardType = .numberPad; field.placeholder = "Page number"; field.text = String(self.page) }
        alert.addAction(UIAlertAction(title: "Cancel", style: .cancel))
        alert.addAction(UIAlertAction(title: "Go", style: .default) { [weak self, weak alert] _ in
            guard let self = self, let text = alert?.textFields?.first?.text, let target = Int(text), (1...604).contains(target) else { return }
            self.page = target
            self.showPage()
        })
        present(alert, animated: true)
    }

    private func showPage() {
        pageLabel.text = "Page \(page) of 604"
        UserDefaults.standard.set(page, forKey: "lastMushafPage")
        if let localURL = LocalStore.shared.pageImageURL(page), let image = UIImage(contentsOfFile: localURL.path) {
            imageView.image = image
            spinner.stopAnimating()
            return
        }
        imageView.image = nil
        spinner.startAnimating()
        let requestedPage = page
        guard let url = MushafPageStore.imageURL(requestedPage) else { spinner.stopAnimating(); return }
        var request = URLRequest(url: url)
        request.setValue("QuranReader-iOS/1.0 (iOS 12 compatible; non-profit)", forHTTPHeaderField: "User-Agent")
        URLSession.shared.dataTask(with: request) { [weak self] data, response, error in
            DispatchQueue.main.async {
                guard let self = self else { return }
                self.spinner.stopAnimating()
                guard self.page == requestedPage, error == nil, let data = data,
                      let response = response as? HTTPURLResponse, (200..<300).contains(response.statusCode),
                      let image = UIImage(data: data) else {
                    if self.page == requestedPage { self.showNotice("This Mushaf page could not be loaded. Try again when online, or download the complete offline Quran in Settings.") }
                    return
                }
                self.imageView.image = image
                try? LocalStore.shared.saveOfflinePageImage(data, page: requestedPage)
            }
        }.resume()
    }
}

final class MushafPageStore {
    static func imageURL(_ page: Int) -> URL? {
        guard (1...604).contains(page) else { return nil }
        let file = String(format: "page%03d.png", page)
        return URL(string: "https://files.quran.app/hafs/madani/width_1024/\(file)")
    }
}
