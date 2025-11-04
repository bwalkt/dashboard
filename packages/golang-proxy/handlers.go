// Package main implements HTTP handlers for the golang-ziti server
// This module provides route handlers matching the vanilla server API
package main

import (
	"bytes"
	"encoding/json"
	"log"
	"net/http"
	"os"
	"strings"
	"sync"
)

// Context key for storing user in request context
type contextKey string

const userContextKey contextKey = "user"

// Security constants
const (
	MaxResponseSize = 10 * 1024 * 1024 // 10MB
	MaxRequestSize  = 1024 * 1024      // 1MB
	MaxHeaderSize   = 4096             // 4KB per header
	MaxQueryLength  = 2048             // 2KB for query string
	MaxPathLength   = 1024             // 1KB for URL path
)

// Middleware holds authentication configuration and database connection
type Middleware struct {
	mu sync.RWMutex
}

// NewMiddleware creates a new middleware instance
func NewMiddleware() *Middleware {
	return &Middleware{}
}

// extractAndVerifyUser extracts and verifies user authentication from request
// First checks Authorization header, then cookies, verifies the token and returns the user from DB
// Falls back to session lookup when no token is present
// Returns nil user and error when no valid user is found
// Authentication has been removed; this is now a no-op helper retained for
// compatibility with existing handler signatures.
func (m *Middleware) extractAndVerifyUser(r *http.Request) (*User, error) {
	return nil, nil
}

// AuthMiddleware validates JWT tokens and sessions, adding user info to request context
func (m *Middleware) AuthMiddleware(next http.Handler) http.Handler {
	// No authentication; pass through directly
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		next.ServeHTTP(w, r)
	})
}

// OptionalAuthMiddleware validates authentication but doesn't require it (for public routes)
func (m *Middleware) OptionalAuthMiddleware(next http.Handler) http.Handler {
	// No authentication; pass through directly
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		next.ServeHTTP(w, r)
	})
}

// CORSMiddleware handles CORS headers and preflight requests
func (m *Middleware) CORSMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Get allowed origin from environment variable, default to http://localhost:1420
		allowedOrigin := os.Getenv("CORS_ALLOWED_ORIGIN")
		if allowedOrigin == "" {
			allowedOrigin = "http://localhost:1420"
		}

		// Get the origin from the request
		origin := r.Header.Get("Origin")

		// Check if the origin is allowed
		// Support multiple origins (comma-separated) or wildcard
		allowedOrigins := strings.Split(allowedOrigin, ",")
		for i := range allowedOrigins {
			allowedOrigins[i] = strings.TrimSpace(allowedOrigins[i])
		}

		if allowedOrigin == "*" {
			// Allow all origins (use with caution in production)
			w.Header().Set("Access-Control-Allow-Origin", "*")
		} else if origin != "" {
			// Check if the request origin is in the allowed list
			for _, allowed := range allowedOrigins {
				if origin == allowed {
					w.Header().Set("Access-Control-Allow-Origin", origin)
					break
				}
			}
		}

		// Set CORS headers
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, traceparent, tracestate")
		w.Header().Set("Access-Control-Max-Age", "3600") // Cache preflight for 1 hour

		// Only allow credentials if origin was allowed and not using wildcard
		// (browsers don't allow credentials with "*")
		// Track if we set an origin to determine if we should set credentials
		_, originHeaderSet := w.Header()["Access-Control-Allow-Origin"]
		if originHeaderSet && allowedOrigin != "*" {
			// Explicitly remove any existing value first, then set to ensure no duplicates
			w.Header().Del("Access-Control-Allow-Credentials")
			w.Header().Set("Access-Control-Allow-Credentials", "true")
		}

		// Handle preflight requests
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusNoContent)
			return
		}

		// Continue with the next handler
		next.ServeHTTP(w, r)
	})
}

// APIResponse represents a standard API response format
type APIResponse struct {
	Success bool        `json:"success"`
	Message string      `json:"message,omitempty"`
	Data    interface{} `json:"data,omitempty"`
}

// JSONResponse sends a JSON response with the given parameters
func (m *Middleware) JSONResponse(w http.ResponseWriter, success bool, message string, data interface{}) {
	// Sanitize error messages in production
	if !success && os.Getenv("ENVIRONMENT") == "production" {
		message = "An error occurred"
	}

	response := APIResponse{
		Success: success,
		Message: message,
		Data:    data,
	}

	// Encode to buffer first to catch any encoding errors before committing headers
	var buf bytes.Buffer
	if err := json.NewEncoder(&buf).Encode(response); err != nil {
		log.Printf("JSON encoding error: %v", err)
		// Write a minimal error response without attempting to reset already-sent headers
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte(`{"success":false,"message":"Failed to encode response"}`))
		return
	}

	// Determine HTTP status code based on success flag
	statusCode := http.StatusOK
	if !success {
		// Default to 500 for generic errors; specific handlers can use different codes
		// by calling w.WriteHeader before calling this function if needed
		statusCode = http.StatusInternalServerError
	}

	// Now that encoding succeeded, write the response with correct headers and status
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	buf.WriteTo(w)
}

// SetupRoutes configures all HTTP routes and returns the main router
func (m *Middleware) SetupRoutes() http.Handler {
	mux := http.NewServeMux()

	// Authentication routes removed

	// Test endpoint for health checks
	mux.HandleFunc("/test", func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("Test route works!"))
	})

	// Public routes
	mux.HandleFunc("/dashboard", m.DashboardHandler)
	mux.HandleFunc("/profile", m.ProfileHandler)

	// Proxy route (now public)
	mux.HandleFunc("/proxy", m.ProxyHandler)

	// Home page (catch-all for unmatched routes)
	mux.HandleFunc("/", m.HomeHandler)

	// Apply CORS middleware to all routes
	return m.CORSMiddleware(mux)
}
