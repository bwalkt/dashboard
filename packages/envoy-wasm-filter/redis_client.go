package main

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"strconv"
	"time"

	"github.com/proxy-wasm/proxy-wasm-go-sdk/proxywasm"
)

const (
	redisCluster = "redis_cluster" // Redis cluster in Envoy config
	filterID     = "wasm-filter-1"  // Unique filter identifier
)

var (
	jwtSecret string // Loaded from configuration, should match server JWT_SECRET
	
	// Challenge validation state (WASM-compatible, no goroutines)
	validationState struct {
		pending     bool
		requestID   string
		challengeID string
		answer      string
		startTime   int64
		attempts    int
	}
	
	// Redis operation state for async callbacks
	redisOperationState struct {
		pending        bool
		operationType  string // "header_info", "challenge", etc.
		requestContext map[string]interface{} // Store context for callback
	}
)

// InitRedisConfig initializes Redis-related configuration
func InitRedisConfig(config map[string]string) error {
	jwtSecret = config["jwt_secret"]
	
	if jwtSecret == "" {
		proxywasm.LogCriticalf("[Redis Client] Missing required configuration: jwt_secret")
		return fmt.Errorf("jwt_secret is required for Redis authentication")
	}
	
	proxywasm.LogInfof("[Redis Client] Configuration initialized successfully")
	return nil
}

// Redis keys matching server implementation
var RedisKeys = struct {
	ChallengeQueue    string
	ChallengeResults  string
	ChallengeCache    string
	HeaderInfo        string
	FilterRegistry    string
	FilterHeartbeat   string
	RequestQueue      string
	ResponseQueue     string
}{
	ChallengeQueue:    "filter:challenge:queue",
	ChallengeResults:  "filter:challenge:results:",
	ChallengeCache:    "filter:challenge:cache:",
	HeaderInfo:        "filter:header:info",
	FilterRegistry:    "filter:registry",
	FilterHeartbeat:   "filter:heartbeat:",
	RequestQueue:      "filter:request:queue:",
	ResponseQueue:     "filter:response:queue:",
}

// RedisFilterRequest represents a request to Redis
type RedisFilterRequest struct {
	RequestID string      `json:"requestId"`
	FilterID  string      `json:"filterId"`
	Timestamp int64       `json:"timestamp"`
	Type      string      `json:"type"`
	Payload   interface{} `json:"payload"`
}

// RedisFilterResponse represents a response from Redis
type RedisFilterResponse struct {
	RequestID string      `json:"requestId"`
	Timestamp int64       `json:"timestamp"`
	Status    string      `json:"status"`
	Data      interface{} `json:"data,omitempty"`
	Error     string      `json:"error,omitempty"`
}

// FilterToken for authentication
type FilterToken struct {
	FilterID  string `json:"filterId"`
	Timestamp int64  `json:"timestamp"`
	Nonce     string `json:"nonce"`
	Signature string `json:"signature"`
}

// generateFilterToken creates an authentication token
func generateFilterToken() string {
	timestamp := time.Now().UnixMilli()
	nonce := generateNonce()
	data := filterID + ":" + strconv.FormatInt(timestamp, 10) + ":" + nonce
	
	h := hmac.New(sha256.New, []byte(jwtSecret))
	h.Write([]byte(data))
	signature := hex.EncodeToString(h.Sum(nil))
	
	token := FilterToken{
		FilterID:  filterID,
		Timestamp: timestamp,
		Nonce:     nonce,
		Signature: signature,
	}
	
	tokenJSON, _ := json.Marshal(token)
	return base64.StdEncoding.EncodeToString(tokenJSON)
}

// Note: Using secure generateNonce() function from centrifugo_client.go
// which provides cryptographic randomness with timestamp fallback

