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
    port: Option<u16>,  // Allow null port to match TypeScript interface
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
    /// Authority (hostname) for fetching proxy targets (e.g., "pzero-server")
    /// The port is determined by the Envoy cluster configuration.
    /// Configure via proxy_targets_authority=<hostname> in filter config.
    proxy_targets_authority: String,
}

impl Default for FilterConfig {
    fn default() -> Self {
        Self {
            jwt_secret: String::new(),
            filter_id: String::new(),
            centrifugo_secret: String::new(),
            redis_response_buffer_size: 4096, // Default 4KB buffer for Redis responses
            proxy_targets_authority: "pzero-server".to_string(), // Default authority (port from cluster config)
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
// Should be kept in sync with packages/server/src/constants/routes.ts
const PUBLIC_ROUTES: &[&str] = &[
    // Auth routes (registration, login, etc.)
    "/auth/register",
    "/auth/register/verify",
    "/auth/login",
    "/auth/login/verify",
    "/auth/logout",
    "/auth/callback",
    "/auth/callback/github",
    "/auth/refresh",
    // Legacy proxy auth routes
    "/proxy/auth/login",
    "/proxy/auth/register", 
    "/proxy/auth/callback",
    "/proxy/auth/refresh",
    "/proxy/auth/logout",
    "/proxy/auth/me",
    // Centrifugo proxy routes
    "/centrifugo/connect",
    "/centrifugo/refresh",
    "/centrifugo/subscribe",
    "/centrifugo/publish",
    // SMS verification routes
    "/sms/verify",
    "/sms/verify/confirm",
    "/sms/verify/resend",
    // Email routes
    "/email/verify",
    // Static assets and health checks
    "/health",
    "/ready",
    "/public",
    "/docs",
    "/assets",
    // User-facing pages
    "/faq",
    "/terms",
    "/privacy",
];

// Route patterns that should be treated as public
// Anything starting with these prefixes bypasses authentication
const PUBLIC_ROUTE_PATTERNS: &[&str] = &[
    "/auth/",
    "/assets/",
    "/public/",
    "/docs/",
    "/proxy/",
];


impl Context for ChallengeAuthzRoot {
    fn on_http_call_response(&mut self, token_id: u32, _: usize, _: usize, _: usize) {
        info!("[Rust WASM Filter] Root context received HTTP call response: {}", token_id);
        
        // Get response body from server
        let response_body = self.get_http_call_response_body(0, 8192);
        
        match response_body {
            Some(body) => {
                let body_str = String::from_utf8_lossy(&body);
                info!("[Rust WASM Filter] Fetched proxy targets from server");
                
                // Parse JSON array of proxy targets
                if let Ok(targets) = serde_json::from_str::<Vec<ProxyTarget>>(&body_str) {
                    for target in targets {
                        let addr = match target.port {
                            Some(port) => format!("{}:{}", target.url, port),
                            None => target.url.clone(),
                        };
                        info!("[Rust WASM Filter] Loaded proxy target: {} -> {}", target.id, addr);
                        self.proxy_targets.insert(target.id.clone(), target);
                    }
                } else {
                    warn!("[Rust WASM Filter] Failed to parse proxy targets JSON: {}", body_str);
                }
            }
            None => {
                warn!("[Rust WASM Filter] No proxy targets response body");
            }
        }
    }
}

impl ChallengeAuthzRoot {
    fn fetch_proxy_targets(&mut self) {
        // Fetch proxy targets from Redis cache
        // Using Redis HTTP proxy endpoint to get proxy targets
        let authority = if self.config.proxy_targets_authority.is_empty() {
            "pzero-server" // Fallback default (port from cluster config)
        } else {
            &self.config.proxy_targets_authority
        };
        
        let headers = vec![
            (":method", "GET"),
            (":path", "/proxy-targets"),
            (":authority", authority),
            ("content-type", "application/json"),
        ];
        
        info!("[Rust WASM Filter] Fetching proxy targets from {}", authority);
        
        match self.dispatch_http_call(
            "server_cluster",
            headers,
            None,
            vec![],
            std::time::Duration::from_secs(5),
        ) {
            Ok(call_id) => {
                info!("[Rust WASM Filter] Fetching proxy targets from {}, call_id: {}", authority, call_id);
            }
            Err(status) => {
                warn!("[Rust WASM Filter] Failed to fetch proxy targets from {}: {:?}", authority, status);
                // Don't hardcode any fallback - let the gateway handle defaults
            }
        }
    }
}
// TODO - revisit. 
// The callback response from fetch_proxy_targets is never handled. The dispatch_http_call is made during on_configure, but there's no RootContext implementation of on_http_call_response to process the returned proxy targets. This means proxy_targets will always remain empty, and the dynamic routing feature won't work. You need to implement on_http_call_response in the RootContext trait for ChallengeAuthzRoot to handle the response and populate proxy_targets.


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
                        "proxy_targets_authority" => config.proxy_targets_authority = value.to_string(),
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
        }))
    }

    fn get_type(&self) -> Option<ContextType> {
        Some(ContextType::HttpContext)
    }
}

