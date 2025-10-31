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

	// Simple welcome page (authentication removed)
	html := `
<!DOCTYPE html>
<html>
<head>
    <title>Welcome</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
    </style>
</head>
<body>
    <h1>Welcome</h1>
    <p>Authentication has been disabled. Use the public endpoints:</p>
    <ul>
      <li><a href="/test">GET /test</a></li>
      <li>POST /proxy</li>
      <li><a href="/dashboard">GET /dashboard</a></li>
    </ul>
</body>
</html>
`
	w.Header().Set("Content-Type", "text/html")
	w.Write([]byte(html))
}

// ProfileHandler handles GET /profile - returns current user profile
func (m *Middleware) ProfileHandler(w http.ResponseWriter, r *http.Request) {
	// Authentication removed; return a generic profile payload
	m.JSONResponse(w, true, "Profile retrieved successfully", map[string]interface{}{
		"logged_in": false,
		"user":      nil,
	})
}

// DashboardHandler serves the protected dashboard page with user authentication
func (m *Middleware) DashboardHandler(w http.ResponseWriter, r *http.Request) {
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
    </div>
    
    <div class="card">
        <h2>Welcome!</h2>
        <p>Authentication is disabled. This page is public.</p>
    </div>
    
    <div class="card">
        <h3>API Endpoints</h3>
        <ul>
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
