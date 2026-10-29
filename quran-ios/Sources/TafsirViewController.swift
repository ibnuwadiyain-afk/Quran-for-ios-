import UIKit
import WebKit

final class TafsirViewController: UIViewController {
    private let verseKey: String
    private let webView = WKWebView(frame: .zero)
    private let spinner = UIActivityIndicatorView(style: .gray)
    init(verseKey: String) { self.verseKey = verseKey; super.init(nibName: nil, bundle: nil) }
    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }
    override func viewDidLoad() {
        super.viewDidLoad()
        title = "Tafsir \(verseKey)"
        view.backgroundColor = .white
        webView.translatesAutoresizingMaskIntoConstraints = false
        spinner.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(webView)
        view.addSubview(spinner)
        NSLayoutConstraint.activate([
            webView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            webView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            webView.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor),
            webView.bottomAnchor.constraint(equalTo: view.bottomAnchor),
            spinner.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            spinner.centerYAnchor.constraint(equalTo: view.centerYAnchor)
        ])
        spinner.startAnimating()
        QuranAPI.shared.tafsir(resourceID: AppSettings.tafsirID, verseKey: verseKey) { [weak self] result in
            guard let self = self else { return }
            self.spinner.stopAnimating()
            switch result {
            case .failure(let error): self.showNotice("Tafsir could not be loaded.\n\(error.localizedDescription)")
            case .success(let (resourceName, html)):
                self.title = resourceName
                let document = "<html><head><meta name='viewport' content='width=device-width, initial-scale=1'><style>body{font-family:-apple-system,Helvetica,sans-serif;font-size:18px;line-height:1.6;padding:18px;color:#202124}img{max-width:100%;height:auto}h1,h2,h3{line-height:1.3}</style></head><body><h3>\(verseKey)</h3>\(html)</body></html>"
                self.webView.loadHTMLString(document, baseURL: nil)
            }
        }
    }
}
