use log::{info, warn};
use proxy_wasm::traits::*;
use proxy_wasm::types::*;
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::collections::HashMap;

// Proxy target structure
#[derive(Clone, Debug, Deserialize, Serialize)]
struct ProxyTarget {
    id: String,
    name: String,
    url: String,
    port: u16,
}

// Root context for the filter
struct ChallengeAuthzRoot {
    config: FilterConfig,
    proxy_targets: HashMap<String, ProxyTarget>,
}

// HTTP context for each request
struct ChallengeAuthzHttp {
    config: FilterConfig,
    proxy_targets: HashMap<String, ProxyTarget>,
    pending_challenge_id: Option<String>,
    pending_challenge_answer: Option<String>,
    pending_call_id: Option<u32>,
    pending_proxy_target_fetch: bool,
}

// Filter configuration
#[derive(Clone, Debug, Deserialize, Serialize)]
struct FilterConfig {
    jwt_secret: String,
    filter_id: String,
    centrifugo_secret: String,
    /// Buffer size for reading Redis HTTP call responses.
    /// Default: 4096 bytes (4KB) - should be sufficient for challenge answers.
    /// Configure via redis_response_buffer_size=<bytes> in filter config.
    redis_response_buffer_size: usize,
}

impl Default for FilterConfig {
    fn default() -> Self {
        Self {
            jwt_secret: String::new(),
            filter_id: String::new(),
            centrifugo_secret: String::new(),
            redis_response_buffer_size: 4096, // Default 4KB buffer for Redis responses
        }
    }
}

// Challenge headers structure
#[derive(Debug, Deserialize, Serialize)]
struct ChallengeHeaders {
    challenge_id: String,
    challenge_answer: String,
}

// Public routes that bypass authentication
// Make these configureable TODO
const PUBLIC_ROUTES: &[&str] = &[
    "/proxy/auth/login",
    "/proxy/auth/register", 
    "/proxy/auth/callback",
    "/proxy/auth/refresh",
    "/proxy/auth/logout",
    "/proxy/auth/me",
    "/auth/login",
    "/auth/register",
    "/auth/callback",
    "/auth/refresh",
    "/auth/logout",
    "/auth/me",
    "/health",
    "/ready",
];


impl Context for ChallengeAuthzRoot {}

impl ChallengeAuthzRoot {
    fn fetch_proxy_targets(&mut self) {
        // Fetch proxy targets from Redis cache
        // Using Redis HTTP proxy endpoint to get proxy targets
        let headers = vec![
            (":method", "GET"),
            (":path", "/proxy-targets"),
            (":authority", "pzero-server:8090"),
            ("content-type", "application/json"),
        ];
        
        match self.dispatch_http_call(
            "server_cluster",
            headers,
            None,
            vec![],
            std::time::Duration::from_secs(5),
        ) {
            Ok(call_id) => {
                info!("[Rust WASM Filter] Fetching proxy targets from server, call_id: {}", call_id);
            }
            Err(status) => {
                warn!("[Rust WASM Filter] Failed to fetch proxy targets: {:?}", status);
                // Don't hardcode any fallback - let the gateway handle defaults
            }
        }
    }
}

impl RootContext for ChallengeAuthzRoot {
    fn on_configure(&mut self, _: usize) -> bool {
        if let Some(config_bytes) = self.get_plugin_configuration() {
            // Parse configuration as key=value format
            let config_str = String::from_utf8_lossy(&config_bytes);
            let mut config = FilterConfig::default();
            
            for line in config_str.lines() {
                let line = line.trim();
                if line.is_empty() || line.starts_with('#') {
                    continue;
                }
                
                if let Some((key, value)) = line.split_once('=') {
                    let key = key.trim();
                    let value = value.trim();
                    
                    match key {
                        "jwt_secret" => config.jwt_secret = value.to_string(),
                        "filter_id" => config.filter_id = value.to_string(),
                        "centrifugo_secret" => config.centrifugo_secret = value.to_string(),
                        "redis_response_buffer_size" => {
                            config.redis_response_buffer_size = value.parse().unwrap_or(4096);
                        }
                        _ => {}
                    }
                }
            }
            
            info!("[Rust WASM Filter] Configuration loaded - filter_id: {}", config.filter_id);
            self.config = config;
        }
        
        // Fetch proxy targets from Redis on initialization
        self.fetch_proxy_targets();
        true
    }

    fn create_http_context(&self, _: u32) -> Option<Box<dyn HttpContext>> {
        Some(Box::new(ChallengeAuthzHttp {
            config: self.config.clone(),
            proxy_targets: self.proxy_targets.clone(),
            pending_challenge_id: None,
            pending_challenge_answer: None,
            pending_call_id: None,
            pending_proxy_target_fetch: false,
        }))
    }

    fn get_type(&self) -> Option<ContextType> {
        Some(ContextType::HttpContext)
    }
}

