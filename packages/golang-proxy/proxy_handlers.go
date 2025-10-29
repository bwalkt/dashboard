// Package main implements proxy handlers and validation functions for the golang-ziti server
package main

import (
	"bytes"
	"encoding/json"
	"io"
	"log"
	"net"
	"net/http"
	"net/url"
	"os"
	"path"
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
	StatusCode int    `json:"statusCode"`
	Body       string `json:"body"`
}

// Allowed ports for HTTP/HTTPS
var allowedPorts = map[int]bool{
	80:   true, // HTTP
	443:  true, // HTTPS
	3000: true, // Common dev port
	8080: true, // Common dev port
	8443: true, // Common dev HTTPS port
}

// isPortAllowed checks if the port is in the allowed list
func isPortAllowed(port int) bool {
	return allowedPorts[port]
}

// validateURLPath checks for path traversal attacks and other malicious patterns
func validateURLPath(urlPath string) bool {
	// Check path length
	if len(urlPath) > MaxPathLength {
		return false
	}

	// Check for path traversal patterns
	dangerousPatterns := []string{
		"../", "./", "..\\", ".\\", "..%2f", "..%5c",
		"%2e%2e%2f", "%2e%2e%5c", "%252e%252e%252f",
		"..%252f", "..%255c", "%c0%ae%c0%ae%c0%af",
	}

	pathLower := strings.ToLower(urlPath)
	for _, pattern := range dangerousPatterns {
		if strings.Contains(pathLower, pattern) {
			return false
		}
	}

	// Check for null bytes
	if strings.Contains(urlPath, "\x00") {
		return false
	}

	// Validate path using path.Clean for URL-path semantics
	cleanPath := path.Clean(urlPath)
	if cleanPath != urlPath && !strings.HasPrefix(cleanPath, "/") {
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
	return !strings.HasSuffix(hostnameLower, ".internal")
}

// logProxyRequest logs proxy requests for monitoring and security analysis
func (m *Middleware) logProxyRequest(r *http.Request, user *User, targetURL string, method string, success bool, errorMsg string) {
	m.mu.Lock()
	defer m.mu.Unlock()

	var userID string
	var username string
	if user != nil {
		userID = user.ID
		username = user.Username
	} else {
		userID = "anonymous"
		username = "anonymous"
	}

	logData := map[string]interface{}{
		"timestamp":     time.Now().UTC().Format(time.RFC3339),
		"user_id":       userID,
		"username":      username,
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
		"X-Real-Ip":           true,
		"X-Forwarded-Proto":   true,
		"X-Forwarded-Host":    true,
		"X-Forwarded-Port":    true,
		"X-Original-Url":      true,
		"X-Rewrite-Url":       true,
		"Proxy-Authorization": true,
		"Proxy-Connection":    true,
		"Upgrade":             true,
		"Connection":          true,
		"Te":                  true,
		"Trailers":            true,
		"Transfer-Encoding":   true,
	}

	for key, value := range headers {
		// Canonicalize header name to standard format
		canonicalKey := http.CanonicalHeaderKey(key)

		// Skip blocked headers
		if blockedHeaders[canonicalKey] {
			continue
		}

		// Basic validation for header values
		if len(value) > 4096 { // Limit header value size
			continue
		}

		sanitized[canonicalKey] = value
	}

	return sanitized
}

// isHostnameInAllowedDomains checks if a hostname:port combination is explicitly in ALLOWED_DOMAINS
func isHostnameInAllowedDomains(targetHost, targetPort string) bool {
	allowedDomainsStr := os.Getenv("ALLOWED_DOMAINS")
	if allowedDomainsStr == "" {
		return false
	}

	allowedDomains := strings.Split(allowedDomainsStr, ",")

	for _, domain := range allowedDomains {
		d := strings.TrimSpace(domain)
		if d == "" {
			continue
		}

		var allowedHostname string
		var allowedPort string

		// Extract hostname and port from domain
		if strings.Contains(d, ":") {
			// If domain includes port, extract both hostname and port
			if host, port, err := net.SplitHostPort(d); err == nil {
				allowedHostname = host
				allowedPort = port
			} else {
				// If parsing fails, treat as hostname only
				allowedHostname = d
				allowedPort = ""
			}
		} else {
			// No port specified in allowed domain
			allowedHostname = d
			allowedPort = ""
		}

		// Support wildcard-style subdomain allowlist entries starting with '.'
		// e.g., ".example.com" allows any subdomain of example.com
		if strings.HasPrefix(allowedHostname, ".") {
			if strings.HasSuffix(targetHost, allowedHostname) {
				// For wildcard domains, only validate port if specified
				if allowedPort == "" || targetPort == allowedPort {
					return true
				}
			}
			continue
		}

		// Check hostname match
		if targetHost == allowedHostname {
			// If port is specified in allowed domain, it must match
			if allowedPort == "" {
				// No port specified - allow any valid port
				return true
			} else if targetPort == allowedPort {
				// Port specified and matches
				return true
			}
			// Hostname matches but port doesn't - continue checking other domains
		}
	}

	return false
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

	targetHost := parsedURL.Hostname()
	targetPortStr := parsedURL.Port()
	targetPort := targetPortStr

	// Get default port based on scheme if no port specified
	if targetPort == "" {
		if parsedURL.Scheme == "https" {
			targetPort = "443"
		} else {
			targetPort = "80"
		}
	}

	// Validate port (use the actual port string if provided, otherwise use default)
	portToValidate := targetPortStr
	if portToValidate == "" {
		portToValidate = targetPort
	}
	port, err := strconv.Atoi(portToValidate)
	if err != nil || !isPortAllowed(port) {
		return false
	}

	// Validate path
	if !validateURLPath(parsedURL.Path) {
		return false
	}

	// Validate query parameters
	if !validateQueryParameters(parsedURL.RawQuery) {
		return false
	}

	// Check if hostname is explicitly in ALLOWED_DOMAINS first
	// If it is, skip security restrictions (allows localhost, internal IPs, etc.)
	isExplicitlyAllowed := isHostnameInAllowedDomains(targetHost, targetPort)

	if !isExplicitlyAllowed {
		// If not explicitly allowed, apply security restrictions

		// Validate hostname (blocks localhost, etc.)
		if !validateHostname(targetHost) {
			return false
		}

		// Block internal IP addresses
		if isInternalIP(targetHost) {
			return false
		}

		// Block cloud metadata endpoints
		if isCloudMetadata(targetHost) {
			return false
		}
	}

	// Get allowed domains from environment variable
	allowedDomainsStr := os.Getenv("ALLOWED_DOMAINS")
	if allowedDomainsStr == "" {
		// If no domains are configured, deny all requests for security
		return false
	}

	// Final check: verify the hostname is in ALLOWED_DOMAINS
	return isHostnameInAllowedDomains(targetHost, targetPort)
}

// ProxyHandler handles HTTP proxy requests - validates URL and forwards the request
func (m *Middleware) ProxyHandler(w http.ResponseWriter, r *http.Request) {
	// Authentication removed; proceed without user context
	var user *User

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

	// Copy headers from target server response to proxy response
	// Skip certain headers that should be set by the proxy itself
	skipHeaders := map[string]bool{
		"Content-Type":                     true, // We'll set this to application/json
		"Content-Length":                   true, // Go will set this automatically
		"Transfer-Encoding":                true,
		"Connection":                       true,
		"Upgrade":                          true,
		"Access-Control-Allow-Origin":      true, // CORS headers are managed by CORS middleware
		"Access-Control-Allow-Methods":     true,
		"Access-Control-Allow-Headers":     true,
		"Access-Control-Allow-Credentials": true,
		"Access-Control-Expose-Headers":    true,
		"Access-Control-Max-Age":           true,
	}
	for key, values := range resp.Header {
		if !skipHeaders[http.CanonicalHeaderKey(key)] {
			for _, value := range values {
				w.Header().Add(key, value)
			}
		}
	}

	// Create response data (headers are now in HTTP response, not in JSON)
	proxyResp := ProxyResponse{
		StatusCode: resp.StatusCode,
		Body:       string(bodyBytes),
	}

	// Log successful request
	m.logProxyRequest(r, user, proxyReq.URL, proxyReq.Method, true, "")

	// Set status code and return JSON response
	// Note: We need to set the status code before calling JSONResponse
	// but JSONResponse will override it, so we need a custom response here
	response := APIResponse{
		Success: true,
		Message: "Request completed successfully",
		Data:    proxyResp,
	}

	// Encode to buffer first to catch any encoding errors before committing headers
	var buf bytes.Buffer
	if err := json.NewEncoder(&buf).Encode(response); err != nil {
		log.Printf("JSON encoding error: %v", err)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte(`{"success":false,"message":"Failed to encode response"}`))
		return
	}

	// Set Content-Type for JSON (override any Content-Type from target server)
	w.Header().Set("Content-Type", "application/json")

	// Set the status code from the target server response
	w.WriteHeader(resp.StatusCode)

	// Write the JSON response
	buf.WriteTo(w)
}