// ValidateChallengeViaRedis checks challenge using Redis
// Returns (cacheHit, error) - if cacheHit is true, validation is complete and no pause needed
func ValidateChallengeViaRedis(challengeID, challengeAnswer string) (bool, error) {
	requestID := "req_" + generateNonce()
	
	// First check Redis cache directly
	cacheKey := RedisKeys.ChallengeCache + challengeID
	cachedAnswer, err := redisGet(cacheKey)
	if err == nil && cachedAnswer != "" {
		// Validate against cache
		if cachedAnswer == challengeAnswer {
			proxywasm.LogInfof("[Redis] Challenge validated from cache: %s", challengeID)
			// Cache in shared data for even faster access
			SetChallengeInSharedDataWithDefaultTTL(challengeID, challengeAnswer)
			// Return cache hit = true, validation is complete
			return true, nil
		} else {
			proxywasm.LogWarnf("[Redis] Challenge cache mismatch for: %s", challengeID)
			proxywasm.SendHttpResponse(403, nil, []byte("{\"error\":\"invalid challenge\"}"), -1)
			// Return cache hit = true, but validation failed (response already sent)
			return true, nil
		}
	}
	
	// Queue validation request
	request := RedisFilterRequest{
		RequestID: requestID,
		FilterID:  filterID,
		Timestamp: time.Now().UnixMilli(),
		Type:      "challenge_validation",
		Payload: map[string]string{
			"challengeId":     challengeID,
			"challengeAnswer": challengeAnswer,
		},
	}
	
	requestJSON, err := json.Marshal(request)
	if err != nil {
		proxywasm.LogErrorf("[Redis] Failed to marshal request: %v", err)
		return false, err
	}
	
	// Push to Redis queue
	err = redisLPush(RedisKeys.ChallengeQueue, string(requestJSON))
	if err != nil {
		proxywasm.LogErrorf("[Redis] Failed to queue challenge validation: %v", err)
		return false, err
	}
	
	proxywasm.LogInfof("[Redis] Challenge validation queued: %s (request: %s)", challengeID, requestID)
	
	// Store validation state for timer-based polling (no goroutines in WASM)
	setValidationState(requestID, challengeID, challengeAnswer)
	
	// Start timer for polling (WASM-compatible)
	proxywasm.SetTickPeriodMilliSeconds(500) // Poll every 500ms
	
	// Return cache hit = false, async validation in progress
	return false, nil
}

// setValidationState stores validation state for timer-based polling
func setValidationState(requestID, challengeID, answer string) {
	validationState.pending = true
	validationState.requestID = requestID
	validationState.challengeID = challengeID
	validationState.answer = answer
	validationState.startTime = time.Now().Unix()
	validationState.attempts = 0
}

// clearValidationState clears the validation state
func clearValidationState() {
	validationState.pending = false
	validationState.requestID = ""
	validationState.challengeID = ""
	validationState.answer = ""
	validationState.startTime = 0
	validationState.attempts = 0
}

// checkValidationResult checks for validation result (called by timer)
func checkValidationResult() bool {
	if !validationState.pending {
		return false
	}
	
	validationState.attempts++
	maxAttempts := 10 // 5 seconds max (10 * 500ms)
	
	// Check timeout
	elapsed := time.Now().Unix() - validationState.startTime
	if elapsed > 5 || validationState.attempts > maxAttempts {
		proxywasm.LogErrorf("[Redis] Challenge validation timeout for: %s", validationState.challengeID)
		proxywasm.SendHttpResponse(503, nil, []byte("{\"error\":\"validation timeout\"}"), -1)
		clearValidationState()
		return true // Stop polling
	}
	
	// Check Redis for result
	resultKey := RedisKeys.ChallengeResults + validationState.requestID
	result, err := redisGet(resultKey)
	if err != nil || result == "" {
		return false // Continue polling
	}
	
	// Parse result
	var response RedisFilterResponse
	if err := json.Unmarshal([]byte(result), &response); err != nil {
		proxywasm.LogErrorf("[Redis] Failed to parse result: %v", err)
		return false // Continue polling
	}
	
	// Handle result
	if response.Status == "success" {
		if data, ok := response.Data.(map[string]interface{}); ok {
			if valid, ok := data["valid"].(bool); ok && valid {
				proxywasm.LogInfof("[Redis] Challenge validated: %s", validationState.challengeID)
				// Cache for future use
				SetChallengeInSharedDataWithDefaultTTL(validationState.challengeID, validationState.answer)
				clearValidationState()
				proxywasm.ResumeHttpRequest()
				return true // Stop polling
			}
		}
	}
	
	// Validation failed
	proxywasm.LogWarnf("[Redis] Challenge validation failed: %s - %s", validationState.challengeID, response.Error)
	proxywasm.SendHttpResponse(403, nil, []byte("{\"error\":\"invalid challenge\"}"), -1)
	clearValidationState()
	return true // Stop polling
}

