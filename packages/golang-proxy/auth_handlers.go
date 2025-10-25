// Package main implements authentication handlers for the golang-ziti server
package main

import (
	"encoding/json"
	"log"
	"net/http"
)

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
	if err := session.Save(r, w); err != nil {
		log.Printf("Failed to save session state: %v", err)
		http.Error(w, "Failed to save session", http.StatusInternalServerError)
		return
	}

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