impl Context for ChallengeAuthzHttp {
    /// Handle the response for an outstanding HTTP call used to validate a Redis-backed challenge.
    ///
    /// Verifies that `token_id` matches the stored pending call id, reads the HTTP call response body
    /// (using `config.redis_response_buffer_size`) and, if present, performs a constant-time comparison
    /// of the response against the stored challenge answer. If the comparison succeeds, applies routing
    /// transformations and resumes the original HTTP request:
    /// - Requests whose path starts with `/salesforce` are rewritten to `/gateway{path}` and routed to
    ///   `pzero-sfdc-server:3000` via an `x-gateway-target` header.
    /// - If the request includes an `x-proxy-target-id` header and a matching entry exists in
    ///   `proxy_targets`, the request path is rewritten to `/gateway{path}` and `x-gateway-target` is
    ///   set to the target's address (including port when present). If no matching target is found,
    ///   the path is still rewritten to `/gateway{path}`.
    /// If the challenge comparison fails, sends a 403 response with reason `"invalid challenge answer"`.
    /// If no response body is available from Redis, resumes the request to allow backend validation.
    /// In all handled cases, clears the pending challenge id, answer, and call id.
    ///
    /// Parameters:
    /// - `token_id`: identifier of the HTTP call whose response is being processed; ignored if it does
    ///   not match the stored pending call id.
    ///
    /// # Examples
    ///
    /// ```no_run
    /// // Assume `ctx` is a mutable ChallengeAuthzHttp populated with pending_challenge_id,
    /// // pending_challenge_answer and pending_call_id.
    /// // The runtime will call this when the HTTP call response arrives:
    /// ctx.on_http_call_response(42, 0, 0, 0);
    /// ```
    fn on_http_call_response(&mut self, token_id: u32, _: usize, _: usize, _: usize) {
        // Verify this is the expected call response
        if self.pending_call_id != Some(token_id) {
            warn!("[Rust WASM Filter] Unexpected call response: {}", token_id);
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
                        info!("[Rust WASM Filter] ✅ CORRECT: Challenge validated via Redis: {}", challenge_id);
                        
                        // Apply routing transformations before resuming
                        // Extract path components to determine routing
                        let path = self.get_http_request_header(":path").unwrap_or_default();
                        
                        // Check if this is a Salesforce route
                        if path.starts_with("/salesforce/") || path.starts_with("/salesforce") {
                            // Transform to gateway path
                            let new_path = format!("/gateway{}", path);
                            self.set_http_request_header(":path", Some(&new_path));
                            
                            // Add gateway target header for Salesforce
                            self.set_http_request_header("x-gateway-target", Some("pzero-sfdc-server:3000"));
                            
                            info!("[Rust WASM Filter] Routing to Salesforce: {} -> {}", path, new_path);
                        } else if let Some(proxy_target_id) = self.get_http_request_header("x-proxy-target-id") {
                            // Check for proxy target header and modify request to route directly
                            info!("[Rust WASM Filter] Request has proxy target ID: {}", proxy_target_id);
                            
                            // Look up the proxy target from our cache
                            if let Some(target) = self.proxy_targets.get(&proxy_target_id) {
                                // Format target address with optional port
                                let target_address = match target.port {
                                    Some(port) => format!("{}:{}", target.url, port),
                                    None => target.url.clone(),
                                };
                                info!("[Rust WASM Filter] Found proxy target: {} -> {}", target.name, target_address);
                                
                                // Modify the path to use gateway routing
                                let new_path = format!("/gateway{}", path);
                                self.set_http_request_header(":path", Some(&new_path));
                                
                                // Add header to indicate target service dynamically
                                self.set_http_request_header("x-gateway-target", Some(&target_address));
                                
                                info!("[Rust WASM Filter] Modified path to {} for gateway routing to {}", new_path, target_address);
                            } else {
                                warn!("[Rust WASM Filter] Proxy target not found in cache: {}", proxy_target_id);
                                // Use gateway routing without specific target
                                let new_path = format!("/gateway{}", path);
                                self.set_http_request_header(":path", Some(&new_path));
                            }
                        }
                        
                        self.resume_http_request();
                    } else {
                        warn!("[Rust WASM Filter] ⚠️ WRONG: Challenge validation failed: {}", challenge_id);
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
    /// Processes incoming HTTP request headers: handles CORS preflight, allows public routes, validates the access token and challenge headers, and dispatches an asynchronous Redis request to validate the challenge while pausing the request.
    ///
    /// On OPTIONS requests this sends a 204 CORS response and pauses. If the route is public the request continues. For non-public routes it extracts an `accessToken` cookie and performs a basic JWT-format check; it then validates presence and basic format of `x-challenge-id` and `x-challenge-answer`. If validation succeeds it stores the pending challenge state and dispatches an HTTP GET to the Redis endpoint `/redis/get/challenge:{id}` on `server_cluster`, then pauses waiting for the Redis response. If any validation or dispatch step fails the function sends a 403 JSON forbidden response and pauses.
    ///
    /// # Examples
    ///
    /// ```
    /// // Pseudocode example illustrating intended usage:
    /// // let mut ctx = ChallengeAuthzHttp::new(...);
    /// // let action = ctx.on_http_request_headers(0, false);
    /// // match action {
    /// //     Action::Pause => { /* waiting for Redis validation or CORS handled */ }
    /// //     Action::Continue => { /* public route or validation bypassed */ }
    /// //     _ => {}
    /// // }
    /// ```
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

        // Query Redis for challenge validation
        info!("[Rust WASM Filter] Querying Redis for challenge: {}", challenge_id);
        
        // Store pending challenge data for validation in callback
        self.pending_challenge_id = Some(challenge_id.clone());
        self.pending_challenge_answer = Some(challenge_answer.clone());
        
        // Dispatch HTTP call to Redis endpoint
        let redis_path = format!("/redis/get/challenge:{}", challenge_id);
        let headers = vec![
            (":method", "GET"),
            (":path", &redis_path),
            (":authority", "pzero-server"),
        ];
        
        match self.dispatch_http_call(
            "server_cluster",
            headers,
            None,
            vec![],
            std::time::Duration::from_secs(5),
        ) {
            Ok(call_id) => {
                info!("[Rust WASM Filter] Redis query dispatched with call_id: {}", call_id);
                self.pending_call_id = Some(call_id);
                // Pause the request until we get Redis response
                Action::Pause
            }
            Err(status) => {
                warn!("[Rust WASM Filter] Failed to query Redis: {:?}", status);
                // Fallback: reject the request
                self.send_forbidden_response("challenge validation failed");
                Action::Pause
            }
        }
    }
}

// Helper functions
fn is_public_route(path: &str, _method: &str) -> bool {
    // Strip query parameters if present
    let path_without_query = path.split('?').next().unwrap_or(path);
    
    // Check exact matches first
    if PUBLIC_ROUTES.iter().any(|&route| path_without_query == route) {
        return true;
    }
    
    // Check pattern matches (prefixes)
    PUBLIC_ROUTE_PATTERNS.iter().any(|&pattern| path_without_query.starts_with(pattern))
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

/// Validates that a challenge id and answer are present and within the allowed length.
///
/// Ensures neither `id` nor `answer` is empty and that both have fewer than 256 characters.
///
/// # Examples
///
/// ```
/// assert!(validate_challenge_format("challenge123", "answer456"));
/// assert!(!validate_challenge_format("", "answer"));
/// assert!(!validate_challenge_format("id", ""));
/// let long = "a".repeat(256);
/// assert!(!validate_challenge_format(&long, "ans"));
/// ```
///
/// # Returns
///
/// `true` if both `id` and `answer` are non-empty and have length less than 256, `false` otherwise.
fn validate_challenge_format(id: &str, answer: &str) -> bool {
    // Basic validation - non-empty and reasonable length
    !id.is_empty() && !answer.is_empty() && id.len() < 256 && answer.len() < 256
}


impl ChallengeAuthzHttp {
    /// Send a 403 Forbidden response with a JSON error body and CORS headers.
    ///
    /// The response body will be `{"error": <reason>}`. The `Access-Control-Allow-Origin` header
    /// is set from the request `Origin` header when present, otherwise `"*"`. The response
    /// also includes `Content-Type: application/json` and `Access-Control-Allow-Credentials: true`.
    ///
    /// # Examples
    ///
    /// ```
    /// // Construct the same JSON body produced by `send_forbidden_response`.
    /// let reason = "invalid challenge answer";
    /// let body = serde_json::json!({ "error": reason }).to_string();
    /// assert_eq!(body, r#"{"error":"invalid challenge answer"}"#);
    /// ```
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