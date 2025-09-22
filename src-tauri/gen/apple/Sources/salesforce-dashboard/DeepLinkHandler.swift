import Foundation
import Tauri

@objc public class DeepLinkHandler: NSObject {
    @objc public static func handleDeepLink(_ url: URL) {
        // Extract the URL components
        guard let components = URLComponents(url: url, resolvingAgainstBaseURL: false) else {
            return
        }
        
        // Check if this is our auth callback
        if components.scheme == "com.salesforce-dashboard.app" && 
           components.host == "auth" && 
           components.path == "/callback" {
            
            // Extract the fragment (access_token, refresh_token, etc.)
            if let fragment = components.fragment {
                // Send the full URL back to the Tauri app
                let fullUrl = url.absoluteString
                
                // Post a notification that can be picked up by the Tauri app
                NotificationCenter.default.post(
                    name: NSNotification.Name("DeepLinkReceived"),
                    object: nil,
                    userInfo: ["url": fullUrl]
                )
                
                // Also emit directly to Tauri
                TauriBridge.emitDeepLink(fullUrl)
            }
        }
    }
}
