import UIKit

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {
    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        let emerald = UIColor(red: 0.05, green: 0.43, blue: 0.36, alpha: 1.0)
        UINavigationBar.appearance().tintColor = emerald
        UINavigationBar.appearance().isTranslucent = false
        UINavigationBar.appearance().barTintColor = UIColor(red: 0.99, green: 0.98, blue: 0.96, alpha: 1.0)
        UITabBar.appearance().tintColor = emerald
        UITabBar.appearance().isTranslucent = false
        UITabBar.appearance().barTintColor = UIColor(red: 0.99, green: 0.98, blue: 0.96, alpha: 1.0)

        window = UIWindow(frame: UIScreen.main.bounds)
        window?.backgroundColor = .white
        window?.rootViewController = MainTabBarController()
        window?.makeKeyAndVisible()
        return true
    }

    func applicationWillTerminate(_ application: UIApplication) {
        AudioPlayer.shared.stop()
    }
}

final class MainTabBarController: UITabBarController {
    override func viewDidLoad() {
        super.viewDidLoad()
        viewControllers = [
            navigation(ChapterListViewController(), title: "Surahs", icon: .surahs, tag: 0),
            navigation(MushafViewController(), title: "Mushaf", icon: .mushaf, tag: 1),
            navigation(BookmarksViewController(), title: "Bookmarks", icon: .bookmarks, tag: 2),
            navigation(SearchViewController(), title: "Search", icon: .search, tag: 3),
            navigation(SettingsViewController(), title: "Settings", icon: .settings, tag: 4)
        ]
        tabBar.tintColor = UIColor(red: 0.05, green: 0.43, blue: 0.36, alpha: 1.0)
    }

    private func navigation(_ root: UIViewController, title: String, icon: TabBarIconKind, tag: Int) -> UINavigationController {
        root.title = title
        let nav = UINavigationController(rootViewController: root)
        let image = TabBarIconRenderer.image(for: icon)
        nav.tabBarItem = UITabBarItem(title: title, image: image, tag: tag)
        return nav
    }
}

enum TabBarIconKind {
    case surahs, mushaf, bookmarks, search, settings
}

