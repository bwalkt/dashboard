// Package main implements HTTP handlers for the golang-ziti server
// This module provides route handlers matching the vanilla server API
package main

import (
	"encoding/json"
	"net/http"
)

// Middleware holds authentication configuration and database connection
type Middleware struct {
	authConfig *AuthConfig
	db         *Database
}

// NewMiddleware creates a new middleware instance
func NewMiddleware(authConfig *AuthConfig, db *Database) *Middleware {
	return &Middleware{
		authConfig: authConfig,
		db:         db,
	}
}

// AuthMiddleware validates JWT tokens and sessions, adding user info to request headers
func (m *Middleware) AuthMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
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
				// Token is valid, add user info to request context
				user, err := m.db.GetUserByID(payload.UserID)
				if err == nil {
					r.Header.Set("X-User-ID", user.ID)
					r.Header.Set("X-Username", user.Username)
					r.Header.Set("X-User-Email", user.Email)
					next.ServeHTTP(w, r)
					return
				}
			}
		}

		// Fallback to session-based auth
		session, _ := m.authConfig.Store.Get(r, "auth-session")
		userID, ok := session.Values["user_id"].(string)
		if !ok {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		// Verify user exists in database
		user, err := m.db.GetUserByID(userID)
		if err != nil {
			http.Error(w, "User not found", http.StatusUnauthorized)
			return
		}

		// Add user info to request context
		r.Header.Set("X-User-ID", user.ID)
		r.Header.Set("X-Username", user.Username)
		r.Header.Set("X-User-Email", user.Email)
		next.ServeHTTP(w, r)
	})
}

// OptionalAuthMiddleware validates authentication but doesn't require it (for public routes)
func (m *Middleware) OptionalAuthMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
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
				user, err := m.db.GetUserByID(payload.UserID)
				if err == nil {
					r.Header.Set("X-User-ID", user.ID)
					r.Header.Set("X-Username", user.Username)
					r.Header.Set("X-User-Email", user.Email)
				}
			}
		} else {
			// Check for session
			session, _ := m.authConfig.Store.Get(r, "auth-session")
			if userID, ok := session.Values["user_id"].(string); ok {
				if user, err := m.db.GetUserByID(userID); err == nil {
					r.Header.Set("X-User-ID", user.ID)
					r.Header.Set("X-Username", user.Username)
					r.Header.Set("X-User-Email", user.Email)
				}
			}
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
	response := APIResponse{
		Success: success,
		Message: message,
		Data:    data,
	}
	json.NewEncoder(w).Encode(response)
}

// SetupRoutes configures all HTTP routes and returns the main router
func (m *Middleware) SetupRoutes() http.Handler {
	mux := http.NewServeMux()

	// Register auth routes (matching vanilla server API)
	mux.HandleFunc("/auth/login", m.AuthLoginHandler)
	mux.HandleFunc("/auth/callback", m.authConfig.CallbackHandler(m.db))
	mux.HandleFunc("/auth/me", m.AuthMeHandler)
	mux.HandleFunc("/auth/refresh", m.AuthRefreshHandler)
	mux.HandleFunc("/auth/logout", m.AuthLogoutHandler)

	// Legacy routes for backward compatibility
	mux.HandleFunc("/login", m.authConfig.LoginHandler)
	mux.HandleFunc("/logout", m.authConfig.LogoutHandler)

	// Test endpoint for health checks
	mux.HandleFunc("/test", func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("Test route works!"))
	})

	// Dashboard page (protected)
	mux.HandleFunc("/dashboard", m.DashboardHandler)

	// Home page (catch-all for unmatched routes)
	mux.HandleFunc("/", m.HomeHandler)

	return mux
}

