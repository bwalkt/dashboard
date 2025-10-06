use tauri::{Emitter, Listener};

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

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
