package main

import (
	"encoding/json"
	"strings"

	"github.com/proxy-wasm/proxy-wasm-go-sdk/proxywasm"
	"github.com/proxy-wasm/proxy-wasm-go-sdk/proxywasm/types"
)

// Allowed origins for CORS - validate against this list for security
var allowedOrigins = []string{
	"https://sfdc-example.incmix.com",
	"https://pzero-portal.incmix.com", 
	"https://app.incmix.com",
	"http://localhost:3000",
	"http://localhost:5173",
	"http://localhost:8080",
}

// isOriginAllowed checks if origin is in the allowlist
func isOriginAllowed(origin string) bool {
	// Check exact matches
	for _, allowed := range allowedOrigins {
		if origin == allowed {
			return true
		}
	}
	
	// Temporary: also allow any incmix.com subdomain for debugging
	if strings.HasSuffix(origin, ".incmix.com") {
		return true
	}
	
	return false
}

// getCORSHeaders returns CORS headers for the given origin if allowed
func getCORSHeaders(origin string) [][2]string {
	if origin == "" || !isOriginAllowed(origin) {
		return nil
	}
	return [][2]string{
		{"access-control-allow-origin", origin},
		{"access-control-allow-credentials", "true"},
		{"access-control-allow-methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH"},
		{"access-control-allow-headers", "Content-Type, Authorization, X-Requested-With, Accept, traceparent, x-client-type, x-auth-token, tracestate, X-Custom-Auth, x-grpc-web, x-grpc-web-accept-encoding, X-Custom-Header, X-Test-Eval, x-proxy-target-id, x-challenge-id, x-challenge-answer"},
		{"access-control-expose-headers", "Content-Range, X-Content-Range, X-Test-Eval"},
		{"access-control-max-age", "86400"},
	}
}

func main() {}
func init() {
	proxywasm.SetVMContext(&vmContext{})
}

type vmContext struct {
	// Embed the default VM context
	types.DefaultVMContext
}

func (*vmContext) NewPluginContext(contextID uint32) types.PluginContext {
	return &pluginContext{}
}

type pluginContext struct {
	// Embed the default plugin context
	types.DefaultPluginContext
}

func (*pluginContext) NewHttpContext(contextID uint32) types.HttpContext {
	return &httpContext{
		contextID: contextID,
	}
}

// parseKeyValueConfig parses key=value format configuration
func parseKeyValueConfig(configStr string, configMap map[string]string) {
	lines := strings.Split(configStr, "\n")
	for _, line := range lines {
		line = strings.TrimSpace(line)
		// Skip empty lines and comments
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		if parts := strings.SplitN(line, "=", 2); len(parts) == 2 {
			key := strings.TrimSpace(parts[0])
			value := strings.TrimSpace(parts[1])
			configMap[key] = value
			proxywasm.LogInfof("[WASM Filter] Config: %s = %s", key, value[:min(len(value), 20)]+"...")
		}
	}
}


func (ctx *pluginContext) OnPluginStart(pluginConfigurationSize int) types.OnPluginStartStatus {
	// Load configuration from plugin configuration
	config, err := proxywasm.GetPluginConfiguration()
	if err != nil {
		proxywasm.LogErrorf("[WASM Filter] Failed to get plugin configuration: %v", err)
		return types.OnPluginStartStatusFailed
	}

	// Parse configuration as JSON
	configMap := make(map[string]string)
	if len(config) > 0 {
		configStr := string(config)
		// Trim any whitespace/newlines
		configStr = strings.TrimSpace(configStr)
		
		// Check if it looks like JSON (starts with { or [)
		if strings.HasPrefix(configStr, "{") || strings.HasPrefix(configStr, "[") {
			// Try JSON parsing
			if err := json.Unmarshal([]byte(configStr), &configMap); err != nil {
				proxywasm.LogErrorf("[WASM Filter] Failed to parse config as JSON: %v", err)
				proxywasm.LogErrorf("[WASM Filter] Config starts with: %.50s", configStr)
				// Fail if JSON format is expected but parsing fails
				return types.OnPluginStartStatusFailed
			} else {
				proxywasm.LogInfof("[WASM Filter] Successfully parsed JSON configuration with %d keys", len(configMap))
			}
		} else {
			// Assume key=value format
			proxywasm.LogInfof("[WASM Filter] Using key=value format configuration")
			parseKeyValueConfig(configStr, configMap)
		}
	}

	// Initialize configuration
	if err := InitConfig(configMap); err != nil {
		proxywasm.LogErrorf("[WASM Filter] Failed to initialize configuration: %v", err)
		return types.OnPluginStartStatusFailed
	}

	// NOTE: Registration and heartbeat are deferred until first HTTP request
	// because DispatchHttpCall requires an HTTP context and cannot be called
	// from OnPluginStart. They will be called lazily in OnHttpRequestHeaders.

	proxywasm.LogInfof("[WASM Filter] Plugin started successfully (registration deferred to first request)")
	return types.OnPluginStartStatusOK
}

// OnTick is called periodically when timer is set (for challenge validation polling)
func (ctx *pluginContext) OnTick() {
	// Check if validation is complete
	if checkValidationResult() {
		// Validation completed (success or failure), stop timer
		proxywasm.SetTickPeriodMilliSeconds(0)
	}
}

