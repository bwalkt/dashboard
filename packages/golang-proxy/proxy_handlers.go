// Package main implements proxy handlers and validation functions for the golang-ziti server
package main

import (
	"encoding/json"
	"io"
	"log"
	"net"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	"time"
)

// ProxyRequest represents the request structure for the proxy endpoint
type ProxyRequest struct {
	URL     string            `json:"url"`
	Method  string            `json:"method"`
	Headers map[string]string `json:"headers,omitempty"`
	Body    string            `json:"body,omitempty"`
}

// ProxyResponse represents the response structure from the proxy endpoint
type ProxyResponse struct {
	StatusCode int                 `json:"statusCode"`
	Headers    map[string][]string `json:"headers"`
	Body       string              `json:"body"`
}

// Allowed ports for HTTP/HTTPS
var allowedPorts = map[int]bool{
	80:   true, // HTTP
	443:  true, // HTTPS
	8080: true, // Common dev port
	8443: true, // Common dev HTTPS port
}

// isPortAllowed checks if the port is in the allowed list
func isPortAllowed(port int) bool {
	return allowedPorts[port]
}

// validateURLPath checks for path traversal attacks and other malicious patterns
func validateURLPath(path string) bool {
	// Check path length
	if len(path) > MaxPathLength {
		return false
	}

	// Check for path traversal patterns
	dangerousPatterns := []string{
		"../", "./", "..\\", ".\\", "..%2f", "..%5c",
		"%2e%2e%2f", "%2e%2e%5c", "%252e%252e%252f",
		"..%252f", "..%255c", "%c0%ae%c0%ae%c0%af",
	}

	pathLower := strings.ToLower(path)
	for _, pattern := range dangerousPatterns {
		if strings.Contains(pathLower, pattern) {
			return false
		}
	}

	// Check for null bytes
	if strings.Contains(path, "\x00") {
		return false
	}

	// Validate path using filepath.Clean
	cleanPath := filepath.Clean(path)
	if cleanPath != path && !strings.HasPrefix(cleanPath, "/") {
		return false
	}

	return true
}

// validateQueryParameters validates query parameters for malicious content
func validateQueryParameters(query string) bool {
	// Check query length
	if len(query) > MaxQueryLength {
		return false
	}

	// Parse query parameters
	params, err := url.ParseQuery(query)
	if err != nil {
		return false
	}

	// Check each parameter value
	for key, values := range params {
		// Check key length
		if len(key) > 256 {
			return false
		}

		// Check for dangerous patterns in keys
		if strings.Contains(strings.ToLower(key), "script") ||
			strings.Contains(strings.ToLower(key), "javascript") ||
			strings.Contains(strings.ToLower(key), "vbscript") {
			return false
		}

		// Check each value
		for _, value := range values {
			if len(value) > 1024 { // Limit individual parameter value size
				return false
			}

			// Check for SQL injection patterns
			sqlPatterns := []string{
				"'", "\"", ";", "--", "/*", "*/", "xp_", "sp_",
				"union", "select", "insert", "update", "delete",
				"drop", "create", "alter", "exec", "execute",
			}

			valueLower := strings.ToLower(value)
			for _, pattern := range sqlPatterns {
				if strings.Contains(valueLower, pattern) {
					return false
				}
			}

			// Check for script injection patterns
			scriptPatterns := []string{
				"<script", "</script>", "javascript:", "vbscript:",
				"onload=", "onerror=", "onclick=", "onmouseover=",
				"<iframe", "</iframe>", "<object", "</object>",
				"<embed", "</embed>", "<link", "<meta",
			}

			for _, pattern := range scriptPatterns {
				if strings.Contains(strings.ToLower(value), pattern) {
					return false
				}
			}
		}
	}

	return true
}

// validateURLScheme checks if the URL scheme is allowed
func validateURLScheme(scheme string) bool {
	allowedSchemes := []string{"http", "https"}
	for _, allowed := range allowedSchemes {
		if scheme == allowed {
			return true
		}
	}
	return false
}

// validateHostname checks hostname for malicious patterns
func validateHostname(hostname string) bool {
	// Check hostname length
	if len(hostname) > 253 {
		return false
	}

	// Check for valid hostname pattern
	hostnameRegex := regexp.MustCompile(`^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)*$`)
	if !hostnameRegex.MatchString(hostname) {
		return false
	}

	// Check for dangerous patterns
	dangerousPatterns := []string{
		"localhost", "127.0.0.1", "0.0.0.0", "::1",
		"169.254.169.254", "metadata.google.internal",
	}

	hostnameLower := strings.ToLower(hostname)
	for _, pattern := range dangerousPatterns {
		if hostnameLower == pattern {
			return false
		}
	}

	// Check for .internal domains
	if strings.HasSuffix(hostnameLower, ".internal") {
		return false
	}

	return true
}

