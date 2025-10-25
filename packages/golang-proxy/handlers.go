// Package main implements HTTP handlers for the golang-ziti server
// This module provides route handlers matching the vanilla server API
package main

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"os"
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
	authConfig *AuthConfig
	db         *Database
	mu         sync.RWMutex
}

// NewMiddleware creates a new middleware instance
func NewMiddleware(authConfig *AuthConfig, db *Database) *Middleware {
	return &Middleware{
		authConfig: authConfig,
		db:         db,
	}
}

// extractAndVerifyUser extracts and verifies user authentication from request
// First checks Authorization header, then cookies, verifies the token and returns the user from DB
// Falls back to session lookup when no token is present
// Returns nil user and error when no valid user is found
func (m *Middleware) extractAndVerifyUser(r *http.Request) (*User, error) {
	// Check for JWT token in Authorization header
	authHeader := r.Header.Get("Authorization")
	tokenString := m.authConfig.ExtractTokenFromHeader(authHeader)

	// If no token in header, try cookies
	if tokenString == "" {
		cookies := make(map[string]string)
		for _, cookie := range r.Cookies() {
			cookies[cookie.Name] = cookie.Value
		}
		tokenString = m.authConfig.ExtractTokenFromCookies(cookies)
	}

	// If we have a token, verify it
	if tokenString != "" {
		payload, err := m.authConfig.VerifyAccessToken(tokenString)
		if err == nil {
			// Token is valid, get user from database
			user, err := m.db.GetUserByID(payload.UserID)
			if err == nil {
				return user, nil
			}
		}
	}

	// Fallback to session-based auth
	session, _ := m.authConfig.Store.Get(r, "auth-session")
	userID, ok := session.Values["user_id"].(string)
	if !ok {
		return nil, http.ErrNoCookie // Use a standard error to indicate no valid auth
	}

	// Verify user exists in database
	user, err := m.db.GetUserByID(userID)
	if err != nil {
		return nil, err
	}

	return user, nil
}

// AuthMiddleware validates JWT tokens and sessions, adding user info to request context
func (m *Middleware) AuthMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Extract and verify user authentication
		user, err := m.extractAndVerifyUser(r)
		if err != nil {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		// Attach user to request context
		ctx := context.WithValue(r.Context(), userContextKey, user)
		r = r.WithContext(ctx)

		next.ServeHTTP(w, r)
	})
}

// OptionalAuthMiddleware validates authentication but doesn't require it (for public routes)
func (m *Middleware) OptionalAuthMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Extract and verify user authentication (optional)
		user, err := m.extractAndVerifyUser(r)
		if err == nil && user != nil {
			// Attach user to request context if found
			ctx := context.WithValue(r.Context(), userContextKey, user)
			r = r.WithContext(ctx)
		}

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
	w.Header().Set("Content-Type", "application/json")

	// Sanitize error messages in production
	if !success && os.Getenv("ENVIRONMENT") == "production" {
		message = "An error occurred"
	}

	response := APIResponse{
		Success: success,
		Message: message,
		Data:    data,
	}

	// Check for JSON encoding errors
	if err := json.NewEncoder(w).Encode(response); err != nil {
		log.Printf("JSON encoding error: %v", err)

		// Try to write a minimal error response
		w.WriteHeader(http.StatusInternalServerError)
		if _, writeErr := w.Write([]byte(`{"error":"Internal Server Error","message":"Failed to encode response"}`)); writeErr != nil {
			log.Printf("Failed to write error response: %v", writeErr)
			// Last resort: try plain text
			w.Header().Set("Content-Type", "text/plain")
			w.Write([]byte("Internal Server Error"))
		}
	}
}

// SetupRoutes configures all HTTP routes and returns the main router
func (m *Middleware) SetupRoutes() http.Handler {
	mux := http.NewServeMux()

	// Register auth routes (matching vanilla server API)
	mux.HandleFunc("/auth/login", m.AuthLoginHandler)
	mux.HandleFunc("/auth/callback", m.authConfig.CallbackHandler(m.db))

	// Protected auth routes
	mux.Handle("/auth/me", m.AuthMiddleware(http.HandlerFunc(m.AuthMeHandler)))
	mux.Handle("/auth/refresh", m.AuthMiddleware(http.HandlerFunc(m.AuthRefreshHandler)))
	mux.Handle("/auth/logout", m.AuthMiddleware(http.HandlerFunc(m.AuthLogoutHandler)))

	// Legacy routes for backward compatibility
	mux.HandleFunc("/login", m.authConfig.LoginHandler)
	mux.HandleFunc("/logout", m.authConfig.LogoutHandler)

	// Test endpoint for health checks
	mux.HandleFunc("/test", func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("Test route works!"))
	})

	// Protected routes
	mux.Handle("/dashboard", m.AuthMiddleware(http.HandlerFunc(m.DashboardHandler)))
	mux.Handle("/profile", m.AuthMiddleware(http.HandlerFunc(m.ProfileHandler)))

	// Proxy route (protected)
	mux.Handle("/proxy", m.AuthMiddleware(http.HandlerFunc(m.ProxyHandler)))

	// Home page (catch-all for unmatched routes)
	mux.HandleFunc("/", m.HomeHandler)

	return mux
}