// HomeHandler serves the home page and handles unmatched routes (404s)
func (m *Middleware) HomeHandler(w http.ResponseWriter, r *http.Request) {
	// Only handle exact "/" path - return 404 for all other unmatched routes
	if r.URL.Path != "/" {
		http.NotFound(w, r)
		return
	}

	// Check if user is already authenticated
	userID := r.Header.Get("X-User-ID")
	if userID != "" {
		// User is logged in, redirect to dashboard
		http.Redirect(w, r, "/dashboard", http.StatusTemporaryRedirect)
		return
	}

	// Show login page for unauthenticated users
	html := `
<!DOCTYPE html>
<html>
<head>
    <title>GitHub OAuth Demo</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
        .login-btn { background: #24292e; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; }
        .login-btn:hover { background: #1a1e22; }
    </style>
</head>
<body>
    <h1>Welcome to GitHub OAuth Demo</h1>
    <p>Please log in with your GitHub account to continue.</p>
    <a href="/login" class="login-btn">Login with GitHub</a>
</body>
</html>
`
	w.Header().Set("Content-Type", "text/html")
	w.Write([]byte(html))
}

func (m *Middleware) ProfileHandler(w http.ResponseWriter, r *http.Request) {
	userID := r.Header.Get("X-User-ID")
	user, err := m.db.GetUserByID(userID)
	if err != nil {
		m.JSONResponse(w, false, "User not found", nil)
		return
	}

	m.JSONResponse(w, true, "Profile retrieved successfully", user)
}

// DashboardHandler serves the protected dashboard page with user authentication
func (m *Middleware) DashboardHandler(w http.ResponseWriter, r *http.Request) {
	// Check for authentication from middleware headers first
	username := r.Header.Get("X-Username")
	userID := r.Header.Get("X-User-ID")

	// If no user info in headers, try to get from session or JWT
	if username == "" || userID == "" {
		// Try JWT token from header or cookies
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
				user, err := m.db.GetUserByID(payload.UserID)
				if err == nil {
					username = user.Username
					userID = user.ID
				}
			}
		}

		// If still no user info, try session
		if username == "" || userID == "" {
			session, _ := m.authConfig.Store.Get(r, "auth-session")
			if sessionUserID, ok := session.Values["user_id"].(string); ok {
				if user, err := m.db.GetUserByID(sessionUserID); err == nil {
					username = user.Username
					userID = user.ID
				}
			}
		}
	}

	// If still no user info, redirect to login
	if username == "" || userID == "" {
		http.Redirect(w, r, "/login", http.StatusTemporaryRedirect)
		return
	}

	html := `
<!DOCTYPE html>
<html>
<head>
    <title>Dashboard</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; }
        .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; }
        .logout-btn { background: #dc3545; color: white; padding: 8px 16px; text-decoration: none; border-radius: 4px; }
        .logout-btn:hover { background: #c82333; }
        .card { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Dashboard</h1>
        <a href="/logout" class="logout-btn">Logout</a>
    </div>
    
    <div class="card">
        <h2>Welcome, ` + username + `!</h2>
        <p>You are successfully logged in with GitHub OAuth.</p>
    </div>
    
    <div class="card">
        <h3>API Endpoints</h3>
        <ul>
            <li><a href="/auth/me">GET /auth/me</a> - Get your profile information</li>
            <li><a href="/auth/refresh">GET /auth/refresh</a> - Refresh your access token</li>
            <li><a href="/test">GET /test</a> - Test endpoint</li>
        </ul>
    </div>
</body>
</html>
`
	w.Header().Set("Content-Type", "text/html")
	w.Write([]byte(html))
}

func (m *Middleware) GreetHandler(w http.ResponseWriter, r *http.Request) {
	name := r.URL.Query().Get("name")
	userID := r.Header.Get("X-User-ID")
	username := r.Header.Get("X-Username")

	if name == "" {
		name = "Anonymous"
	}

	greeting := "Hello, " + name + "!"
	if username != "" {
		greeting += " (Logged in as: " + username + ")"
	}

	m.JSONResponse(w, true, greeting, map[string]interface{}{
		"greeting":  greeting,
		"logged_in": userID != "",
		"username":  username,
	})
}

// AuthLoginHandler handles GET /auth/login - returns GitHub OAuth URL (matching vanilla server API)
func (m *Middleware) AuthLoginHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != "GET" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Generate state parameter for CSRF protection
	state := generateRandomState()

	// Store state in session
	session, _ := m.authConfig.Store.Get(r, "auth-session")
	session.Values["state"] = state
	session.Save(r, w)

	// Generate authorization URL
	url := m.authConfig.OAuthConfig.AuthCodeURL(state)

	// Return JSON response with auth URL (matching vanilla server)
	w.Header().Set("Content-Type", "application/json")
	response := map[string]interface{}{
		"authUrl": url,
	}
	json.NewEncoder(w).Encode(response)
}

