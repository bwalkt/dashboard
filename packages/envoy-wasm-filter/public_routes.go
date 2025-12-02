package main

import (
	"strings"
)

// PublicRoutes contains the list of public routes that should bypass challenge validation
var PublicRoutes = []PublicRoute{
	{Path: "/health", Exact: true},
	{Prefix: "/auth/"},
	{Prefix: "/centrifugo/"},
	{Prefix: "/sms/"},
	{Prefix: "/email/"},
	{Prefix: "/proxy/auth/login"},
	{Prefix: "/proxy/auth/callback"},
	{Path: "/faq", Exact: true},
	{Path: "/terms", Exact: true},
	{Prefix: "/public"},
	{Prefix: "/docs"},
	{Prefix: "/assets"},
}

// PublicRoute represents a public route pattern
type PublicRoute struct {
	Path   string
	Prefix string
	Exact  bool
}

// IsPublicRoute checks if the given path and method should bypass challenge validation
func IsPublicRoute(path, method string) bool {
	// Always allow OPTIONS requests (CORS preflight)
	if method == "OPTIONS" {
		return true
	}

	// Check against public route patterns
	for _, route := range PublicRoutes {
		if route.Exact {
			if path == route.Path {
				return true
			}
		} else if route.Prefix != "" {
			if strings.HasPrefix(path, route.Prefix) {
				return true
			}
		} else if route.Path != "" {
			if path == route.Path {
				return true
			}
		}
	}

	return false
}


