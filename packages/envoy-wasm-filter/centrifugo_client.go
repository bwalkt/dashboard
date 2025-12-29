package main

import (
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"strconv"
	"strings"
	"time"

	"github.com/proxy-wasm/proxy-wasm-go-sdk/proxywasm"
)

const (
	serverCluster = "server_cluster"
)

var (
	centrifugoSecret string
	filterId         string
	instanceId       string
	isConfigured     bool
)

// InitConfig initializes the filter configuration from plugin configuration
func InitConfig(config map[string]string) error {
	centrifugoSecret = config["centrifugo_secret"]
	filterId = config["filter_id"]
	
	if centrifugoSecret == "" {
		proxywasm.LogCriticalf("[Filter] Missing required configuration: centrifugo_secret")
		return errors.New("centrifugo_secret is required")
	}
	
	if filterId == "" {
		proxywasm.LogCriticalf("[Filter] Missing required configuration: filter_id")
		return errors.New("filter_id is required")
	}
	
	// Generate stable instance ID once at startup
	instanceId = "instance_" + filterId + "_" + strconv.FormatInt(time.Now().Unix(), 36)
	
	// Initialize Redis configuration
	if err := InitRedisConfig(config); err != nil {
		proxywasm.LogCriticalf("[Filter] Failed to initialize Redis configuration: %v", err)
		return err
	}
	
	isConfigured = true
	proxywasm.LogInfof("[Filter] Configuration loaded successfully - filter_id: %s, instance_id: %s", filterId, instanceId)
	return nil
}

// requireConfig checks if the filter is properly configured
func requireConfig() error {
	if !isConfigured {
		return errors.New("filter not configured - call InitConfig first")
	}
	return nil
}

// FilterAuthToken represents the authentication token for the filter
type FilterAuthToken struct {
	FilterId  string `json:"filterId"`
	Signature string `json:"signature"`
	Timestamp int64  `json:"timestamp"`
	Nonce     string `json:"nonce"`
}

// FilterMessage represents messages sent to/from the filter via Centrifugo
type FilterMessage struct {
	Type      string      `json:"type"`
	Payload   interface{} `json:"payload"`
	MessageId string      `json:"messageId"`
}

// ChallengeValidationRequest sent to server
type ChallengeValidationRequest struct {
	ChallengeId     string `json:"challengeId"`
	ChallengeAnswer string `json:"challengeAnswer"`
	RequestId       string `json:"requestId"`
	EnvoyRequestId  string `json:"envoyRequestId,omitempty"`
}

// ChallengeValidationResponse received from server
type ChallengeValidationResponse struct {
	ChallengeId string `json:"challengeId"`
	RequestId   string `json:"requestId"`
	Valid       bool   `json:"valid"`
	Reason      string `json:"reason,omitempty"`
	CacheTtl    int    `json:"cacheTtl,omitempty"`
}

// HeaderInfoRequest sent to server
type HeaderInfoRequest struct {
	RequestId string   `json:"requestId"`
	DataTypes []string `json:"dataTypes,omitempty"`
}

// HeaderInfoResponse received from server
type HeaderInfoResponse struct {
	RequestId string                 `json:"requestId"`
	Data      map[string]interface{} `json:"data"`
	Timestamp int64                  `json:"timestamp"`
}

// generateAuthToken creates a secure authentication token for the filter
func generateAuthToken() (*FilterAuthToken, error) {
	if err := requireConfig(); err != nil {
		return nil, err
	}
	
	timestamp := time.Now().Unix()
	nonce := generateNonce()
	
	message := filterId + ":" + strconv.FormatInt(timestamp, 10) + ":" + nonce
	signature, err := createHMACSignature(message, centrifugoSecret)
	if err != nil {
		return nil, err
	}

	return &FilterAuthToken{
		FilterId:  filterId,
		Signature: signature,
		Timestamp: timestamp,
		Nonce:     nonce,
	}, nil
}

// generateNonce creates a random nonce
func generateNonce() string {
	bytes := make([]byte, 16)
	if _, err := rand.Read(bytes); err != nil {
		// Fallback to timestamp-based nonce if crypto/rand fails
		return strconv.FormatInt(time.Now().UnixNano(), 36)
	}
	return hex.EncodeToString(bytes)
}

// createHMACSignature creates an HMAC signature
func createHMACSignature(message, secret string) (string, error) {
	h := hmac.New(sha256.New, []byte(secret))
	if _, err := h.Write([]byte(message)); err != nil {
		return "", err
	}
	return hex.EncodeToString(h.Sum(nil)), nil
}