/* 
DEPRECATED: pollForChallengeResult - Goroutine-based polling doesn't work in TinyGo WASM
This function used goroutines with time.Sleep which is unreliable in the WASM environment.
Replaced with timer-based polling using OnTick callback and checkValidationResult().

Original issue: Goroutines don't execute reliably in TinyGo WASM, causing validation failures.
New approach: Use proxywasm.SetTickPeriod() with OnTick() callback for WASM-compatible polling.
*/

/*
func pollForChallengeResult(requestID, challengeID, challengeAnswer string) {
	// This goroutine-based approach is unreliable in TinyGo WASM environment
	// Use timer-based approach instead
}
*/

// RegisterFilterInRedis registers the filter in Redis
// Note: This function uses async Redis calls but is intended for initialization only
func RegisterFilterInRedis() error {
	registration := map[string]interface{}{
		"filterId":      filterID,
		"envoyNodeId":   getEnvoyNodeID(),
		"registeredAt":  time.Now().UnixMilli(),
		"lastHeartbeat": time.Now().UnixMilli(),
		"status":        "active",
	}
	
	registrationJSON, err := json.Marshal(registration)
	if err != nil {
		return err
	}
	
	// Use async version for WASM compatibility
	// Note: Since this is called during initialization, we don't wait for callback
	context := map[string]interface{}{
		"operation": "filter_registration",
		"filterId":  filterID,
	}
	
	err = redisHSetAsync(RedisKeys.FilterRegistry, filterID, string(registrationJSON), "filter_registration", context)
	if err != nil {
		proxywasm.LogErrorf("[Redis] Failed to initiate filter registration: %v", err)
		return err
	}
	
	proxywasm.LogInfof("[Redis] Filter registration initiated: %s", filterID)
	return nil
}

// SendHeartbeatToRedis sends heartbeat to maintain active status
// Note: This function uses async Redis calls but is intended for periodic updates
func SendHeartbeatToRedis() error {
	heartbeatKey := RedisKeys.FilterHeartbeat + filterID
	heartbeatData := map[string]interface{}{
		"timestamp": time.Now().UnixMilli(),
		"metrics": map[string]interface{}{
			"requestsProcessed": 0, // Would track actual metrics
		},
	}
	
	heartbeatJSON, err := json.Marshal(heartbeatData)
	if err != nil {
		return err
	}
	
	// Use async version for WASM compatibility
	// Note: Since this is called periodically, we don't wait for callback
	context := map[string]interface{}{
		"operation": "heartbeat_update",
		"filterId":  filterID,
	}
	
	err = redisSetWithTTLAsync(heartbeatKey, string(heartbeatJSON), "heartbeat_update", 60, context) // 1 minute TTL
	if err != nil {
		proxywasm.LogWarnf("[Redis] Failed to initiate heartbeat: %v", err)
		return err
	}
	
	proxywasm.LogDebugf("[Redis] Heartbeat initiated for: %s", filterID)
	return nil
}

// GetHeaderInfoFromRedis retrieves header info from Redis
func GetHeaderInfoFromRedis() (map[string]interface{}, error) {
	// Get all fields from header info hash
	users, _ := redisHGet(RedisKeys.HeaderInfo, "users")
	endpoints, _ := redisHGet(RedisKeys.HeaderInfo, "endpoints")
	functions, _ := redisHGet(RedisKeys.HeaderInfo, "functions")
	
	headerInfo := make(map[string]interface{})
	
	if users != "" {
		var userData interface{}
		json.Unmarshal([]byte(users), &userData)
		headerInfo["active_users"] = userData
	}
	
	if endpoints != "" {
		var endpointData interface{}
		json.Unmarshal([]byte(endpoints), &endpointData)
		headerInfo["active_endpoints"] = endpointData
	}
	
	if functions != "" {
		var functionData interface{}
		json.Unmarshal([]byte(functions), &functionData)
		headerInfo["next_functions"] = functionData
	}
	
	return headerInfo, nil
}

// Redis operations via HTTP (since direct Redis connection isn't available in WASM)
// These make HTTP requests to a Redis proxy endpoint

// Async Redis operations using proper callback pattern

func redisGetAsync(key, operationType string, context map[string]interface{}) error {
	return makeRedisRequestAsync("GET", key, "", operationType, context)
}

