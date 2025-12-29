package main

import (
	"strings"
	
	"github.com/proxy-wasm/proxy-wasm-go-sdk/proxywasm"
	"github.com/proxy-wasm/proxy-wasm-go-sdk/proxywasm/types"
)

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

func (ctx *pluginContext) OnPluginStart(rootContextID int) types.OnPluginStartStatus {
	// Load configuration from plugin configuration
	config, err := proxywasm.GetPluginConfiguration()
	if err != nil {
		proxywasm.LogErrorf("[WASM Filter] Failed to get plugin configuration: %v", err)
		return types.OnPluginStartStatusFailed
	}
	
	// Parse configuration (assuming JSON format)
	configMap := make(map[string]string)
	if len(config) > 0 {
		// For simplicity, assuming key=value format separated by newlines
		// In production, you'd use proper JSON parsing
		lines := strings.Split(string(config), "\n")
		for _, line := range lines {
			if parts := strings.SplitN(strings.TrimSpace(line), "=", 2); len(parts) == 2 {
				configMap[parts[0]] = parts[1]
			}
		}
	}
	
	// Initialize configuration
	if err := InitConfig(configMap); err != nil {
		proxywasm.LogErrorf("[WASM Filter] Failed to initialize configuration: %v", err)
		return types.OnPluginStartStatusFailed
	}
	
	// Register filter in Redis
	if err := RegisterFilterInRedis(); err != nil {
		proxywasm.LogErrorf("[WASM Filter] Failed to register filter in Redis: %v", err)
		// Continue anyway, registration is not critical
	}
	
	// Send initial heartbeat
	if err := SendHeartbeatToRedis(); err != nil {
		proxywasm.LogWarnf("[WASM Filter] Failed to send initial heartbeat: %v", err)
	}
	
	proxywasm.LogInfof("[WASM Filter] Plugin started and registered with Redis")
	return types.OnPluginStartStatusOK
}

type httpContext struct {
	// Embed the default HTTP context
	types.DefaultHttpContext
	contextID           uint32
	challengeID         string
	challengeAnswer     string
	
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

	// Check if this is a public route - bypass validation
	if IsPublicRoute(path, method) {
		proxywasm.LogInfof("[WASM Filter] Public route, bypassing validation: %s %s", method, path)
		return types.ActionContinue
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
	err = ValidateChallengeViaRedis(challengeHeaders.ChallengeID, challengeHeaders.ChallengeAnswer)
	if err != nil {
		proxywasm.LogErrorf("[WASM Filter] Failed to validate via Redis: %v", err)
		proxywasm.SendHttpResponse(500, nil, []byte("{\"error\":\"validation service error\"}"), -1)
		return types.ActionPause
	}

	// Pause request processing until validation completes
	return types.ActionPause
}

// OnTick is called periodically when timer is set (for challenge validation polling)
func (ctx *httpContext) OnTick() {
	// Check if validation is complete
	if checkValidationResult() {
		// Validation completed (success or failure), stop timer
		proxywasm.SetTickPeriodMilliSeconds(0)
	}
}

// OnHttpCallResponse is not called when a callback is provided to DispatchHttpCall
// The response is handled in the callback function instead
