use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use tauri::{Emitter, Listener};
use url::Url;

#[derive(Debug, Serialize, Deserialize)]
struct AuthResponse {
    access_token: String,
    refresh_token: String,
    expires_in: u64,
    token_type: String,
}

#[derive(Debug, Serialize, Deserialize)]
struct SupabaseAuthResponse {
    access_token: String,
    refresh_token: String,
    expires_in: u64,
    token_type: String,
    user: serde_json::Value,
}

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
async fn sign_in_with_github(app: tauri::AppHandle) -> Result<String, String> {
    let supabase_url = std::env::var("VITE_SUPABASE_URL")
        .map_err(|_| "VITE_SUPABASE_URL not found in environment")?;
    let supabase_anon_key = std::env::var("VITE_SUPABASE_ANON_KEY")
        .map_err(|_| "VITE_SUPABASE_ANON_KEY not found in environment")?;

    // Create the OAuth URL for GitHub
    let redirect_uri = "com.salesforce-dashboard.app://auth/callback";
    let auth_url = format!(
        "{}?provider=github&redirect_to={}",
        format!("{}/auth/v1/authorize", supabase_url),
        urlencoding::encode(redirect_uri)
    );

    // Open the browser for OAuth
    #[cfg(not(target_os = "ios"))]
    {
        tauri_plugin_opener::open_url(&auth_url, None::<&str>)
            .map_err(|e| format!("Failed to open browser: {}", e))?;
    }

    #[cfg(target_os = "ios")]
    {
        // On iOS, we need to use the opener plugin to open the URL
        // This will open the URL in Safari
        tauri_plugin_opener::open_url(&auth_url, None::<&str>)
            .map_err(|e| format!("Failed to open browser: {}", e))?;
    }

    Ok(auth_url)
}

#[tauri::command]
async fn handle_auth_callback(url: String) -> Result<SupabaseAuthResponse, String> {
    let parsed_url = Url::parse(&url).map_err(|e| format!("Failed to parse URL: {}", e))?;

    // Extract the access_token from the URL fragment
    let fragment = parsed_url.fragment().ok_or("No fragment found in URL")?;

    let mut params = HashMap::new();
    for pair in fragment.split('&') {
        if let Some((key, value)) = pair.split_once('=') {
            params.insert(key, value);
        }
    }

    let access_token = params
        .get("access_token")
        .ok_or("No access_token found in URL")?;
    let refresh_token = params
        .get("refresh_token")
        .ok_or("No refresh_token found in URL")?;
    let expires_in = params
        .get("expires_in")
        .and_then(|s| s.parse::<u64>().ok())
        .unwrap_or(3600);

    // Get user info from Supabase
    let supabase_url = std::env::var("VITE_SUPABASE_URL")
        .map_err(|_| "VITE_SUPABASE_URL not found in environment")?;

    let client = reqwest::Client::new();
    let user_response = client
        .get(&format!("{}/auth/v1/user", supabase_url))
        .header("Authorization", format!("Bearer {}", access_token))
        .send()
        .await
        .map_err(|e| format!("Failed to get user info: {}", e))?;

    let user: serde_json::Value = user_response
        .json()
        .await
        .map_err(|e| format!("Failed to parse user response: {}", e))?;

    Ok(SupabaseAuthResponse {
        access_token: access_token.to_string(),
        refresh_token: refresh_token.to_string(),
        expires_in,
        token_type: "bearer".to_string(),
        user,
    })
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            sign_in_with_github,
            handle_auth_callback
        ])
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
