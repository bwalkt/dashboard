package main

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"strconv"
	"time"

	"github.com/proxy-wasm/proxy-wasm-go-sdk/proxywasm"
)

const (
	redisCluster = "redis_cluster" // Redis cluster in Envoy config
	filterID     = "wasm-filter-1"  // Unique filter identifier
	jwtSecret    = "your-secret-key" // Should match server JWT_SECRET
)

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
	nonce := generateRandomNonce()
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

// generateRandomNonce generates a random nonce for security
func generateRandomNonce() string {
	// In WASM environment, use timestamp-based nonce
	return strconv.FormatInt(time.Now().UnixNano(), 36)
}

// ValidateChallengeViaRedis checks challenge using Redis
func ValidateChallengeViaRedis(challengeID, challengeAnswer string) error {
	requestID := "req_" + strconv.FormatInt(time.Now().UnixNano(), 36)
	
	// First check Redis cache directly
	cacheKey := RedisKeys.ChallengeCache + challengeID
	cachedAnswer, err := redisGet(cacheKey)
	if err == nil && cachedAnswer != "" {
		// Validate against cache
		if cachedAnswer == challengeAnswer {
			proxywasm.LogInfof("[Redis] Challenge validated from cache: %s", challengeID)
			// Cache in shared data for even faster access
			SetChallengeInSharedDataWithDefaultTTL(challengeID, challengeAnswer)
			proxywasm.ResumeHttpRequest()
			return nil
		} else {
			proxywasm.LogWarnf("[Redis] Challenge cache mismatch for: %s", challengeID)
			proxywasm.SendHttpResponse(403, nil, []byte("{\"error\":\"invalid challenge\"}"), -1)
			return nil
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
		return err
	}
	
	// Push to Redis queue
	err = redisLPush(RedisKeys.ChallengeQueue, string(requestJSON))
	if err != nil {
		proxywasm.LogErrorf("[Redis] Failed to queue challenge validation: %v", err)
		return err
	}
	
	proxywasm.LogInfof("[Redis] Challenge validation queued: %s (request: %s)", challengeID, requestID)
	
	// Poll for result (with timeout)
	go pollForChallengeResult(requestID, challengeID, challengeAnswer)
	
	return nil
}

// pollForChallengeResult polls Redis for validation result
func pollForChallengeResult(requestID, challengeID, challengeAnswer string) {
	resultKey := RedisKeys.ChallengeResults + requestID
	maxAttempts := 10 // Poll for up to 5 seconds (10 * 500ms)
	
	for attempt := 0; attempt < maxAttempts; attempt++ {
		// Wait before polling (except first attempt)
		if attempt > 0 {
			time.Sleep(500 * time.Millisecond)
		}
		
		result, err := redisGet(resultKey)
		if err != nil || result == "" {
			continue
		}
		
		// Parse result
		var response RedisFilterResponse
		if err := json.Unmarshal([]byte(result), &response); err != nil {
			proxywasm.LogErrorf("[Redis] Failed to parse result: %v", err)
			continue
		}
		
		// Handle result
		if response.Status == "success" {
			if data, ok := response.Data.(map[string]interface{}); ok {
				if valid, ok := data["valid"].(bool); ok && valid {
					proxywasm.LogInfof("[Redis] Challenge validated: %s", challengeID)
					// Cache for future use
					SetChallengeInSharedDataWithDefaultTTL(challengeID, challengeAnswer)
					proxywasm.ResumeHttpRequest()
					return
				}
			}
		}
		
		// Validation failed
		proxywasm.LogWarnf("[Redis] Challenge validation failed: %s - %s", challengeID, response.Error)
		proxywasm.SendHttpResponse(403, nil, []byte("{\"error\":\"invalid challenge\"}"), -1)
		return
	}
	
	// Timeout
	proxywasm.LogErrorf("[Redis] Challenge validation timeout for: %s", challengeID)
	proxywasm.SendHttpResponse(503, nil, []byte("{\"error\":\"validation timeout\"}"), -1)
}

// RegisterFilterInRedis registers the filter in Redis
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
	
	err = redisHSet(RedisKeys.FilterRegistry, filterID, string(registrationJSON))
	if err != nil {
		proxywasm.LogErrorf("[Redis] Failed to register filter: %v", err)
		return err
	}
	
	proxywasm.LogInfof("[Redis] Filter registered: %s", filterID)
	return nil
}

// SendHeartbeatToRedis sends heartbeat to maintain active status
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
	
	err = redisSetWithTTL(heartbeatKey, string(heartbeatJSON), 60) // 1 minute TTL
	if err != nil {
		proxywasm.LogWarnf("[Redis] Failed to send heartbeat: %v", err)
		return err
	}
	
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

func redisGet(key string) (string, error) {
	return makeRedisRequest("GET", key, "")
}

func redisSet(key, value string) error {
	_, err := makeRedisRequest("SET", key, value)
	return err
}

func redisSetWithTTL(key, value string, ttl int) error {
	_, err := makeRedisRequest("SETEX", key, value, ttl)
	return err
}

func redisHGet(key, field string) (string, error) {
	return makeRedisRequest("HGET", key+":"+field, "")
}

func redisHSet(key, field, value string) error {
	_, err := makeRedisRequest("HSET", key+":"+field, value)
	return err
}

func redisLPush(key, value string) error {
	_, err := makeRedisRequest("LPUSH", key, value)
	return err
}

// makeRedisRequest makes HTTP request to Redis proxy
func makeRedisRequest(command, key, value string, args ...interface{}) (string, error) {
	// Create Redis command request
	request := map[string]interface{}{
		"command": command,
		"key":     key,
		"value":   value,
		"token":   generateFilterToken(),
	}
	
	if len(args) > 0 {
		request["args"] = args
	}
	
	bodyJSON, err := json.Marshal(request)
	if err != nil {
		return "", err
	}
	
	// Headers for Redis proxy request
	headers := [][2]string{
		{":method", "POST"},
		{":path", "/redis-proxy"},
		{":authority", "server:8090"},
		{"content-type", "application/json"},
		{"x-filter-token", generateFilterToken()},
	}
	
	var result string
	_, err = proxywasm.DispatchHttpCall(
		"server_cluster",
		headers,
		bodyJSON,
		nil,
		1000, // 1 second timeout
		func(numHeaders, bodySize, numTrailers int) {
			body, err := proxywasm.GetHttpCallResponseBody(0, bodySize)
			if err == nil {
				var response map[string]interface{}
				if json.Unmarshal(body, &response) == nil {
					if val, ok := response["value"].(string); ok {
						result = val
					}
				}
			}
		},
	)
	
	return result, err
}

// getEnvoyNodeID gets the Envoy node ID
func getEnvoyNodeID() string {
	// In real implementation, get from Envoy context
	return "envoy-node-" + filterID
}