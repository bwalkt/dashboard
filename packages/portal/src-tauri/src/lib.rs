use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use std::time::Duration;
use tauri::{
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
    Emitter, Manager, State,
};
#[cfg(target_os = "ios")]
use tauri::Listener;
use tokio::sync::{oneshot, Mutex};
use uuid::Uuid;

mod ble;

#[derive(Debug, Clone, Serialize, Deserialize)]
struct AuthRequest {
    id: String,
    endpoint: String,
    method: String,
    timestamp: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct AuthResponse {
    id: String,
    approved: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct AuthTimeout {
    id: String,
    reason: String,
}

struct AppState {
    pending_requests: Arc<Mutex<HashMap<String, oneshot::Sender<bool>>>>,
    timeout_duration: Duration,
    ble_manager: Arc<Mutex<ble::BLEManager>>,
}

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

#[tauri::command]
async fn request_authorization(
    endpoint: String,
    method: String,
    window: tauri::Window,
    state: State<'_, AppState>,
) -> Result<bool, String> {
    let request_id = Uuid::now_v7().to_string();

    let auth_request = AuthRequest {
        id: request_id.clone(),
        endpoint,
        method,
        timestamp: std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map_err(|e| format!("System time error: {}", e))?
            .as_secs() as i64,
    };

    // Create oneshot channel for response
    let (tx, rx) = oneshot::channel();

    // Store the sender in pending requests
    {
        let mut pending = state.pending_requests.lock().await;
        pending.insert(request_id.clone(), tx);
    }

    // Emit event to frontend
    window
        .emit("auth-request", auth_request)
        .map_err(|e| e.to_string())?;

    // Show the window
    window.show().map_err(|e| e.to_string())?;
    window.set_focus().map_err(|e| e.to_string())?;

    // Wait for response with timeout
    match tokio::time::timeout(state.timeout_duration, rx).await {
        Ok(Ok(approved)) => Ok(approved),
        Ok(Err(_)) => {
            // Channel was closed without sending (shouldn't happen normally)
            Err("Authorization request was cancelled".to_string())
        }
        Err(_) => {
            // Timeout occurred
            // Remove from pending requests
            let mut pending = state.pending_requests.lock().await;
            pending.remove(&request_id);

            // Notify frontend about timeout
            let timeout_event = AuthTimeout {
                id: request_id,
                reason: "Request timed out".to_string(),
            };
            window
                .emit("auth-timeout", timeout_event)
                .map_err(|e| e.to_string())?;

            Err("Authorization request timed out".to_string())
        }
    }
}

#[tauri::command]
async fn handle_auth_response(
    request_id: String,
    approved: bool,
    window: tauri::Window,
    state: State<'_, AppState>,
) -> Result<(), String> {
    // Find and remove the pending request
    let sender = {
        let mut pending = state.pending_requests.lock().await;
        pending.remove(&request_id)
    };

    match sender {
        Some(tx) => {
            // Send the response through the channel
            if tx.send(approved).is_err() {
                return Err("Failed to send authorization response".to_string());
            }

            println!(
                "Authorization {} for request {}",
                if approved { "approved" } else { "denied" },
                request_id
            );

            // Hide the window after handling
            window.hide().map_err(|e| e.to_string())?;

            Ok(())
        }
        None => {
            // Request not found (might have timed out or already handled)
            Err(format!(
                "Authorization request {} not found or already handled",
                request_id
            ))
        }
    }
}

// BLE Commands

#[tauri::command]
async fn ble_initialize(state: State<'_, AppState>) -> Result<(), String> {
    // Clone the Arc to release the State borrow, then lock
    let ble_manager = state.ble_manager.clone();
    let mut ble = ble_manager.lock().await;
    ble.initialize().await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn ble_connect(state: State<'_, AppState>) -> Result<(), String> {
    // Clone the Arc to release the State borrow, then lock
    let ble_manager = state.ble_manager.clone();
    let ble = ble_manager.lock().await;
    ble.connect().await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn ble_disconnect(state: State<'_, AppState>) -> Result<(), String> {
    // Clone the Arc to release the State borrow, then lock
    let ble_manager = state.ble_manager.clone();
    let ble = ble_manager.lock().await;
    ble.disconnect().await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn ble_is_connected(state: State<'_, AppState>) -> Result<bool, String> {
    // Clone the Arc to release the State borrow, then lock
    let ble_manager = state.ble_manager.clone();
    let ble = ble_manager.lock().await;
    Ok(ble.is_connected().await)
}

#[tauri::command]
async fn ble_get_endpoints(state: State<'_, AppState>) -> Result<Vec<ble::Endpoint>, String> {
    // Clone the Arc to release the State borrow, then lock
    let ble_manager = state.ble_manager.clone();
    let ble = ble_manager.lock().await;
    ble.get_endpoints().await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn ble_get_token(endpoint_id: String, state: State<'_, AppState>) -> Result<String, String> {
    // Clone the Arc to release the State borrow, then lock
    let ble_manager = state.ble_manager.clone();
    let ble = ble_manager.lock().await;
    ble.get_token(endpoint_id).await.map_err(|e| e.to_string())
}

/// Builds and runs the Tauri application for the portal with tray support, registering plugins,
/// authorization handlers, BLE commands, and (on iOS) a deep-link listener.
///
/// The application is configured with system tray functionality when running in desktop mode,
/// providing quick access to authorization prompts and BLE device management.
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() -> Result<(), Box<dyn std::error::Error>> {
    // Read timeout from environment variable, default to 5 minutes (300 seconds)
    let timeout_secs = std::env::var("AUTH_TIMEOUT_SECS")
        .ok()
        .and_then(|s| s.parse::<u64>().ok())
        .unwrap_or(300);

    // Read port from environment variable, default to 1430 (portal's default)
    let port = std::env::var("PORT")
        .ok()
        .and_then(|s| s.parse::<u16>().ok())
        .unwrap_or(1430);

    let app_state = AppState {
        pending_requests: Arc::new(Mutex::new(HashMap::new())),
        timeout_duration: Duration::from_secs(timeout_secs),
        ble_manager: Arc::new(Mutex::new(ble::BLEManager::new())),
    };

    tauri::Builder::default()
        .plugin(tauri_plugin_localhost::Builder::new(port).build())
        .manage(app_state)
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_notification::init())
        .setup(|app| {
            // Setup tray icon for desktop
            #[cfg(desktop)]
            {
                let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
                let show = MenuItem::with_id(app, "show", "Show Window", true, None::<&str>)?;
                let menu = Menu::with_items(app, &[&show, &quit])?;

                let _tray = TrayIconBuilder::new()
                    .menu(&menu)
                    .tooltip("PZero Portal")
                    .on_menu_event(|app, event| match event.id.as_ref() {
                        "quit" => {
                            app.exit(0);
                        }
                        "show" => {
                            if let Some(window) = app.get_webview_window("main") {
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                        }
                        _ => {}
                    })
                    .on_tray_icon_event(|tray, event| {
                        if let tauri::tray::TrayIconEvent::Click { button, .. } = event {
                            if button == tauri::tray::MouseButton::Left {
                                let app = tray.app_handle();
                                if let Some(window) = app.get_webview_window("main") {
                                    let _ = window.show();
                                    let _ = window.set_focus();
                                }
                            }
                        }
                    })
                    .build(app)?;
            }

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
        .invoke_handler(tauri::generate_handler![
            greet,
            request_authorization,
            handle_auth_response,
            ble_initialize,
            ble_connect,
            ble_disconnect,
            ble_is_connected,
            ble_get_endpoints,
            ble_get_token
        ])
        .run(tauri::generate_context!())
        .map_err(|e| e.into())
}