// logProxyRequest logs proxy requests for monitoring and security analysis
func (m *Middleware) logProxyRequest(r *http.Request, user *User, targetURL string, method string, success bool, errorMsg string) {
	m.mu.Lock()
	defer m.mu.Unlock()

	logData := map[string]interface{}{
		"timestamp":     time.Now().UTC().Format(time.RFC3339),
		"user_id":       user.ID,
		"username":      user.Username,
		"client_ip":     getClientIP(r),
		"user_agent":    r.UserAgent(),
		"target_url":    targetURL,
		"method":        method,
		"success":       success,
		"error_message": errorMsg,
	}

	logJSON, _ := json.Marshal(logData)
	log.Printf("PROXY_REQUEST: %s", string(logJSON))
}

// getClientIP extracts the real client IP from the request
func getClientIP(r *http.Request) string {
	// Check X-Forwarded-For header
	if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
		ips := strings.Split(xff, ",")
		if len(ips) > 0 {
			return strings.TrimSpace(ips[0])
		}
	}

	// Check X-Real-IP header
	if xri := r.Header.Get("X-Real-IP"); xri != "" {
		return xri
	}

	// Fall back to RemoteAddr
	ip, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return ip
}

func isInternalIP(hostname string) bool {
	// Check if it's a direct IP address
	if ip := net.ParseIP(hostname); ip != nil {
		return ip.IsLoopback() || ip.IsPrivate() || ip.IsUnspecified()
	}

	// Resolve hostname to IP
	ips, err := net.LookupIP(hostname)
	if err != nil {
		return true // Block if we can't resolve (safer)
	}

	// Check if any resolved IP is internal
	for _, ip := range ips {
		if ip.IsLoopback() || ip.IsPrivate() || ip.IsUnspecified() {
			return true
		}
	}

	return false
}

// isCloudMetadata checks if the hostname is a cloud metadata endpoint
func isCloudMetadata(hostname string) bool {
	cloudMetadataHosts := []string{
		"169.254.169.254",          // AWS, Azure, GCP metadata
		"metadata.google.internal", // GCP metadata
		"169.254.169.254",          // AWS metadata
		"169.254.169.254",          // Azure metadata
	}

	for _, host := range cloudMetadataHosts {
		if hostname == host {
			return true
		}
	}

	// Check for .internal domains
	return strings.HasSuffix(hostname, ".internal")
}

// sanitizeHeaders removes potentially dangerous headers from the request
func sanitizeHeaders(headers map[string]string) map[string]string {
	sanitized := make(map[string]string)

	// Blocked headers that could be dangerous
	blockedHeaders := map[string]bool{
		"Host":                true,
		"Authorization":       true,
		"Cookie":              true,
		"X-Forwarded-For":     true,
		"X-Real-IP":           true,
		"X-Forwarded-Proto":   true,
		"X-Forwarded-Host":    true,
		"X-Forwarded-Port":    true,
		"X-Original-URL":      true,
		"X-Rewrite-URL":       true,
		"Proxy-Authorization": true,
		"Proxy-Connection":    true,
		"Upgrade":             true,
		"Connection":          true,
		"Te":                  true,
		"Trailers":            true,
		"Transfer-Encoding":   true,
	}

	for key, value := range headers {
		// Normalize header name
		normalizedKey := strings.Title(strings.ToLower(key))

		// Skip blocked headers
		if blockedHeaders[normalizedKey] {
			continue
		}

		// Basic validation for header values
		if len(value) > 4096 { // Limit header value size
			continue
		}

		sanitized[key] = value
	}

	return sanitized
}

// isValidDomain checks if the given URL belongs to an allowed domain with enhanced validation
func isValidDomain(targetURL string) bool {
	// Parse the URL to extract the domain
	parsedURL, err := url.Parse(targetURL)
	if err != nil {
		return false
	}

	// Validate scheme
	if !validateURLScheme(parsedURL.Scheme) {
		return false
	}

	// Validate hostname
	if !validateHostname(parsedURL.Hostname()) {
		return false
	}

	// Validate port
	if parsedURL.Port() != "" {
		port, err := strconv.Atoi(parsedURL.Port())
		if err != nil || !isPortAllowed(port) {
			return false
		}
	}

	// Validate path
	if !validateURLPath(parsedURL.Path) {
		return false
	}

	// Validate query parameters
	if !validateQueryParameters(parsedURL.RawQuery) {
		return false
	}

	// Block internal IP addresses
	if isInternalIP(parsedURL.Hostname()) {
		return false
	}

	// Block cloud metadata endpoints
	if isCloudMetadata(parsedURL.Hostname()) {
		return false
	}

	// Get allowed domains from environment variable
	allowedDomainsStr := os.Getenv("ALLOWED_DOMAINS")
	if allowedDomainsStr == "" {
		// If no domains are configured, deny all requests for security
		return false
	}

	// Split comma-separated domains and check if the target domain is in the list
	allowedDomains := strings.Split(allowedDomainsStr, ",")
	for _, domain := range allowedDomains {
		domain = strings.TrimSpace(domain)
		if parsedURL.Host == domain {
			return true
		}
	}

	return false
}