// AuthMeHandler handles GET /auth/me - returns current user info (matching vanilla server API)
func (m *Middleware) AuthMeHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != "GET" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Extract token from header or cookies
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

	if tokenString == "" {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusUnauthorized)
		response := map[string]interface{}{
			"error":   "Unauthorized",
			"message": "Authorization header or access token cookie missing",
		}
		json.NewEncoder(w).Encode(response)
		return
	}

	// Verify token
	payload, err := m.authConfig.VerifyAccessToken(tokenString)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusUnauthorized)
		response := map[string]interface{}{
			"error":   "Unauthorized",
			"message": "Invalid or expired token",
		}
		json.NewEncoder(w).Encode(response)
		return
	}

	// Get user from database
	user, err := m.db.GetUserByID(payload.UserID)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusUnauthorized)
		response := map[string]interface{}{
			"error":   "Unauthorized",
			"message": "User not found",
		}
		json.NewEncoder(w).Encode(response)
		return
	}

	// Return user info (matching vanilla server format)
	w.Header().Set("Content-Type", "application/json")
	response := map[string]interface{}{
		"user": user,
	}
	json.NewEncoder(w).Encode(response)
}

// AuthRefreshHandler handles GET /auth/refresh - refreshes access token using refresh token (matching vanilla server API)
func (m *Middleware) AuthRefreshHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != "GET" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Extract refresh token from cookies
	cookies := make(map[string]string)
	for _, cookie := range r.Cookies() {
		cookies[cookie.Name] = cookie.Value
	}

	refreshToken := m.authConfig.ExtractRefreshTokenFromCookies(cookies)
	if refreshToken == "" {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		response := map[string]interface{}{
			"error":   "Bad Request",
			"message": "Refresh token is required",
		}
		json.NewEncoder(w).Encode(response)
		return
	}

	// Verify refresh token
	payload, err := m.authConfig.VerifyRefreshToken(refreshToken)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusUnauthorized)
		response := map[string]interface{}{
			"error":   "Unauthorized",
			"message": "Invalid or expired refresh token",
		}
		json.NewEncoder(w).Encode(response)
		return
	}

	// Get user from database
	user, err := m.db.GetUserByID(payload.UserID)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusUnauthorized)
		response := map[string]interface{}{
			"error":   "Unauthorized",
			"message": "User not found",
		}
		json.NewEncoder(w).Encode(response)
		return
	}

	// Generate new token pair
	accessToken, newRefreshToken, err := m.authConfig.GenerateTokenPair(user.ID, user.Username, user.Email)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		response := map[string]interface{}{
			"error":   "Internal Server Error",
			"message": "Token refresh failed",
		}
		json.NewEncoder(w).Encode(response)
		return
	}

	// Set new JWT cookies
	m.authConfig.SetJWTCookies(w, accessToken, newRefreshToken)

	// Return response (matching vanilla server format)
	w.Header().Set("Content-Type", "application/json")
	response := map[string]interface{}{
		"accessToken": accessToken,
		"user":        user,
	}
	json.NewEncoder(w).Encode(response)
}

// AuthLogoutHandler handles POST /auth/logout - logs out user and clears tokens (matching vanilla server API)
func (m *Middleware) AuthLogoutHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Clear JWT cookies
	m.authConfig.ClearJWTCookies(w)

	// Clear session
	session, _ := m.authConfig.Store.Get(r, "auth-session")
	session.Values["user_id"] = nil
	session.Values["username"] = nil
	session.Values["email"] = nil
	session.Values["jwt_token"] = nil
	session.Options.MaxAge = -1
	session.Save(r, w)

	// Return success response (matching vanilla server format)
	w.Header().Set("Content-Type", "application/json")
	response := map[string]interface{}{
		"message": "Logged out successfully",
	}
	json.NewEncoder(w).Encode(response)
}