func redisSetAsync(key, value, operationType string, context map[string]interface{}) error {
	return makeRedisRequestAsync("SET", key, value, operationType, context)
}

func redisSetWithTTLAsync(key, value, operationType string, ttl int, context map[string]interface{}) error {
	return makeRedisRequestAsync("SETEX", key, value, operationType, context, ttl)
}

func redisLPushAsync(key, value, operationType string, context map[string]interface{}) error {
	return makeRedisRequestAsync("LPUSH", key, value, operationType, context)
}

func redisHGetAsync(key, field, operationType string, context map[string]interface{}) error {
	return makeRedisHashRequestAsync("HGET", key, field, "", operationType, context)
}

func redisHSetAsync(key, field, value, operationType string, context map[string]interface{}) error {
	return makeRedisHashRequestAsync("HSET", key, field, value, operationType, context)
}

// Legacy synchronous functions (deprecated - use async versions)
func redisGet(key string) (string, error) {
	return "", fmt.Errorf("synchronous GET not supported in WASM - use redisGetAsync")
}

func redisSet(key, value string) error {
	return fmt.Errorf("synchronous SET not supported in WASM - use redisSetAsync")
}

func redisSetWithTTL(key, value string, ttl int) error {
	return fmt.Errorf("synchronous SETEX not supported in WASM - use redisSetWithTTLAsync")
}

func redisHGet(key, field string) (string, error) {
	return "", fmt.Errorf("synchronous HGET not supported in WASM - use redisHGetAsync")
}

func redisHSet(key, field, value string) error {
	return fmt.Errorf("synchronous HSET not supported in WASM - use redisHSetAsync")
}

func redisLPush(key, value string) error {
	return fmt.Errorf("synchronous LPUSH not supported in WASM - use redisLPushAsync")
}

// makeRedisRequest makes HTTP request to Redis proxy
// makeRedisHashRequestAsync handles Redis hash operations with proper async callback pattern
func makeRedisHashRequestAsync(command, key, field, value, operationType string, context map[string]interface{}) error {
	// Create Redis hash command request with proper field parameter
	token := generateFilterToken() // Generate once to avoid token mismatch
	
	request := map[string]interface{}{
		"command": command,
		"key":     key,
		"field":   field, // Separate field for hash operations
		"value":   value,
		"token":   token,
	}
	
	bodyJSON, err := json.Marshal(request)
	if err != nil {
		return err
	}
	
	// Headers for Redis proxy request
	headers := [][2]string{
		{":method", "POST"},
		{":path", "/redis-proxy"},
		{":authority", "server:8090"},
		{"content-type", "application/json"},
		{"x-filter-token", token}, // Use same token
	}
	
	// Store state for callback handling
	redisOperationState.pending = true
	redisOperationState.operationType = operationType
	redisOperationState.requestContext = context
	
	// Proper async pattern: callback handles response and resumes processing
	_, err = proxywasm.DispatchHttpCall(
		"server_cluster",
		headers,
		bodyJSON,
		nil,
		1000,
		func(numHeaders, bodySize, numTrailers int) {
			handleRedisResponse(numHeaders, bodySize, numTrailers)
		},
	)
	
	return err
}

// handleRedisResponse processes Redis operation responses and resumes request processing
func handleRedisResponse(numHeaders, bodySize, numTrailers int) {
	if !redisOperationState.pending {
		proxywasm.LogWarnf("[Redis] Unexpected callback - no pending operation")
		return
	}
	
	// Get response body
	body, err := proxywasm.GetHttpCallResponseBody(0, bodySize)
	if err != nil {
		proxywasm.LogErrorf("[Redis] Failed to get response body: %v", err)
		handleRedisError("Failed to get response body")
		return
	}
	
	// Parse response
	var response map[string]interface{}
	if err := json.Unmarshal(body, &response); err != nil {
		proxywasm.LogErrorf("[Redis] Failed to parse response: %v", err)
		handleRedisError("Failed to parse response")
		return
	}
	
	// Handle different operation types
	switch redisOperationState.operationType {
	case "header_info":
		handleRedisHeaderInfoResponse(response)
	case "challenge_write":
		handleRedisChallengeWriteResponse(response)
	default:
		proxywasm.LogWarnf("[Redis] Unknown operation type: %s", redisOperationState.operationType)
		clearRedisOperationState()
		proxywasm.ResumeHttpRequest()
	}
}