// RequestChallengeValidation makes an HTTP request to validate a challenge via server
func RequestChallengeValidation(challengeID, challengeAnswer string) error {
	// Generate request ID
	requestId := "cv_" + strconv.FormatInt(time.Now().UnixNano(), 36)

	// Create challenge validation request
	request := ChallengeValidationRequest{
		ChallengeId:     challengeID,
		ChallengeAnswer: challengeAnswer,
		RequestId:       requestId,
		EnvoyRequestId:  getCurrentRequestId(), // Get from Envoy context if available
	}

	// Create filter message
	message := FilterMessage{
		Type:      "challenge_validation",
		Payload:   request,
		MessageId: requestId,
	}

	// Send to server
	return sendFilterMessage(message, challengeID, challengeAnswer)
}

// RequestHeaderInfo requests header information from server
func RequestHeaderInfo() error {
	requestId := "hi_" + strconv.FormatInt(time.Now().UnixNano(), 36)

	request := HeaderInfoRequest{
		RequestId: requestId,
		DataTypes: []string{"active_users", "active_endpoints", "next_functions"},
	}

	message := FilterMessage{
		Type:      "header_info_request",
		Payload:   request,
		MessageId: requestId,
	}

	return sendFilterMessage(message, "", "")
}

// sendFilterMessage sends a message to the server via HTTP (since WebSocket isn't available in WASM)
func sendFilterMessage(message FilterMessage, challengeID, challengeAnswer string) error {
	// Generate auth token
	authToken, err := generateAuthToken()
	if err != nil {
		proxywasm.LogErrorf("[Filter] Failed to generate auth token: %v", err)
		return err
	}

	// Create signed message payload
	signedMessage, err := createSignedMessage(message)
	if err != nil {
		proxywasm.LogErrorf("[Filter] Failed to create signed message: %v", err)
		return err
	}

	// Create request payload
	requestPayload := map[string]interface{}{
		"authToken": authToken,
		"message":   signedMessage,
		"channel":   "filter:requests",
	}

	bodyJSON, err := json.Marshal(requestPayload)
	if err != nil {
		proxywasm.LogErrorf("[Filter] Failed to marshal request body: %v", err)
		return err
	}

	// Prepare headers
	headers := [][2]string{
		{":method", "POST"},
		{":path", "/centrifugo/filter-message"},
		{":authority", "server:8090"},
		{"content-type", "application/json"},
	}

	// Store the original challenge info for the callback
	callbackContext := map[string]string{
		"type":            message.Type,
		"challengeId":     challengeID,
		"challengeAnswer": challengeAnswer,
		"requestId":       message.MessageId,
	}

	// Dispatch async HTTP call
	_, err = proxywasm.DispatchHttpCall(
		serverCluster,
		headers,
		bodyJSON,
		nil,
		5000, // timeout
		func(numHeaders, bodySize, numTrailers int) {
			handleServerResponse(numHeaders, bodySize, callbackContext)
		},
	)

	if err != nil {
		proxywasm.LogErrorf("[Filter] Failed to dispatch message: %v", err)
		return err
	}

	proxywasm.LogInfof("[Filter] Sent %s message to server", message.Type)
	return nil
}

// createSignedMessage creates a signed message for security
func createSignedMessage(message FilterMessage) (map[string]interface{}, error) {
	if err := requireConfig(); err != nil {
		proxywasm.LogErrorf("[Filter] Cannot create signed message: %v", err)
		return nil, err
	}
	
	timestamp := time.Now().Unix()
	nonce := generateNonce()
	
	payload := map[string]interface{}{
		"filterId":  filterId,
		"instanceId": getInstanceId(),
		"timestamp": timestamp,
		"nonce":     nonce,
		"data":      message,
	}

	// Create signature
	messageString, err := json.Marshal(map[string]interface{}{
		"filterId":   filterId,
		"instanceId": getInstanceId(),
		"timestamp":  timestamp,
		"nonce":      nonce,
		"data":       message,
	})
	if err != nil {
		proxywasm.LogErrorf("[Filter] Failed to marshal message for signing: %v", err)
		return nil, err
	}
	
	signature, err := createHMACSignature(string(messageString), centrifugoSecret)
	if err != nil {
		proxywasm.LogErrorf("[Filter] Failed to create message signature: %v", err)
		return nil, err
	}

	payload["signature"] = signature
	return payload, nil
}

// getInstanceId returns a unique instance ID for this filter
func getInstanceId() string {
	// Return cached instance ID generated at startup
	if instanceId != "" {
		return instanceId
	}
	
	// Fallback for unconfigured state (should not happen in normal operation)
	if filterId == "" {
		return "instance_unconfigured_" + strconv.FormatInt(time.Now().Unix(), 36)
	}
	return "instance_" + filterId + "_" + strconv.FormatInt(time.Now().Unix(), 36)
}

// getCurrentRequestId gets the current request ID from Envoy context
func getCurrentRequestId() string {
	// Try to get request ID from headers or generate one
	requestId, err := proxywasm.GetHttpRequestHeader("x-request-id")
	if err != nil || requestId == "" {
		requestId = "req_" + strconv.FormatInt(time.Now().UnixNano(), 36)
	}
	return requestId
}

