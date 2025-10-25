// Package main implements common handlers for the golang-ziti server
package main

import (
	"net/http"
)

// HomeHandler serves the home page and handles unmatched routes (404s)
func (m *Middleware) HomeHandler(w http.ResponseWriter, r *http.Request) {
	// Only handle exact "/" path - return 404 for all other unmatched routes
	if r.URL.Path != "/" {
		http.NotFound(w, r)
		return
	}

	// Check if user is already authenticated from context
	if user := r.Context().Value(userContextKey); user != nil {
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

// ProfileHandler handles GET /profile - returns current user profile
func (m *Middleware) ProfileHandler(w http.ResponseWriter, r *http.Request) {
	user := r.Context().Value(userContextKey).(*User)
	if user == nil {
		m.JSONResponse(w, false, "User not found", nil)
		return
	}

	m.JSONResponse(w, true, "Profile retrieved successfully", user)
}

// DashboardHandler serves the protected dashboard page with user authentication
func (m *Middleware) DashboardHandler(w http.ResponseWriter, r *http.Request) {
	// Check for authentication from context first
	var user *User
	if contextUser := r.Context().Value(userContextKey); contextUser != nil {
		user = contextUser.(*User)
	}

	// If no user in context, try to extract and verify user
	if user == nil {
		var err error
		user, err = m.extractAndVerifyUser(r)
		if err != nil || user == nil {
			http.Redirect(w, r, "/login", http.StatusTemporaryRedirect)
			return
		}
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
        <h2>Welcome, ` + user.Username + `!</h2>
        <p>You are successfully logged in with GitHub OAuth.</p>
    </div>
    
    <div class="card">
        <h3>API Endpoints</h3>
        <ul>
            <li><a href="/auth/me">GET /auth/me</a> - Get your profile information</li>
            <li><a href="/auth/refresh">GET /auth/refresh</a> - Refresh your access token</li>
            <li><a href="/test">GET /test</a> - Test endpoint</li>
            <li><strong>POST /proxy</strong> - Proxy HTTP requests to allowed domains</li>
        </ul>
    </div>
    
    <div class="card">
        <h3>Proxy API Usage</h3>
        <p>The proxy endpoint allows you to make HTTP requests to allowed domains. Configure allowed domains using the ALLOWED_DOMAINS environment variable.</p>
        <pre style="background: #f1f1f1; padding: 10px; border-radius: 4px; overflow-x: auto;">
POST /proxy
Content-Type: application/json

{
  "url": "https://jsonplaceholder.typicode.com/posts/1",
  "method": "GET",
  "headers": {
    "Accept": "application/json"
  }
}</pre>
    </div>
</body>
</html>
`
	w.Header().Set("Content-Type", "text/html")
	w.Write([]byte(html))
}

// GreetHandler handles GET /greet - returns a greeting message
func (m *Middleware) GreetHandler(w http.ResponseWriter, r *http.Request) {
	name := r.URL.Query().Get("name")

	var username string
	var userID string

	if user := r.Context().Value(userContextKey); user != nil {
		userObj := user.(*User)
		username = userObj.Username
		userID = userObj.ID
	}

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