// ProxyHandler handles HTTP proxy requests - validates URL and forwards the request
func (m *Middleware) ProxyHandler(w http.ResponseWriter, r *http.Request) {
	// Get user from context for logging
	user := r.Context().Value(userContextKey).(*User)
	if user == nil {
		m.JSONResponse(w, false, "User not found", nil)
		return
	}

	if r.Method != "POST" {
		m.logProxyRequest(r, user, "", "", false, "Method not allowed")
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Limit request body size
	r.Body = http.MaxBytesReader(w, r.Body, MaxRequestSize)

	// Parse the request body
	var proxyReq ProxyRequest
	if err := json.NewDecoder(r.Body).Decode(&proxyReq); err != nil {
		m.logProxyRequest(r, user, "", "", false, "Invalid request format")
		m.JSONResponse(w, false, "Invalid request format", nil)
		return
	}

	// Validate required fields
	if proxyReq.URL == "" {
		m.logProxyRequest(r, user, "", "", false, "URL is required")
		m.JSONResponse(w, false, "URL is required", nil)
		return
	}

	if proxyReq.Method == "" {
		proxyReq.Method = "GET" // Default to GET if not specified
	}

	// Validate HTTP method
	validMethods := []string{"GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"}
	isValidMethod := false
	for _, method := range validMethods {
		if strings.ToUpper(proxyReq.Method) == method {
			isValidMethod = true
			break
		}
	}
	if !isValidMethod {
		m.logProxyRequest(r, user, proxyReq.URL, proxyReq.Method, false, "Invalid HTTP method")
		m.JSONResponse(w, false, "Invalid HTTP method", nil)
		return
	}

	// Validate the target URL domain
	if !isValidDomain(proxyReq.URL) {
		m.logProxyRequest(r, user, proxyReq.URL, proxyReq.Method, false, "URL validation failed")
		m.JSONResponse(w, false, "URL validation failed", nil)
		return
	}

	// Create HTTP client with timeout
	client := &http.Client{
		Timeout: 30 * time.Second,
	}

	// Create the request
	var bodyReader io.Reader
	if proxyReq.Body != "" {
		bodyReader = strings.NewReader(proxyReq.Body)
	}

	req, err := http.NewRequestWithContext(r.Context(), strings.ToUpper(proxyReq.Method), proxyReq.URL, bodyReader)
	if err != nil {
		m.logProxyRequest(r, user, proxyReq.URL, proxyReq.Method, false, "Invalid request configuration")
		m.JSONResponse(w, false, "Invalid request configuration", nil)
		return
	}

	// Sanitize and set headers from the proxy request
	sanitizedHeaders := sanitizeHeaders(proxyReq.Headers)
	for key, value := range sanitizedHeaders {
		req.Header.Set(key, value)
	}

	// Execute the request
	resp, err := client.Do(req)
	if err != nil {
		m.logProxyRequest(r, user, proxyReq.URL, proxyReq.Method, false, "Request execution failed")
		m.JSONResponse(w, false, "Request execution failed", nil)
		return
	}
	defer resp.Body.Close()

	// Read the response body with size limit
	limitedReader := io.LimitReader(resp.Body, MaxResponseSize)
	bodyBytes, err := io.ReadAll(limitedReader)
	if err != nil {
		m.logProxyRequest(r, user, proxyReq.URL, proxyReq.Method, false, "Response processing failed")
		m.JSONResponse(w, false, "Response processing failed", nil)
		return
	}

	// Create response
	proxyResp := ProxyResponse{
		StatusCode: resp.StatusCode,
		Headers:    resp.Header,
		Body:       string(bodyBytes),
	}

	// Log successful request
	m.logProxyRequest(r, user, proxyReq.URL, proxyReq.Method, true, "")

	// Return the proxy response
	m.JSONResponse(w, true, "Request completed successfully", proxyResp)
}
