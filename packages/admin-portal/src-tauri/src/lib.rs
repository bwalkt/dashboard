use tauri::{Emitter, Listener};

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
/// Constructs a greeting message that includes the provided `name`.
///
/// The returned string is formatted as: `Hello, {name}! You've been greeted from Rust!`.
///
/// # Examples
///
/// ```
/// let s = greet("Alice");
/// assert_eq!(s, "Hello, Alice! You've been greeted from Rust!");
/// ```
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

/// Builds and runs the Tauri application for the admin portal, registering plugins,
/// the `greet` invoke handler, and (on iOS) a deep-link listener that forwards URLs to the frontend.
///
/// The application is configured with the `tauri_plugin_opener` and `tauri_plugin_shell` plugins,
/// and exposes the `greet` command to the frontend. On iOS, incoming "deep-link" events are
/// forwarded to the frontend as `tauri://url` events with the link payload.
///
/// # Examples
///
/// ```no_run
/// fn main() {
///     // Starts the Tauri application (blocks the current thread while running).
///     run();
/// }
/// ```
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![greet])
        .setup(|app| {
            // Listen for deep link events on iOS
            #[cfg(target_os = "ios")]
            {
                let app_handle = app.handle().clone();
                app.listen("deep-link", move |event| {
                    let url = event.payload();
                    println!("Received deep link: {}", url);
                    // Handle the deep link here
                    // You can emit an event to the frontend
                    app_handle.emit("tauri://url", url).unwrap();
                });
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}