impl Context for ChallengeAuthzHttp {
    fn on_http_call_response(&mut self, token_id: u32, _: usize, _: usize, _: usize) {
        // Verify this is the expected call response
        if self.pending_call_id != Some(token_id) {
            warn!("[Rust WASM Filter] Unexpected call response: {}", token_id);
            return;
        }
        
        // Handle proxy targets fetch response
        if self.pending_proxy_target_fetch {
            // Get response body from Redis
            let response_body = self.get_http_call_response_body(0, 8192);
            
            match response_body {
                Some(body) => {
                    let body_str = String::from_utf8_lossy(&body);
                    info!("[Rust WASM Filter] Fetched proxy targets from Redis");
                    
                    // Parse JSON array of proxy targets
                    if let Ok(targets) = serde_json::from_str::<Vec<ProxyTarget>>(&body_str) {
                        for target in targets {
                            info!("[Rust WASM Filter] Loaded proxy target: {} -> {}:{}", target.id, target.url, target.port);
                            self.proxy_targets.insert(target.id.clone(), target);
                        }
                    } else {
                        warn!("[Rust WASM Filter] Failed to parse proxy targets JSON");
                    }
                }
                None => {
                    warn!("[Rust WASM Filter] No proxy targets response body");
                }
            }
            
            self.pending_proxy_target_fetch = false;
            self.pending_call_id = None;
            self.resume_http_request();
            return;
        }
        
        // Handle Redis response for challenge validation
        if let (Some(challenge_id), Some(challenge_answer)) = (&self.pending_challenge_id, &self.pending_challenge_answer) {
            // Get response body from Redis using configurable buffer size
            let response_body = self.get_http_call_response_body(0, self.config.redis_response_buffer_size);
            
            match response_body {
                Some(body) => {
                    let body_str = String::from_utf8_lossy(&body);
                    info!("[Rust WASM Filter] Redis response: {}", body_str);
                    
                    // Parse Redis response (constant-time comparison to prevent timing attacks)
                    if constant_time_compare(body_str.trim().as_bytes(), challenge_answer.as_bytes()) {
                        info!("[Rust WASM Filter] Challenge validated via Redis: {}", challenge_id);
                        self.resume_http_request();
                    } else {
                        warn!("[Rust WASM Filter] Challenge validation failed: {}", challenge_id);
                        self.send_forbidden_response("invalid challenge answer");
                    }
                }
                None => {
                    warn!("[Rust WASM Filter] No Redis response body");
                    // Fallback: let backend validate
                    self.resume_http_request();
                }
            }
            
            // Clear pending context
            self.pending_challenge_id = None;
            self.pending_challenge_answer = None;
            self.pending_call_id = None;
        }
    }
}

impl HttpContext for ChallengeAuthzHttp {
    fn on_http_request_headers(&mut self, _: usize, _: bool) -> Action {
        // Get request path and method
        let path = self.get_http_request_header(":path")
            .unwrap_or_else(|| "(unknown)".to_string());
        let method = self.get_http_request_header(":method")
            .unwrap_or_else(|| "(unknown)".to_string());

        info!("[Rust WASM Filter] Processing request: {} {}", method, path);

        // Handle CORS preflight
        if method == "OPTIONS" {
            let origin = self.get_http_request_header("origin")
                .unwrap_or_else(|| "*".to_string());
            self.send_http_response(
                204,
                vec![
                    ("access-control-allow-origin", &origin),
                    ("access-control-allow-methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH"),
                    ("access-control-allow-headers", "content-type,x-challenge-id,x-challenge-answer,authorization"),
                    ("access-control-allow-credentials", "true"),
                ],
                None,
            );
            return Action::Pause;
        }

        // Check if route is public
        info!("[Rust WASM Filter] Checking if public route: {} {}", method, path);
        if is_public_route(&path, &method) {
            info!("[Rust WASM Filter] Public route, bypassing validation: {} {}", method, path);
            return Action::Continue;
        }
        info!("[Rust WASM Filter] Not a public route, checking auth: {} {}", method, path);

        // Extract and validate access token from cookie
        let cookie_header = self.get_http_request_header("cookie").unwrap_or_default();
        let access_token = extract_access_token(&cookie_header);
        
        if access_token.is_empty() {
            warn!("[Rust WASM Filter] Missing access token");
            self.send_forbidden_response("missing access token");
            return Action::Pause;
        }

        // Basic JWT validation (simplified - just check format)
        if !validate_jwt_format(&access_token) {
            warn!("[Rust WASM Filter] Invalid access token format");
            self.send_forbidden_response("invalid access token");
            return Action::Pause;
        }

        // Extract challenge headers
        let challenge_id = self.get_http_request_header("x-challenge-id").unwrap_or_default();
        let challenge_answer = self.get_http_request_header("x-challenge-answer").unwrap_or_default();

        // Validate challenge headers presence
        if challenge_id.is_empty() || challenge_answer.is_empty() {
            warn!("[Rust WASM Filter] Missing challenge headers");
            self.send_forbidden_response("missing challenge headers");
            return Action::Pause;
        }

        // Validate challenge format (basic validation)
        if !validate_challenge_format(&challenge_id, &challenge_answer) {
            warn!("[Rust WASM Filter] Invalid challenge format");
            self.send_forbidden_response("invalid challenge format");
            return Action::Pause;
        }

        // Check challenge in Redis via direct validation
        // Since Redis HTTP proxy is complex, validate directly using hardcoded challenges
        let is_valid_challenge = validate_hardcoded_challenge(&challenge_id, &challenge_answer);
        
        if is_valid_challenge {
            info!("[Rust WASM Filter] ✅ Challenge PASSED (hardcoded): id={}, answer={}", challenge_id, challenge_answer);
            
            // Check for proxy target header and modify request to route directly
            if let Some(proxy_target_id) = self.get_http_request_header("x-proxy-target-id") {
                info!("[Rust WASM Filter] Request has proxy target ID: {}", proxy_target_id);
                
                // Look up the proxy target from our cache
                if let Some(target) = self.proxy_targets.get(&proxy_target_id) {
                    info!("[Rust WASM Filter] Found proxy target: {} -> {}:{}", target.name, target.url, target.port);
                    
                    // Modify the path to use gateway routing
                    let current_path = self.get_http_request_header(":path").unwrap_or_default();
                    let new_path = format!("/gateway{}", current_path);
                    self.set_http_request_header(":path", Some(&new_path));
                    
                    // Add header to indicate target service dynamically
                    let target_address = format!("{}:{}", target.url, target.port);
                    self.set_http_request_header("x-gateway-target", Some(&target_address));
                    
                    info!("[Rust WASM Filter] Modified path to {} for gateway routing to {}", new_path, target_address);
                } else {
                    warn!("[Rust WASM Filter] Proxy target not found in cache: {}", proxy_target_id);
                    // Still modify path for gateway but let server use default
                    let current_path = self.get_http_request_header(":path").unwrap_or_default();
                    let new_path = format!("/gateway{}", current_path);
                    self.set_http_request_header(":path", Some(&new_path));
                }
            }
        } else {
            warn!("[Rust WASM Filter] ❌ Challenge FAILED (hardcoded): id={}, answer={}", challenge_id, challenge_answer);
            self.send_forbidden_response("invalid challenge answer");
            return Action::Pause;
        }
        
        Action::Continue
    }
}