enum TabBarIconRenderer {
    static func image(for kind: TabBarIconKind) -> UIImage {
        let size = CGSize(width: 24, height: 24)
        let renderer = UIGraphicsImageRenderer(size: size)
        let img = renderer.image { ctx in
            let cg = ctx.cgContext
            UIColor.black.setStroke()
            UIColor.black.setFill()
            cg.setLineWidth(1.8)
            cg.setLineCap(.round)
            cg.setLineJoin(.round)

            switch kind {
            case .surahs:
                // Open book icon
                let leftPage = UIBezierPath()
                leftPage.move(to: CGPoint(x: 12, y: 6))
                leftPage.addCurve(to: CGPoint(x: 3, y: 5), controlPoint1: CGPoint(x: 9, y: 4.5), controlPoint2: CGPoint(x: 6, y: 4.5))
                leftPage.addLine(to: CGPoint(x: 3, y: 19))
                leftPage.addCurve(to: CGPoint(x: 12, y: 20), controlPoint1: CGPoint(x: 6, y: 18.5), controlPoint2: CGPoint(x: 9, y: 18.5))
                leftPage.close()
                leftPage.stroke()

                let rightPage = UIBezierPath()
                rightPage.move(to: CGPoint(x: 12, y: 6))
                rightPage.addCurve(to: CGPoint(x: 21, y: 5), controlPoint1: CGPoint(x: 15, y: 4.5), controlPoint2: CGPoint(x: 18, y: 4.5))
                rightPage.addLine(to: CGPoint(x: 21, y: 19))
                rightPage.addCurve(to: CGPoint(x: 12, y: 20), controlPoint1: CGPoint(x: 18, y: 18.5), controlPoint2: CGPoint(x: 15, y: 18.5))
                rightPage.close()
                rightPage.stroke()

            case .mushaf:
                // Ornate framed page icon
                let outer = UIBezierPath(roundedRect: CGRect(x: 4, y: 3, width: 16, height: 18), cornerRadius: 2.5)
                outer.lineWidth = 1.8
                outer.stroke()
                for y in [8.0, 12.0, 16.0] {
                    cg.move(to: CGPoint(x: 7.5, y: y))
                    cg.addLine(to: CGPoint(x: 16.5, y: y))
                }
                cg.strokePath()

            case .bookmarks:
                // Bookmark ribbon icon
                let path = UIBezierPath()
                path.move(to: CGPoint(x: 6, y: 3.5))
                path.addLine(to: CGPoint(x: 18, y: 3.5))
                path.addLine(to: CGPoint(x: 18, y: 20.5))
                path.addLine(to: CGPoint(x: 12, y: 15.5))
                path.addLine(to: CGPoint(x: 6, y: 20.5))
                path.close()
                path.lineWidth = 1.8
                path.stroke()

            case .search:
                // Magnifying glass icon
                let circle = UIBezierPath(ovalIn: CGRect(x: 4, y: 4, width: 12, height: 12))
                circle.lineWidth = 1.8
                circle.stroke()
                cg.move(to: CGPoint(x: 14.5, y: 14.5))
                cg.addLine(to: CGPoint(x: 20, y: 20))
                cg.strokePath()

            case .settings:
                // Sliders / preferences icon
                for (index, y) in [6.0, 12.0, 18.0].enumerated() {
                    let knobX: CGFloat = index == 1 ? 15.0 : (index == 0 ? 9.0 : 12.0)
                    cg.move(to: CGPoint(x: 4, y: y))
                    cg.addLine(to: CGPoint(x: knobX - 2.5, y: y))
                    cg.move(to: CGPoint(x: knobX + 2.5, y: y))
                    cg.addLine(to: CGPoint(x: 20, y: y))
                    cg.strokePath()
                    let knob = UIBezierPath(ovalIn: CGRect(x: knobX - 2.5, y: CGFloat(y) - 2.5, width: 5, height: 5))
                    knob.lineWidth = 1.6
                    knob.stroke()
                }
            }
        }
        return img.withRenderingMode(.alwaysTemplate)
    }
}

extension UIViewController {
    func showNotice(_ message: String, title: String = "Quran Reader") {
        let alert = UIAlertController(title: title, message: message, preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "OK", style: .default))
        present(alert, animated: true)
    }

    func setBusy(_ busy: Bool) {
        if busy {
            let spinner = UIActivityIndicatorView(style: .gray)
            spinner.startAnimating()
            navigationItem.rightBarButtonItem = UIBarButtonItem(customView: spinner)
        } else {
            navigationItem.rightBarButtonItem = nil
        }
    }
}

enum HTMLTextSanitizer {
    static func clean(_ html: String) -> String {
        guard !html.isEmpty else { return "" }
        // Remove inline footnote tags (<sup foot_note=...>1</sup>) so footnote numbers do not stick to words
        var output = html.replacingOccurrences(of: "<sup[^>]*>.*?</sup>", with: "", options: [.regularExpression, .caseInsensitive])
        // Remove any remaining HTML tags
        output = output.replacingOccurrences(of: "<[^>]+>", with: "", options: .regularExpression)
        // Decode common HTML entities safely without invoking main-thread WebKit HTML parser
        let entities: [(String, String)] = [
            ("&nbsp;", " "),
            ("&amp;", "&"),
            ("&quot;", "\""),
            ("&#39;", "'"),
            ("&apos;", "'"),
            ("&lt;", "<"),
            ("&gt;", ">"),
            ("&mdash;", "—"),
            ("&ndash;", "–")
        ]
        for (entity, replacement) in entities where output.contains(entity) {
            output = output.replacingOccurrences(of: entity, with: replacement)
        }
        return output.trimmingCharacters(in: .whitespacesAndNewlines)
    }
}
