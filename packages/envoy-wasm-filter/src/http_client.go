package main

import (
	"encoding/json"
	"strings"

	"github.com/proxy-wasm/proxy-wasm-go-sdk/proxywasm"
	"github.com/proxy-wasm/proxy-wasm-go-sdk/proxywasm/types"
)

const (
	authzServiceCluster = "authz_cluster"
	validateEndpoint    = "/validate"
)

// ValidateResponse represents the response from the /validate endpoint
type ValidateResponse struct {
	OK             bool   `json:"ok"`
	ExpectedAnswer string `json:"expectedAnswer,omitempty"`
	Message        string `json:"message,omitempty"`
}

// DispatchValidateRequest makes an async HTTP call to the authz-service /validate endpoint
// The callback handles the response since it's called instead of OnHttpCallResponse
func DispatchValidateRequest(challengeID, challengeAnswer string) error {
	// Prepare request body
	requestBody := map[string]string{
		"challengeId":     challengeID,
		"challengeAnswer": challengeAnswer,
	}

	bodyJSON, err := json.Marshal(requestBody)
	if err != nil {
		proxywasm.LogErrorf("Failed to marshal request body: %v", err)
		return err
	}

	// Prepare headers
	headers := [][2]string{
		{":method", "POST"},
		{":path", validateEndpoint},
		{":authority", "authz-service:3000"},
		{"content-type", "application/json"},
	}

	// Dispatch async HTTP call
	// The callback is called when the HTTP call completes (not OnHttpCallResponse)
	_, err = proxywasm.DispatchHttpCall(
		authzServiceCluster,
		headers,
		bodyJSON,
		nil,  // trailers
		5000, // timeout in milliseconds
		func(numHeaders, bodySize, numTrailers int) {
			// Handle response in callback (this is called instead of OnHttpCallResponse)
			proxywasm.LogInfof("[WASM Filter] HTTP call response received for challenge: %s (headers: %d, bodySize: %d)", challengeID, numHeaders, bodySize)

			// Get response headers
			responseHeaders, err := proxywasm.GetHttpCallResponseHeaders()
			if err != nil {
				proxywasm.LogErrorf("[WASM Filter] Failed to get HTTP call response headers: %v", err)
				proxywasm.SendHttpResponse(500, nil, []byte("{\"error\":\"validation service error\"}"), -1)
				return
			}

			// Extract status code
			status := 200
			for _, header := range responseHeaders {
				if len(header) >= 2 && header[0] == ":status" {
					status = parseStatusCodeFromString(header[1])
					break
				}
			}

			// Get response body
			body, err := proxywasm.GetHttpCallResponseBody(0, bodySize)
			if err != nil {
				proxywasm.LogErrorf("[WASM Filter] Failed to get HTTP call response body: %v", err)
				proxywasm.SendHttpResponse(500, nil, []byte("{\"error\":\"validation service error\"}"), -1)
				return
			}

			// Process the validation response
			action := HandleValidateResponse(status, body, challengeID, challengeAnswer)
			if action == types.ActionContinue {
				// Request should continue - need to resume the paused request
				proxywasm.LogInfof("[WASM Filter] Validation successful, resuming request")
				// Resume the request - this is required after pausing with ActionPause
				proxywasm.ResumeHttpRequest()
				proxywasm.LogInfof("[WASM Filter] ResumeHttpRequest called")
			} else {
				proxywasm.LogInfof("[WASM Filter] Validation failed, request blocked")
				// SendHttpResponse was already called in HandleValidateResponse
			}
		},
	)

	if err != nil {
		proxywasm.LogErrorf("Failed to dispatch HTTP call: %v", err)
		return err
	}

	proxywasm.LogInfof("Dispatched validation request for challenge: %s", challengeID)
	return nil
}

// parseStatusCodeFromString parses status code string to int (simple implementation for TinyGo)
func parseStatusCodeFromString(s string) int {
	result := 0
	for _, char := range s {
		if char >= '0' && char <= '9' {
			result = result*10 + int(char-'0')
		} else {
			break
		}
	}
	return result
}

// ParseValidateResponse parses the response from /validate endpoint
func ParseValidateResponse(body []byte) (*ValidateResponse, error) {
	var response ValidateResponse

	// Remove any trailing null bytes that might be present
	bodyStr := strings.TrimRight(string(body), "\x00")
	bodyStr = strings.TrimSpace(bodyStr)

	if err := json.Unmarshal([]byte(bodyStr), &response); err != nil {
		proxywasm.LogErrorf("Failed to unmarshal response: %v, body: %s", err, bodyStr)
		return nil, err
	}

	return &response, nil
}

// HandleValidateResponse processes the response from the validation endpoint
func HandleValidateResponse(statusCode int, body []byte, challengeID, challengeAnswer string) types.Action {
	if statusCode != 200 {
		proxywasm.LogWarnf("Validation request failed with status: %d", statusCode)
		proxywasm.SendHttpResponse(403, nil, []byte("{\"error\":\"challenge validation failed\"}"), -1)
		return types.ActionPause
	}

	response, err := ParseValidateResponse(body)
	if err != nil {
		proxywasm.LogErrorf("Failed to parse validation response: %v", err)
		proxywasm.SendHttpResponse(403, nil, []byte("{\"error\":\"invalid validation response\"}"), -1)
		return types.ActionPause
	}

	if !response.OK {
		proxywasm.LogWarnf("Challenge validation failed: %s", response.Message)
		proxywasm.SendHttpResponse(403, nil, []byte("{\"error\":\"invalid challenge\"}"), -1)
		return types.ActionPause
	}

	// Cache the result in shared data if expectedAnswer is provided
	if response.ExpectedAnswer != "" {
		if err := SetChallengeInSharedDataWithDefaultTTL(challengeID, response.ExpectedAnswer); err != nil {
			proxywasm.LogWarnf("Failed to cache challenge in shared data: %v", err)
			// Continue anyway, caching is optional
		}
	} else {
		// If expectedAnswer not provided, cache the provided answer (it was validated)
		if err := SetChallengeInSharedDataWithDefaultTTL(challengeID, challengeAnswer); err != nil {
			proxywasm.LogWarnf("Failed to cache challenge in shared data: %v", err)
		}
	}

	proxywasm.LogInfof("Challenge validated successfully, continuing request")
	// Resume the request
	return types.ActionContinue
}