type httpContext struct {
	// Embed the default HTTP context
	types.DefaultHttpContext
	contextID       uint32
	challengeID     string
	challengeAnswer string

	// Challenge validation state
	validationPending   bool
	validationRequestID string
	validationStartTime int64
	pollAttempts        int
}

// OnHttpRequestHeaders is called when request headers are received
func (ctx *httpContext) OnHttpRequestHeaders(numHeaders int, endOfStream bool) types.Action {
	// Get the request path
	path, err := proxywasm.GetHttpRequestHeader(":path")
	if err != nil {
		proxywasm.LogWarnf("Failed to get :path header: %v", err)
		path = "(unknown)"
	}

	// Get the request method
	method, err := proxywasm.GetHttpRequestHeader(":method")
	if err != nil {
		proxywasm.LogWarnf("Failed to get :method header: %v", err)
		method = "(unknown)"
	}

	proxywasm.LogInfof("[WASM Filter] Processing request: %s %s", method, path)

	// Handle CORS preflight requests
	if method == "OPTIONS" {
		// Get the Origin header
		origin, _ := proxywasm.GetHttpRequestHeader("origin")
		corsHeaders := getCORSHeaders(origin)
		if corsHeaders != nil {
			// Add content-type for preflight response
			corsHeaders = append(corsHeaders, [2]string{"content-type", "text/plain"})
			proxywasm.SendHttpResponse(204, corsHeaders, nil, -1)
			return types.ActionPause
		}
	}

	// Check if this is a public route - bypass validation
	if IsPublicRoute(path, method) {
		proxywasm.LogInfof("[WASM Filter] Public route, bypassing validation: %s %s", method, path)
		return types.ActionContinue
	}

	// Lazy registration: Register filter in Redis on first non-public request
	// This must be done from HTTP context, not plugin initialization
	// Only register for requests that need validation
	if !isFilterRegistered() {
		// Skip Redis registration due to HTTP client crashes in WASM environment
		// The WASM runtime crashes in proxy_on_http_call_response function
		// TODO: Fix WASM HTTP client runtime issue before re-enabling
		proxywasm.LogInfof("[WASM Filter] Skipping Redis registration (HTTP client crashes in WASM)")
		setFilterRegistered(true)
	}

	// Extract challenge headers
	challengeHeaders, err := ExtractChallengeHeaders()
	if err != nil {
		// Headers not present or error extracting
		proxywasm.LogWarnf("[WASM Filter] Missing challenge headers: %v", err)
		proxywasm.SendHttpResponse(403, nil, []byte("{\"error\":\"missing challenge headers\"}"), -1)
		return types.ActionPause
	}

	// Validate format
	if !challengeHeaders.ValidateFormat() {
		proxywasm.LogWarnf("[WASM Filter] Invalid challenge header format")
		proxywasm.SendHttpResponse(403, nil, []byte("{\"error\":\"invalid challenge format\"}"), -1)
		return types.ActionPause
	}

	// Check shared data first
	expectedAnswer, found := GetChallengeFromSharedData(challengeHeaders.ChallengeID)
	if found {
		// Validate against cached answer
		if ValidateAnswer(challengeHeaders.ChallengeAnswer, expectedAnswer) {
			proxywasm.LogInfof("[WASM Filter] Challenge validated from cache: %s", challengeHeaders.ChallengeID)
			return types.ActionContinue
		}
		// Answer mismatch
		proxywasm.LogWarnf("[WASM Filter] Challenge answer mismatch for: %s", challengeHeaders.ChallengeID)
		proxywasm.SendHttpResponse(403, nil, []byte("{\"error\":\"invalid challenge answer\"}"), -1)
		return types.ActionPause
	}

	// Not found in cache, validate via Redis
	// Store challenge headers in context for callback
	ctx.challengeID = challengeHeaders.ChallengeID
	ctx.challengeAnswer = challengeHeaders.ChallengeAnswer

	proxywasm.LogInfof("[WASM Filter] Challenge not in cache, validating via Redis: %s", challengeHeaders.ChallengeID)
	_, err = ValidateChallengeViaRedis(challengeHeaders.ChallengeID, challengeHeaders.ChallengeAnswer)
	if err != nil {
		proxywasm.LogErrorf("[WASM Filter] Failed to validate via Redis: %v", err)
		proxywasm.SendHttpResponse(500, nil, []byte("{\"error\":\"validation service error\"}"), -1)
		return types.ActionPause
	}

	// Async validation queued, pause request processing
	proxywasm.LogInfof("[WASM Filter] Async validation queued - pausing request")
	return types.ActionPause
}

// OnHttpResponseHeaders is called when response headers are received
func (ctx *httpContext) OnHttpResponseHeaders(numHeaders int, endOfStream bool) types.Action {
	// Add CORS headers to all responses from allowed origins
	origin, _ := proxywasm.GetHttpRequestHeader("origin")
	corsHeaders := getCORSHeaders(origin)
	if corsHeaders != nil {
		// Set CORS headers for cross-origin requests from allowed origins
		for _, header := range corsHeaders {
			proxywasm.AddHttpResponseHeader(header[0], header[1])
		}
	}
	return types.ActionContinue
}

// OnHttpCallResponse handles responses from HTTP callouts (when callback is nil)
func (ctx *httpContext) OnHttpCallResponse(calloutID uint32, numHeaders int, bodySize int, numTrailers int) types.Action {
	// Delegate to the handler function that was previously being called directly
	handleRedisResponseWithID(calloutID, numHeaders, bodySize, numTrailers)
	return types.ActionContinue
}