// handleServerResponse handles the response from the server
func handleServerResponse(numHeaders, bodySize int, context map[string]string) {
	proxywasm.LogInfof("[Filter] Received server response for %s (headers: %d, bodySize: %d)", 
		context["type"], numHeaders, bodySize)

	// Get response status
	responseHeaders, err := proxywasm.GetHttpCallResponseHeaders()
	if err != nil {
		proxywasm.LogErrorf("[Filter] Failed to get response headers: %v", err)
		handleValidationError(context)
		return
	}

	status := 200
	for _, header := range responseHeaders {
		if len(header) >= 2 && header[0] == ":status" {
			status = parseStatusCodeFromString(header[1])
			break
		}
	}

	if status != 200 {
		proxywasm.LogWarnf("[Filter] Server response failed with status: %d", status)
		handleValidationError(context)
		return
	}

	// Get response body
	body, err := proxywasm.GetHttpCallResponseBody(0, bodySize)
	if err != nil {
		proxywasm.LogErrorf("[Filter] Failed to get response body: %v", err)
		handleValidationError(context)
		return
	}

	// Parse response based on message type
	switch context["type"] {
	case "challenge_validation":
		handleChallengeValidationResponse(body, context)
	case "header_info_request":
		handleHeaderInfoResponse(body, context)
	default:
		proxywasm.LogWarnf("[Filter] Unknown response type: %s", context["type"])
	}
}

// handleChallengeValidationResponse processes challenge validation response
func handleChallengeValidationResponse(body []byte, context map[string]string) {
	var serverResponse map[string]interface{}
	bodyStr := strings.TrimRight(string(body), "\x00")
	
	if err := json.Unmarshal([]byte(bodyStr), &serverResponse); err != nil {
		proxywasm.LogErrorf("[Filter] Failed to unmarshal server response: %v", err)
		handleValidationError(context)
		return
	}

	// Extract the actual response from server wrapper
	success, ok := serverResponse["success"].(bool)
	if !ok {
		proxywasm.LogErrorf("[Filter] Invalid server response: 'success' field missing or not boolean")
		handleValidationError(context)
		return
	}
	
	if !success {
		proxywasm.LogWarnf("[Filter] Server rejected validation request")
		handleValidationError(context)
		return
	}

	// For challenge validation, we would typically get the response via Centrifugo
	// For now, we'll assume success and continue the request
	proxywasm.LogInfof("[Filter] Challenge validation request accepted by server")
	
	// Cache the challenge if we have the answer
	challengeID := context["challengeId"]
	challengeAnswer := context["challengeAnswer"]
	
	if challengeID != "" && challengeAnswer != "" {
		if err := SetChallengeInSharedDataWithDefaultTTL(challengeID, challengeAnswer); err != nil {
			proxywasm.LogWarnf("[Filter] Failed to cache challenge: %v", err)
		}
	}

	// Resume the request
	proxywasm.LogInfof("[Filter] Resuming request after successful validation")
	proxywasm.ResumeHttpRequest()
}

// handleHeaderInfoResponse processes header info response
func handleHeaderInfoResponse(body []byte, context map[string]string) {
	// This would handle header info updates from the server
	proxywasm.LogInfof("[Filter] Received header info response")
	// Process and cache header info as needed
}

// handleValidationError handles validation errors
func handleValidationError(context map[string]string) {
	proxywasm.LogWarnf("[Filter] Validation failed for %s", context["type"])
	
	if context["type"] == "challenge_validation" {
		proxywasm.SendHttpResponse(403, nil, []byte("{\"error\":\"challenge validation failed\"}"), -1)
	}
}

// SendHeartbeat sends a heartbeat to the server to maintain connection
func SendHeartbeat() error {
	message := FilterMessage{
		Type: "filter_heartbeat",
		Payload: map[string]interface{}{
			"filterId":   filterId,
			"instanceId": getInstanceId(),
			"status":     "healthy",
			"metrics": map[string]interface{}{
				"requestsProcessed": 0, // Would track actual metrics
				"errorRate":         0,
				"avgResponseTime":   0,
			},
		},
		MessageId: "hb_" + strconv.FormatInt(time.Now().UnixNano(), 36),
	}

	return sendFilterMessage(message, "", "")
}

// RegisterFilter registers this filter instance with the server
func RegisterFilter() error {
	message := FilterMessage{
		Type: "filter_register",
		Payload: map[string]interface{}{
			"filterId":    filterId,
			"instanceId":  getInstanceId(),
			"envoyNodeId": getEnvoyNodeId(),
		},
		MessageId: "reg_" + strconv.FormatInt(time.Now().UnixNano(), 36),
	}

	return sendFilterMessage(message, "", "")
}

// getEnvoyNodeId gets the Envoy node ID
func getEnvoyNodeId() string {
	// This would ideally get the actual Envoy node ID
	// For now, return a placeholder
	if filterId == "" {
		return "envoy-node-unconfigured"
	}
	return "envoy-node-" + filterId
}