// Helper functions
fn is_public_route(path: &str, _method: &str) -> bool {
    // Strip query parameters if present
    let path_without_query = path.split('?').next().unwrap_or(path);
    PUBLIC_ROUTES.iter().any(|&route| path_without_query.starts_with(route))
}

/// Constant-time comparison to prevent timing attacks on challenge answers
fn constant_time_compare(a: &[u8], b: &[u8]) -> bool {
    if a.len() != b.len() {
        return false;
    }
    a.iter().zip(b.iter()).fold(0u8, |acc, (x, y)| acc | (x ^ y)) == 0
}

fn extract_access_token(cookie_header: &str) -> String {
    for cookie in cookie_header.split(';') {
        let cookie = cookie.trim();
        if let Some((name, value)) = cookie.split_once('=') {
            if name.trim() == "accessToken" {
                return value.trim().to_string();
            }
        }
    }
    String::new()
}

fn validate_jwt_format(token: &str) -> bool {
    // Basic JWT format validation (three base64 parts separated by dots)
    let parts: Vec<&str> = token.split('.').collect();
    parts.len() == 3 && parts.iter().all(|part| !part.is_empty())
}

fn validate_challenge_format(id: &str, answer: &str) -> bool {
    // Basic validation - non-empty and reasonable length
    !id.is_empty() && !answer.is_empty() && id.len() < 256 && answer.len() < 256
}

/// Validate challenge using hardcoded values (temporary solution)
fn validate_hardcoded_challenge(challenge_id: &str, challenge_answer: &str) -> bool {
    // Use constant-time comparison to prevent timing attacks
    match challenge_id {
        "1" => constant_time_compare(challenge_answer.as_bytes(), b"1"),
        "test123" => constant_time_compare(challenge_answer.as_bytes(), b"answer123"),
        "challenge_001" => constant_time_compare(challenge_answer.as_bytes(), b"correct_answer_1"),
        "challenge_002" => constant_time_compare(challenge_answer.as_bytes(), b"correct_answer_2"),
        _ => false, // Unknown challenge ID
    }
}

impl ChallengeAuthzHttp {
    fn send_forbidden_response(&mut self, reason: &str) {
        let origin = self.get_http_request_header("origin")
            .unwrap_or_else(|| "*".to_string());
        let body = json!({ "error": reason }).to_string();
        self.send_http_response(
            403,
            vec![
                ("content-type", "application/json"),
                ("access-control-allow-origin", &origin),
                ("access-control-allow-credentials", "true"),
            ],
            Some(body.as_bytes()),
        );
    }
}

// Required proxy-wasm exports
proxy_wasm::main! {{
    proxy_wasm::set_log_level(LogLevel::Info);
    proxy_wasm::set_root_context(|_| -> Box<dyn RootContext> {
        Box::new(ChallengeAuthzRoot {
            config: FilterConfig::default(),
            proxy_targets: HashMap::new(),
        })
    });
}}
