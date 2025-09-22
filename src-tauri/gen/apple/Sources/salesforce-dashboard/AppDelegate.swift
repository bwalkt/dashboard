import UIKit
import Tauri

@main
class AppDelegate: UIResponder, UIApplicationDelegate {
    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Initialize Tauri
        let tauriApp = TauriApp()
        TauriBridge.setTauriApp(tauriApp)
        tauriApp.run()
        
        return true
    }

    // Handle deep links when app is already running
    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey : Any] = [:]) -> Bool {
        DeepLinkHandler.handleDeepLink(url)
        return true
    }

    // Handle deep links when app is launched from a deep link
    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        if userActivity.activityType == NSUserActivityTypeBrowsingWeb,
           let url = userActivity.webpageURL {
            DeepLinkHandler.handleDeepLink(url)
            return true
        }
        return false
    }
}
