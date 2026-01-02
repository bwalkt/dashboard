package main

import (
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/proxy-wasm/proxy-wasm-go-sdk/proxywasm"
	"github.com/proxy-wasm/proxy-wasm-go-sdk/proxywasm/types"
)

// LoginInterceptor handles login request interception and session management
type LoginInterceptor struct {
	serverURL   string
	clusterName string
	timeout     int // milliseconds
}

// LoginCallbackData holds data from the OAuth callback
type LoginCallbackData struct {
	Email    string `json:"email"`
	UserID   string `json:"user_id"`
	GithubID string `json:"github_id"`
}

// SessionMeta contains metadata information
type SessionMeta struct {
	Source    string `json:"source"`
	Timestamp int64  `json:"timestamp"`
}

// SessionData contains the nested data structure matching server/Redis format
type SessionData struct {
	Meta SessionMeta `json:"meta"`
}

// SessionUpdateRequest is the request body for session update
type SessionUpdateRequest struct {
	Email string      `json:"email"`
	SID   string      `json:"sid,omitempty"`
	Data  SessionData `json:"data,omitempty"`
}

// SessionUpdateResponse is the response from session update
type SessionUpdateResponse struct {
	Success   bool                   `json:"success"`
	SID       string                 `json:"sid"`
	UID       string                 `json:"uid,omitempty"`
	NextFuncs map[string]interface{} `json:"nextFuncs,omitempty"`
	Message   string                 `json:"message,omitempty"`
}

// NewLoginInterceptor creates a new login interceptor
func NewLoginInterceptor(serverURL string, clusterName string, timeout int) *LoginInterceptor {
	if clusterName == "" {
		clusterName = "backend_cluster" // default
	}
	if timeout <= 0 {
		timeout = 5000 // default 5 seconds
	}
	return &LoginInterceptor{
		serverURL:   serverURL,
		clusterName: clusterName,
		timeout:     timeout,
	}
}

// IsLoginPath checks if the path is a login-related path that should be monitored
// Note: This is broader than InterceptLogin to allow for future expansion
func (li *LoginInterceptor) IsLoginPath(path string) bool {
	// Check for exact OAuth callback or login paths
	return strings.HasPrefix(path, "/auth/callback") ||
		strings.HasPrefix(path, "/auth/login") ||
		strings.HasPrefix(path, "/api/auth/callback")
}

// ShouldInterceptPath checks if the path should be actively intercepted
func (li *LoginInterceptor) ShouldInterceptPath(path string) bool {
	// Currently only intercept OAuth callbacks for session creation
	return strings.HasPrefix(path, "/auth/callback")
}

// InterceptLogin intercepts login requests and updates session
func (li *LoginInterceptor) InterceptLogin(ctx *httpContext, path string, method string) (bool, types.Action) {
	// Only intercept successful OAuth callbacks
	if !li.ShouldInterceptPath(path) || method != "GET" {
		return false, types.ActionContinue
	}

	proxywasm.LogInfof("[Login Interceptor] Intercepting OAuth callback: %s", path)

	// Let the request continue but mark for response interception
	ctx.loginIntercepted = true
	return true, types.ActionContinue
}

// HandleLoginResponse processes the login response and updates session
func (li *LoginInterceptor) HandleLoginResponse(ctx *httpContext, statusCode uint32, bodySize int) error {
	// Only process successful responses
	if statusCode != 200 {
		proxywasm.LogWarnf("[Login Interceptor] Non-success status code: %d", statusCode)
		return nil
	}

	// Get response body
	body, err := proxywasm.GetHttpResponseBody(0, bodySize)
	if err != nil {
		return fmt.Errorf("failed to get response body: %v", err)
	}

	// Parse response to extract user email
	var loginData map[string]interface{}
	if err := json.Unmarshal(body, &loginData); err != nil {
		return fmt.Errorf("failed to parse login response: %v", err)
	}

	// Extract user information
	var email string
	if user, ok := loginData["user"].(map[string]interface{}); ok {
		if emailVal, ok := user["email"].(string); ok {
			email = emailVal
		}
	}

	if email == "" {
		proxywasm.LogWarnf("[Login Interceptor] No email found in login response")
		return nil
	}

	proxywasm.LogInfof("[Login Interceptor] User logged in: %s", email)

	// Generate session ID using UUID v7 (time-ordered UUID)
	uuidV7, err := uuid.NewV7()
	if err != nil {
		return fmt.Errorf("failed to generate UUID v7: %v", err)
	}
	sessionID := uuidV7.String()

	// Update session in backend
	if err := li.updateSession(ctx, email, sessionID); err != nil {
		proxywasm.LogErrorf("[Login Interceptor] Failed to update session: %v", err)
		// Don't fail the login, just log the error
	}

	return nil
}

