import Foundation
import Tauri

@objc public class TauriBridge: NSObject {
    private static var tauriApp: TauriApp?
    
    @objc public static func setTauriApp(_ app: TauriApp) {
        tauriApp = app
    }
    
    @objc public static func emitDeepLink(_ url: String) {
        guard let app = tauriApp else {
            print("Tauri app not initialized")
            return
        }
        
        // Emit the deep link event to the frontend
        DispatchQueue.main.async {
            app.emit("deep-link", url)
        }
    }
}

