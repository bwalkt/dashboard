use log::{info, warn};
use proxy_wasm::traits::*;
use proxy_wasm::types::*;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::collections::HashMap;
use base64::{Engine as _, engine::general_purpose};

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
    pending_user_email: Option<String>,
    pending_user_call_id: Option<u32>,
    pending_cookie_header: Option<String>,
    pending_next_call_id: Option<u32>,
    pending_next_challenge_headers: Option<NextChallengeHeaders>,
    is_auth_me_request: bool,
    call_type: CallType,
}

#[derive(Clone, Debug, PartialEq)]
enum CallType {
    None,
    Challenge,
    UserFetch,
    UserCache,
    AuthMeProxy,
    AuthNext,
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
    /// Allowed CORS origins (comma-separated list)
    /// Configure via allowed_origins=<origin1,origin2> in filter config.
    /// If empty, reflects the origin header (current behavior).
    allowed_origins: Vec<String>,
}

impl Default for FilterConfig {
    fn default() -> Self {
        Self {
            jwt_secret: String::new(),
            filter_id: String::new(),
            centrifugo_secret: String::new(),
            redis_response_buffer_size: 4096, // Default 4KB buffer for Redis responses
            proxy_targets_authority: "pzero-server".to_string(), // Default authority (port from cluster config)
            allowed_origins: Vec::new(), // Empty = allow all origins (backward compatible)
        }
    }
}

// Challenge headers structure
#[derive(Debug, Deserialize, Serialize)]
struct ChallengeHeaders {
    challenge_id: String,
    challenge_answer: String,
}

#[derive(Debug, Deserialize)]
struct NextChallengeHeaders {
    challenge_id: String,
    challenge_question: String,
    challenge_params: String,
}

#[derive(Debug, Deserialize)]
struct ChallengePayload {
    answer: Value,
    next: Option<String>,
    uid: Option<String>,
    email: Option<String>,
    used: Option<bool>,
}

#[derive(Debug, Deserialize)]
struct AuthMeResponse {
    user: Value,
}
// JWT Claims structure
#[derive(Debug, Deserialize, Serialize)]
struct JwtClaims {
    email: Option<String>,
    #[serde(rename = "githubId")]
    github_id: Option<String>,
    #[serde(rename = "userId")]
    user_id: Option<String>,
    handle: Option<String>,
    #[serde(rename = "orgId")]
    org_id: Option<String>,
}

// User structure from database
#[derive(Debug, Deserialize, Serialize, Clone)]
struct User {
    #[serde(rename = "userId")]
    user_id: String,
    email: String,
    #[serde(rename = "githubId")]
    github_id: Option<String>,
    handle: Option<String>,
    is_act: bool,
    #[serde(rename = "orgId")]
    org_id: Option<String>,
    role: Option<String>,
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
                        "allowed_origins" => {
                            config.allowed_origins = value.split(',')
                                .map(|s| s.trim().to_string())
                                .filter(|s| !s.is_empty())
                                .collect();
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
            pending_user_email: None,
            pending_user_call_id: None,
            pending_cookie_header: None,
            pending_next_call_id: None,
            pending_next_challenge_headers: None,
            is_auth_me_request: false,
            call_type: CallType::None,
        }))
    }

    fn get_type(&self) -> Option<ContextType> {
        Some(ContextType::HttpContext)
    }
}

impl Context for ChallengeAuthzHttp {
    fn on_http_call_response(&mut self, token_id: u32, _: usize, _: usize, _: usize) {
        // Handle different types of calls
        match self.call_type {
            CallType::Challenge => {
                if self.pending_call_id != Some(token_id) {
                    warn!("[Rust WASM Filter] Unexpected challenge call response: {}", token_id);
                    return;
                }
                self.handle_challenge_response();
            }
            CallType::UserFetch => {
                if self.pending_user_call_id != Some(token_id) {
                    warn!("[Rust WASM Filter] Unexpected user fetch call response: {}", token_id);
                    return;
                }
                self.handle_user_fetch_response();
            }
            CallType::UserCache => {
                if self.pending_user_call_id != Some(token_id) {
                    warn!("[Rust WASM Filter] Unexpected user cache call response: {}", token_id);
                    return;
                }
                self.handle_user_cache_response();
            }
            CallType::AuthMeProxy => {
                if self.pending_user_call_id != Some(token_id) {
                    warn!("[Rust WASM Filter] Unexpected auth/me proxy response: {}", token_id);
                    return;
                }
                self.handle_auth_me_proxy_response();
            }
            CallType::AuthNext => {
                if self.pending_next_call_id != Some(token_id) {
                    warn!("[Rust WASM Filter] Unexpected auth/next response: {}", token_id);
                    return;
                }
                self.handle_auth_next_response();
            }
            _ => {
                warn!("[Rust WASM Filter] Unexpected call type for response: {}", token_id);
            }
        }
    }
}