// updateSession makes HTTP call to update session in backend
func (li *LoginInterceptor) updateSession(ctx *httpContext, email string, sessionID string) error {
	// Prepare request body
	reqBody := SessionUpdateRequest{
		Email: email,
		SID:   sessionID,
		Data: SessionData{
			Meta: SessionMeta{
				Source:    "wasm_filter",
				Timestamp: time.Now().UnixMilli(),
			},
		},
	}

	bodyBytes, err := json.Marshal(reqBody)
	if err != nil {
		return fmt.Errorf("failed to marshal request body: %v", err)
	}

	// Prepare headers
	headers := [][2]string{
		{":method", "POST"},
		{":path", "/filter/session/update"},
		{":authority", li.serverURL},
		{"content-type", "application/json"},
		{"content-length", fmt.Sprintf("%d", len(bodyBytes))},
	}

	// Make HTTP call to backend
	calloutID, err := proxywasm.DispatchHttpCall(
		li.clusterName, // Configurable cluster name
		headers,
		bodyBytes,
		nil,              // No trailers
		uint32(li.timeout), // Configurable timeout
		func(numHeaders, bodySize, numTrailers int) {
			// Handle response in callback
			li.handleSessionUpdateResponse(ctx, numHeaders, bodySize)
		},
	)

	if err != nil {
		return fmt.Errorf("failed to dispatch HTTP call: %v", err)
	}

	proxywasm.LogInfof("[Login Interceptor] Session update request sent (callout ID: %d)", calloutID)
	return nil
}

// handleSessionUpdateResponse handles the session update response
func (li *LoginInterceptor) handleSessionUpdateResponse(ctx *httpContext, numHeaders int, bodySize int) {
	// Get response headers
	headers, err := proxywasm.GetHttpCallResponseHeaders()
	if err != nil {
		proxywasm.LogErrorf("[Login Interceptor] Failed to get response headers: %v", err)
		return
	}
	
	// Find status header
	status := "200" // default
	for _, header := range headers {
		if header[0] == ":status" {
			status = header[1]
			break
		}
	}

	// Get response body
	body, err := proxywasm.GetHttpCallResponseBody(0, bodySize)
	if err != nil {
		proxywasm.LogErrorf("[Login Interceptor] Failed to get response body: %v", err)
		return
	}

	// Parse response
	var response SessionUpdateResponse
	if err := json.Unmarshal(body, &response); err != nil {
		proxywasm.LogErrorf("[Login Interceptor] Failed to parse response: %v", err)
		return
	}

	if status != "200" || !response.Success {
		proxywasm.LogErrorf("[Login Interceptor] Session update failed: %s", response.Message)
		return
	}

	proxywasm.LogInfof("[Login Interceptor] Session updated successfully: %s (user: %s)", 
		response.SID, response.UID)

	// Store session info in shared data if needed
	if response.UID != "" {
		SetSessionInSharedData(response.SID, response.UID, response.NextFuncs)
	}
}

// SetSessionInSharedData stores session info in shared data
func SetSessionInSharedData(sessionID string, userID string, nextFuncs map[string]interface{}) {
	sessionData := map[string]interface{}{
		"sessionId": sessionID,
		"userId":    userID,
		"nextFuncs": nextFuncs,
		"timestamp": time.Now().UnixMilli(),
	}

	dataBytes, err := json.Marshal(sessionData)
	if err != nil {
		proxywasm.LogErrorf("[Login Interceptor] Failed to marshal session data: %v", err)
		return
	}

	// Store in shared data with session prefix
	key := fmt.Sprintf("session:%s", sessionID)
	if err := proxywasm.SetSharedData(key, dataBytes, 0); err != nil {
		proxywasm.LogWarnf("[Login Interceptor] Failed to store session in shared data: %v", err)
	}
}