// handleRedisHeaderInfoResponse processes header info retrieval responses
func handleRedisHeaderInfoResponse(response map[string]interface{}) {
	defer clearRedisOperationState()
	
	if value, ok := response["value"].(string); ok && value != "" {
		// Store result in shared data for retrieval
		if err := proxywasm.SetSharedData("redis_result", []byte(value), 0); err != nil {
			proxywasm.LogErrorf("[Redis] Failed to store result in shared data: %v", err)
		}
		proxywasm.LogInfof("[Redis] Header info retrieved successfully")
	} else {
		proxywasm.LogWarnf("[Redis] No value returned from header info request")
	}
	
	// Resume request processing
	proxywasm.ResumeHttpRequest()
}

// handleRedisChallengeWriteResponse processes challenge write operation responses
func handleRedisChallengeWriteResponse(response map[string]interface{}) {
	defer clearRedisOperationState()
	
	if status, ok := response["status"].(string); ok && status == "OK" {
		proxywasm.LogInfof("[Redis] Challenge write operation completed successfully")
	} else {
		proxywasm.LogWarnf("[Redis] Challenge write operation may have failed")
	}
	
	// For write operations, we don't need to resume request processing
	// The request continues normally
}

// handleRedisError handles Redis operation errors
func handleRedisError(errorMsg string) {
	proxywasm.LogErrorf("[Redis] Operation failed: %s", errorMsg)
	clearRedisOperationState()
	
	// For operations that need to resume requests, send error response
	if redisOperationState.operationType == "header_info" {
		proxywasm.SendHttpResponse(500, nil, []byte("{\"error\":\"Redis operation failed\"}"), -1)
	} else {
		// For other operations, resume normally
		proxywasm.ResumeHttpRequest()
	}
}

// clearRedisOperationState clears the Redis operation state
func clearRedisOperationState() {
	redisOperationState.pending = false
	redisOperationState.operationType = ""
	redisOperationState.requestContext = nil
}

// makeRedisRequestAsync initiates async Redis operation with proper callback handling
func makeRedisRequestAsync(command, key, value, operationType string, context map[string]interface{}, args ...interface{}) error {
	// Create Redis command request
	token := generateFilterToken() // Generate once to avoid token mismatch
	
	request := map[string]interface{}{
		"command": command,
		"key":     key,
		"value":   value,
		"token":   token,
	}
	
	if len(args) > 0 {
		request["args"] = args
	}
	
	bodyJSON, err := json.Marshal(request)
	if err != nil {
		return err
	}
	
	// Headers for Redis proxy request
	headers := [][2]string{
		{":method", "POST"},
		{":path", "/redis-proxy"},
		{":authority", "server:8090"},
		{"content-type", "application/json"},
		{"x-filter-token", token}, // Use same token
	}
	
	// Store state for callback handling
	redisOperationState.pending = true
	redisOperationState.operationType = operationType
	redisOperationState.requestContext = context
	
	// Proper async pattern: callback handles response and resumes processing
	_, err = proxywasm.DispatchHttpCall(
		"server_cluster",
		headers,
		bodyJSON,
		nil,
		1000, // 1 second timeout
		func(numHeaders, bodySize, numTrailers int) {
			handleRedisResponse(numHeaders, bodySize, numTrailers)
		},
	)
	
	return err
}

// Legacy synchronous function (deprecated)
func makeRedisRequest(command, key, value string, args ...interface{}) (string, error) {
	return "", fmt.Errorf("synchronous Redis operations not supported in WASM - use makeRedisRequestAsync")
}

// getEnvoyNodeID gets the Envoy node ID from Envoy context
func getEnvoyNodeID() string {
	// Try to retrieve actual Envoy node ID from context
	if nodeID, err := proxywasm.GetProperty([]string{"node", "id"}); err == nil && len(nodeID) > 0 {
		return string(nodeID)
	}
	
	// Fallback: try cluster name as a reasonable alternative
	if cluster, err := proxywasm.GetProperty([]string{"node", "cluster"}); err == nil && len(cluster) > 0 {
		return "cluster-" + string(cluster)
	}
	
	// Final fallback: use filter ID if Envoy context is unavailable
	return "envoy-node-" + filterID
}