impl ChallengeAuthzHttp {
    fn handle_challenge_response(&mut self) {
        let challenge_id = match self.pending_challenge_id.clone() {
            Some(value) => value,
            None => return,
        };
        let challenge_answer = match self.pending_challenge_answer.clone() {
            Some(value) => value,
            None => return,
        };
        {
            // Get response body from Redis using configurable buffer size
            let response_body = self.get_http_call_response_body(0, self.config.redis_response_buffer_size);
            
            match response_body {
                Some(body) => {
                    let body_str = String::from_utf8_lossy(&body);
                    info!("[Rust WASM Filter] Redis response: {}", body_str);

                    // Parse Redis response (supports JSON payloads and legacy string answers)
                    let (answer_match, next_challenge, already_used) = match serde_json::from_str::<ChallengePayload>(&body_str) {
                        Ok(payload) => {
                            let used = payload.used.unwrap_or(false);
                            // Validate the challenge belongs to the user if metadata is present
                            if let Some(user_email) = &self.pending_user_email {
                                if let Some(payload_email) = &payload.email {
                                    if payload_email != user_email {
                                        warn!("[Rust WASM Filter] Challenge email mismatch: {} != {}", payload_email, user_email);
                                        (false, payload.next, used)
                                    } else {
                                        (challenge_answer_matches(&payload.answer, &challenge_answer), payload.next, used)
                                    }
                                } else {
                                    (challenge_answer_matches(&payload.answer, &challenge_answer), payload.next, used)
                                }
                            } else {
                                (challenge_answer_matches(&payload.answer, &challenge_answer), payload.next, used)
                            }
                        }
                        Err(_) => {
                            // Legacy format - plain text answer
                            (constant_time_compare(body_str.trim().as_bytes(), challenge_answer.as_bytes()), None, false)
                        }
                    };

                    if already_used {
                        warn!("[Rust WASM Filter] ⚠️ Challenge already used: {}", challenge_id);
                        self.send_forbidden_response("challenge already used");
                        self.pending_challenge_id = None;
                        self.pending_challenge_answer = None;
                        self.pending_call_id = None;
                        self.call_type = CallType::None;
                        return;
                    }

                    if answer_match {
                        info!("[Rust WASM Filter] ✅ CORRECT: Challenge validated via Redis: {}", challenge_id);

                        // If we have a chained challenge, fetch the next one before proceeding
                        if next_challenge.is_some() {
                            if self.dispatch_auth_next(&challenge_id) {
                                // Clear pending challenge context, wait for /auth/next response
                                self.pending_challenge_id = None;
                                self.pending_challenge_answer = None;
                                self.pending_call_id = None;
                                return;
                            }
                        }
                        
                        // Apply routing transformations before resuming
                        // Extract path components to determine routing
                        let path = self.get_http_request_header(":path").unwrap_or_default();
                        
                        // Always check for proxy target first
                        if let Some(proxy_target) = self.get_http_request_header("x-proxy-target") {
                            // Check for proxy target header and modify request to route directly
                            info!("[Rust WASM Filter] Request has proxy target: {}", proxy_target);
                            
                            // Look up the proxy target from our cache by URL
                            let target_entry = self.proxy_targets.values().find(|t| t.url == proxy_target);
                            if let Some(target) = target_entry {
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
                                warn!("[Rust WASM Filter] Proxy target not found in cache: {}", proxy_target);
                                // Forward to backend proxy endpoint to handle routing
                                // The backend will look up the target and handle the proxying
                                let proxy_path = format!("/proxy{}", path);
                                self.set_http_request_header(":path", Some(&proxy_path));
                                // Pass the proxy-target through for the backend to handle
                                self.set_http_request_header("x-proxy-target", Some(&proxy_target));
                                info!("[Rust WASM Filter] Forwarding to backend proxy handler: {} with target: {}", proxy_path, proxy_target);
                            }
                        } else {
                            // No proxy target specified, let request continue as-is
                            info!("[Rust WASM Filter] No proxy target specified, continuing with original path: {}", path);
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
            self.call_type = CallType::None;
        }
    }
    
    fn handle_user_fetch_response(&mut self) {
        // Get response body from server
        let response_body = self.get_http_call_response_body(0, 8192);
        
        match response_body {
            Some(body) => {
                let body_str = String::from_utf8_lossy(&body);
                info!("[Rust WASM Filter] User fetch response received");
                
                // Parse user response from /auth/me ({ user: ... })
                match serde_json::from_str::<AuthMeResponse>(&body_str) {
                    Ok(user_response) => {
                        if !is_user_active(&user_response.user) {
                            warn!("[Rust WASM Filter] User is inactive");
                            self.send_forbidden_response("user account is inactive");
                            return;
                        }

                        info!("[Rust WASM Filter] User fetched and active, now checking challenge");
                        self.validate_challenge();
                    }
                    Err(e) => {
                        // Check if it's a 404 (user not found)
                        if body_str.contains("User not found") {
                            warn!("[Rust WASM Filter] User not found in database");
                            self.send_forbidden_response("user not found");
                        } else {
                            warn!("[Rust WASM Filter] Failed to parse user response: {}", e);
                            self.send_forbidden_response("internal error");
                        }
                    }
                }
            }
            None => {
                warn!("[Rust WASM Filter] No user fetch response body");
                self.send_forbidden_response("internal error");
            }
        }
        
        // Clear pending context
        self.pending_user_email = None;
        self.pending_user_call_id = None;
        self.call_type = CallType::None;
    }
    
    fn handle_user_cache_response(&mut self) {
        // Get response body from Redis
        let response_body = self.get_http_call_response_body(0, 8192);
        
        match response_body {
            Some(body) => {
                let body_str = String::from_utf8_lossy(&body);
                
                // If empty (user not in cache), fetch from server
                if body_str.trim().is_empty() {
                    info!("[Rust WASM Filter] User not in cache, fetching from server");
                    if self.is_auth_me_request {
                        self.fetch_auth_me_proxy();
                    } else {
                        self.fetch_user_from_server();
                    }
                } else {
                    // Parse cached user
                    match serde_json::from_str::<Value>(&body_str) {
                        Ok(user_value) => {
                            let cached_email = user_value.get("email")
                                .and_then(|value| value.as_str())
                                .unwrap_or("(unknown)");
                            info!("[Rust WASM Filter] User found in cache: {}", cached_email);

                            // Check if user is active
                            if !is_user_active(&user_value) {
                                warn!("[Rust WASM Filter] Cached user is inactive: {}", cached_email);
                                self.send_forbidden_response("user account is inactive");
                                return;
                            }

                            if self.is_auth_me_request {
                                info!("[Rust WASM Filter] Cached user is active, proxying /auth/me");
                                self.fetch_auth_me_proxy();
                                return;
                            }

                            // User is active, now check challenge
                            info!("[Rust WASM Filter] Cached user is active, now checking challenge");
                            self.validate_challenge();
                        }
                        Err(e) => {
                            warn!("[Rust WASM Filter] Failed to parse cached user: {}", e);
                            // Fallback: fetch from server
                            if self.is_auth_me_request {
                                self.fetch_auth_me_proxy();
                            } else {
                                self.fetch_user_from_server();
                            }
                        }
                    }
                }
            }
            None => {
                warn!("[Rust WASM Filter] No Redis cache response");
                // Fallback: fetch from server
                if self.is_auth_me_request {
                    self.fetch_auth_me_proxy();
                } else {
                    self.fetch_user_from_server();
                }
            }
        }
    }
    
    fn fetch_user_from_server(&mut self) {
        let cookie_header = match self.pending_cookie_header.clone() {
            Some(cookie) => cookie,
            None => {
                warn!("[Rust WASM Filter] Missing cookie header for /auth/me fetch");
                self.send_forbidden_response("missing access token");
                return;
            }
        };

        let headers = vec![
            (":method", "POST"),
            (":path", "/auth/me"),
            (":authority", "pzero-server"),
            ("cookie", &cookie_header),
        ];

        info!("[Rust WASM Filter] Fetching user from server via /auth/me");

        match self.dispatch_http_call(
            "server_cluster",
            headers,
            None,
            vec![],
            std::time::Duration::from_secs(5),
        ) {
            Ok(call_id) => {
                info!("[Rust WASM Filter] /auth/me fetch dispatched with call_id: {}", call_id);
                self.pending_user_call_id = Some(call_id);
                self.call_type = CallType::UserFetch;
            }
            Err(status) => {
                warn!("[Rust WASM Filter] Failed to fetch user via /auth/me: {:?}", status);
                self.send_forbidden_response("internal error");
            }
        }
    }

    fn fetch_auth_me_proxy(&mut self) {
        let cookie_header = match self.pending_cookie_header.clone() {
            Some(cookie) => cookie,
            None => {
                warn!("[Rust WASM Filter] Missing cookie header for /auth/me proxy");
                self.send_forbidden_response("missing access token");
                return;
            }
        };

        let headers = vec![
            (":method", "POST"),
            (":path", "/auth/me"),
            (":authority", "pzero-server"),
            ("cookie", &cookie_header),
        ];

        info!("[Rust WASM Filter] Proxying /auth/me to server");

        match self.dispatch_http_call(
            "server_cluster",
            headers,
            None,
            vec![],
            std::time::Duration::from_secs(5),
        ) {
            Ok(call_id) => {
                info!("[Rust WASM Filter] /auth/me proxy dispatched with call_id: {}", call_id);
                self.pending_user_call_id = Some(call_id);
                self.call_type = CallType::AuthMeProxy;
            }
            Err(status) => {
                warn!("[Rust WASM Filter] Failed to proxy /auth/me: {:?}", status);
                self.send_forbidden_response("internal error");
            }
        }
    }

    fn dispatch_auth_next(&mut self, challenge_id: &str) -> bool {
        let cookie_header = match self.pending_cookie_header.clone() {
            Some(cookie) => cookie,
            None => {
                warn!("[Rust WASM Filter] Missing cookie header for /auth/next");
                return false;
            }
        };

        if challenge_id.is_empty() {
            warn!("[Rust WASM Filter] Missing challenge id for /auth/next");
            return false;
        }

        let path = format!("/auth/next/{}", challenge_id);
        let headers = vec![
            (":method", "POST"),
            (":path", &path),
            (":authority", "pzero-server"),
            ("cookie", &cookie_header),
        ];

        info!("[Rust WASM Filter] Fetching next challenge via /auth/next: {}", challenge_id);

        match self.dispatch_http_call(
            "server_cluster",
            headers,
            None,
            vec![],
            std::time::Duration::from_secs(5),
        ) {
            Ok(call_id) => {
                info!("[Rust WASM Filter] /auth/next dispatched with call_id: {}", call_id);
                self.pending_next_call_id = Some(call_id);
                self.call_type = CallType::AuthNext;
                true
            }
            Err(status) => {
                warn!("[Rust WASM Filter] Failed to fetch next challenge: {:?}", status);
                false
            }
        }
    }
    
    fn validate_challenge(&mut self) {
        // Get challenge headers (already stored during initial request)
        let challenge_id = self.pending_challenge_id.clone().unwrap_or_default();
        let challenge_answer = self.pending_challenge_answer.clone().unwrap_or_default();
        
        // Validate challenge headers presence
        if challenge_id.is_empty() || challenge_answer.is_empty() {
            warn!("[Rust WASM Filter] Missing challenge headers");
            self.send_forbidden_response("missing challenge headers");
            return;
        }
        
        // Validate challenge format
        if !validate_challenge_format(&challenge_id, &challenge_answer) {
            warn!("[Rust WASM Filter] Invalid challenge format");
            self.send_forbidden_response("invalid challenge format");
            return;
        }
        
        // Query Redis for challenge validation
        info!("[Rust WASM Filter] Querying Redis for challenge: {}", challenge_id);
        
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
                info!("[Rust WASM Filter] Challenge query dispatched with call_id: {}", call_id);
                self.pending_call_id = Some(call_id);
                self.call_type = CallType::Challenge;
            }
            Err(status) => {
                warn!("[Rust WASM Filter] Failed to query Redis for challenge: {:?}", status);
                self.send_forbidden_response("challenge validation failed");
            }
        }
    }

    fn handle_auth_me_proxy_response(&mut self) {
        let response_body = self.get_http_call_response_body(0, 8192);
        let response_headers = self.get_http_call_response_headers();

        let status = response_headers
            .iter()
            .find(|(name, _)| *name == ":status")
            .and_then(|(_, value)| value.parse::<u16>().ok())
            .unwrap_or(200);

        let mut owned_headers: Vec<(String, String)> = Vec::new();
        if let Some(origin) = self.get_http_request_header("origin") {
            let allowed_origin = self.validate_cors_origin(&origin);
            if !allowed_origin.is_empty() {
                owned_headers.push(("access-control-allow-origin".to_string(), allowed_origin));
                owned_headers.push(("access-control-allow-credentials".to_string(), "true".to_string()));
            }
        }

        let mut content_type = "application/json".to_string();
        for (name, value) in &response_headers {
            if *name == "content-type" {
                content_type = value.to_string();
            }
            if *name == "x-challenge-id"
                || *name == "x-challenge-question"
                || *name == "x-challenge-params"
            {
                owned_headers.push((name.to_string(), value.to_string()));
            }
        }
        owned_headers.push(("content-type".to_string(), content_type));

        let headers: Vec<(&str, &str)> = owned_headers
            .iter()
            .map(|(name, value)| (name.as_str(), value.as_str()))
            .collect();
        let body = response_body.map(|b| b.to_vec()).unwrap_or_default();
        self.send_http_response(status.into(), headers, Some(&body));

        self.pending_user_call_id = None;
        self.pending_user_email = None;
        self.call_type = CallType::None;
    }

    fn handle_auth_next_response(&mut self) {
        let response_headers = self.get_http_call_response_headers();
        let challenge_id = response_headers
            .iter()
            .find(|(name, _)| *name == "x-challenge-id")
            .map(|(_, value)| value.to_string());
        let challenge_question = response_headers
            .iter()
            .find(|(name, _)| *name == "x-challenge-question")
            .map(|(_, value)| value.to_string());
        let challenge_params = response_headers
            .iter()
            .find(|(name, _)| *name == "x-challenge-params")
            .map(|(_, value)| value.to_string());

        if let (Some(id), Some(question), Some(params)) = (challenge_id, challenge_question, challenge_params) {
            self.pending_next_challenge_headers = Some(NextChallengeHeaders {
                challenge_id: id,
                challenge_question: question,
                challenge_params: params,
            });
        }

        self.pending_next_call_id = None;
        self.call_type = CallType::None;
        self.resume_http_request();
    }
}

impl ChallengeAuthzHttp {
    fn validate_cors_origin(&self, origin: &str) -> String {
        // If no allowed origins configured, reflect the origin (backward compatible)
        if self.config.allowed_origins.is_empty() {
            return origin.to_string();
        }
        
        // Check if origin is in the allowlist
        if self.config.allowed_origins.iter().any(|allowed| {
            allowed == origin || allowed == "*"
        }) {
            origin.to_string()
        } else {
            // Origin not allowed - return empty string to deny
            warn!("[Rust WASM Filter] CORS origin {} not in allowlist", origin);
            "".to_string()
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
            let allowed_origin = self.validate_cors_origin(&origin);
            
            // Only send CORS headers if origin is allowed
            if !allowed_origin.is_empty() {
                self.send_http_response(
                    204,
                    vec![
                        ("access-control-allow-origin", &allowed_origin),
                        ("access-control-allow-methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH"),
                        ("access-control-allow-headers", "content-type,x-challenge-id,x-challenge-answer,authorization,x-proxy-target"),
                        ("access-control-allow-credentials", "true"),
                    ],
                    None,
                );
            } else {
                // Origin not allowed, send 403
                self.send_http_response(
                    403,
                    vec![],
                    Some(b"CORS origin not allowed"),
                );
            }
            return Action::Pause;
        }

        let path_without_query = path.split('?').next().unwrap_or(&path);
        self.is_auth_me_request = path_without_query == "/auth/me";
        let is_auth_next_request = path_without_query.starts_with("/auth/next");

        // Check if route is public (auth/me is handled by the filter)
        info!("[Rust WASM Filter] Checking if public route: {} {}", method, path);
        if !self.is_auth_me_request && !is_auth_next_request && is_public_route(&path, &method) {
            info!("[Rust WASM Filter] Public route, bypassing all validation: {} {}", method, path);
            return Action::Continue;
        }
        info!("[Rust WASM Filter] Not a public route, checking auth and user: {} {}", method, path);

        // Extract and validate access token from cookie
        let cookie_header = self.get_http_request_header("cookie").unwrap_or_default();
        let access_token = extract_access_token(&cookie_header);
        self.pending_cookie_header = Some(cookie_header);
        
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
        
        // Decode JWT to get user email
        // TODO: CRITICAL SECURITY - JWT signature is NOT verified before extracting claims
        // This allows anyone to craft fake JWTs with any email/userId
        // Must implement HMAC-SHA256 signature verification with jwt_secret
        let email = match decode_jwt_claims(&access_token) {
            Some(claims) => {
                if let Some(email) = claims.email {
                    info!("[Rust WASM Filter] JWT email: {}", email);
                    email
                } else {
                    warn!("[Rust WASM Filter] JWT missing email claim");
                    self.send_forbidden_response("invalid JWT claims");
                    return Action::Pause;
                }
            }
            None => {
                warn!("[Rust WASM Filter] Failed to decode JWT");
                self.send_forbidden_response("invalid JWT");
                return Action::Pause;
            }
        };
        
        // Check user in Redis cache first
        self.pending_user_email = Some(email.clone());
        let redis_user_path = format!("/redis/get/user:{}", email);
        let user_headers = vec![
            (":method", "GET"),
            (":path", &redis_user_path),
            (":authority", "pzero-server"),
        ];
        
        info!("[Rust WASM Filter] Checking user cache for: {}", email);
        
        match self.dispatch_http_call(
            "server_cluster",
            user_headers,
            None,
            vec![],
            std::time::Duration::from_secs(5),
        ) {
            Ok(call_id) => {
                info!("[Rust WASM Filter] User cache check dispatched with call_id: {}", call_id);
                self.pending_user_call_id = Some(call_id);
                self.call_type = CallType::UserCache;
                
                if !self.is_auth_me_request {
                    // Store challenge data for later validation
                    self.pending_challenge_id = Some(self.get_http_request_header("x-challenge-id").unwrap_or_default());
                    self.pending_challenge_answer = Some(self.get_http_request_header("x-challenge-answer").unwrap_or_default());
                }
                
                // Pause until we validate user
                return Action::Pause;
            }
            Err(status) => {
                warn!("[Rust WASM Filter] Failed to check user cache: {:?}", status);
                self.send_forbidden_response("internal error");
                return Action::Pause;
            }
        }
        
        // Challenge validation is now handled after user validation in callbacks
    }

    fn on_http_response_headers(&mut self, _: usize, _: bool) -> Action {
        if let Some(next_headers) = self.pending_next_challenge_headers.take() {
            if self.get_http_response_header("x-challenge-id").is_none() {
                self.set_http_response_header("x-challenge-id", Some(&next_headers.challenge_id));
                self.set_http_response_header("x-challenge-question", Some(&next_headers.challenge_question));
                self.set_http_response_header("x-challenge-params", Some(&next_headers.challenge_params));
            }
        }
        Action::Continue
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

fn challenge_answer_matches(answer_value: &Value, provided: &str) -> bool {
    match answer_value {
        Value::String(s) => constant_time_compare(s.as_bytes(), provided.as_bytes()),
        Value::Number(n) => constant_time_compare(n.to_string().as_bytes(), provided.as_bytes()),
        Value::Bool(b) => constant_time_compare(b.to_string().as_bytes(), provided.as_bytes()),
        Value::Null => false,
        Value::Array(_) | Value::Object(_) => false,
    }
}

fn is_user_active(user_value: &Value) -> bool {
    if let Some(is_act) = user_value.get("is_act").and_then(|v| v.as_bool()) {
        return is_act;
    }
    if let Some(status) = user_value.get("status").and_then(|v| v.as_str()) {
        return status == "ACTIVE";
    }
    true
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

/// Decode JWT and extract claims
/// CRITICAL SECURITY WARNING: JWT signature is NOT verified
/// TODO: Implement proper JWT signature verification using HMAC-SHA256
/// This allows anyone to craft fake JWTs - DO NOT use in production without fixing!
/// 
/// Note: Standard JWT libraries like jsonwebtoken may not work in WASM environment
/// due to dependency on std::time and other unavailable features.
/// Options:
/// 1. Implement manual HMAC-SHA256 verification using sha2/hmac crates (if WASM compatible)
/// 2. Delegate JWT verification to the backend server (current user validation does this)
/// 3. Use a lightweight WASM-compatible JWT library
fn decode_jwt_claims(token: &str) -> Option<JwtClaims> {
    let parts: Vec<&str> = token.split('.').collect();
    if parts.len() != 3 {
        return None;
    }
    
    // Decode the payload (second part)
    let payload = parts.get(1)?;
    let decoded = general_purpose::URL_SAFE_NO_PAD.decode(payload).ok()?;
    let payload_str = String::from_utf8(decoded).ok()?;
    
    // Parse JSON
    serde_json::from_str(&payload_str).ok()
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
