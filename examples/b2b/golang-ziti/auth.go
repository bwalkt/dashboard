// Package main implements GitHub OAuth authentication with JWT tokens
// This module provides authentication functionality matching the vanilla server API
package main

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strconv"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/gorilla/sessions"
	"golang.org/x/oauth2"
	"golang.org/x/oauth2/github"
)

// GitHubUser represents user data from GitHub API
type GitHubUser struct {
	ID        int64  `json:"id"`
	Login     string `json:"login"`
	Email     string `json:"email"`
	Name      string `json:"name"`
	AvatarURL string `json:"avatar_url"`
}

// AuthConfig holds OAuth and JWT configuration
type AuthConfig struct {
	OAuthConfig *oauth2.Config
	Store       *sessions.CookieStore
	JWTSecret   string
}

// Claims represents JWT token claims for access tokens
type Claims struct {
	UserID   string `json:"user_id"`
	Username string `json:"username"`
	Email    string `json:"email"`
	jwt.RegisteredClaims
}

// AccessTokenPayload represents the payload of an access token
type AccessTokenPayload struct {
	UserID   string `json:"user_id"`
	Username string `json:"username"`
	Email    string `json:"email"`
	Exp      int64  `json:"exp"`
	Iat      int64  `json:"iat"`
}

// RefreshTokenPayload represents the payload of a refresh token
type RefreshTokenPayload struct {
	UserID string `json:"user_id"`
	Type   string `json:"type"`
	Exp    int64  `json:"exp"`
	Iat    int64  `json:"iat"`
}

// NewAuthConfig creates a new authentication configuration from environment variables
func NewAuthConfig() *AuthConfig {
	clientID := os.Getenv("GITHUB_CLIENT_ID")
	clientSecret := os.Getenv("GITHUB_CLIENT_SECRET")
	redirectURL := os.Getenv("GITHUB_REDIRECT_URL")
	jwtSecret := os.Getenv("JWT_SECRET")

	if clientID == "" || clientSecret == "" {
		log.Fatal("GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET environment variables are required")
	}

	if redirectURL == "" {
		redirectURL = "http://localhost:8080/auth/callback"
	}

	if jwtSecret == "" {
		jwtSecret = "your-secret-key-change-this-in-production"
	}

	config := &oauth2.Config{
		ClientID:     clientID,
		ClientSecret: clientSecret,
		RedirectURL:  redirectURL,
		Scopes:       []string{"user:email"},
		Endpoint:     github.Endpoint,
	}

	store := sessions.NewCookieStore([]byte(jwtSecret))

	return &AuthConfig{
		OAuthConfig: config,
		Store:       store,
		JWTSecret:   jwtSecret,
	}
}

// LoginHandler initiates the GitHub OAuth flow by redirecting to GitHub
func (ac *AuthConfig) LoginHandler(w http.ResponseWriter, r *http.Request) {
	state := generateRandomState()
	session, _ := ac.Store.Get(r, "auth-session")
	session.Values["state"] = state
	session.Save(r, w)

	url := ac.OAuthConfig.AuthCodeURL(state)
	http.Redirect(w, r, url, http.StatusTemporaryRedirect)
}

// CallbackHandler handles the OAuth callback from GitHub and creates user session
func (ac *AuthConfig) CallbackHandler(db *Database) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		session, _ := ac.Store.Get(r, "auth-session")
		state := session.Values["state"]

		if r.URL.Query().Get("state") != state {
			http.Error(w, "Invalid state parameter", http.StatusBadRequest)
			return
		}

		code := r.URL.Query().Get("code")
		if code == "" {
			http.Error(w, "Authorization code not provided", http.StatusBadRequest)
			return
		}

		token, err := ac.OAuthConfig.Exchange(context.Background(), code)
		if err != nil {
			http.Error(w, "Failed to exchange token", http.StatusInternalServerError)
			return
		}

		client := ac.OAuthConfig.Client(context.Background(), token)
		resp, err := client.Get("https://api.github.com/user")
		if err != nil {
			http.Error(w, "Failed to get user info", http.StatusInternalServerError)
			return
		}
		defer resp.Body.Close()

		body, err := io.ReadAll(resp.Body)
		if err != nil {
			http.Error(w, "Failed to read response", http.StatusInternalServerError)
			return
		}

		var githubUser GitHubUser
		if err := json.Unmarshal(body, &githubUser); err != nil {
			http.Error(w, "Failed to parse user info", http.StatusInternalServerError)
			return
		}

		// Get user email if not provided in user info
		if githubUser.Email == "" {
			emailResp, err := client.Get("https://api.github.com/user/emails")
			if err == nil {
				defer emailResp.Body.Close()
				emailBody, err := io.ReadAll(emailResp.Body)
				if err == nil {
					var emails []struct {
						Email   string `json:"email"`
						Primary bool   `json:"primary"`
					}
					if json.Unmarshal(emailBody, &emails) == nil {
						for _, email := range emails {
							if email.Primary {
								githubUser.Email = email.Email
								break
							}
						}
					}
				}
			}
		}

		// Create or update user in database
		user, err := db.CreateOrUpdateUser(
			githubUser.ID,
			githubUser.Login,
			githubUser.Email,
			githubUser.Name,
			githubUser.AvatarURL,
		)
		if err != nil {
			http.Error(w, "Failed to save user", http.StatusInternalServerError)
			return
		}

		// Generate JWT token pair
		accessToken, refreshToken, err := ac.GenerateTokenPair(user.ID, user.Username, user.Email)
		if err != nil {
			http.Error(w, "Failed to generate token", http.StatusInternalServerError)
			return
		}

		// Set JWT cookies
		ac.SetJWTCookies(w, accessToken, refreshToken)

		// Set session (for backward compatibility)
		session.Values["user_id"] = user.ID
		session.Values["username"] = user.Username
		session.Values["email"] = user.Email
		session.Values["jwt_token"] = accessToken
		session.Save(r, w)

		// Redirect to dashboard or home page
		http.Redirect(w, r, "/dashboard", http.StatusTemporaryRedirect)
	}
}

func (ac *AuthConfig) LogoutHandler(w http.ResponseWriter, r *http.Request) {
	// Clear JWT cookies
	ac.ClearJWTCookies(w)

	// Clear session
	session, _ := ac.Store.Get(r, "auth-session")
	session.Values["user_id"] = nil
	session.Values["username"] = nil
	session.Values["email"] = nil
	session.Values["jwt_token"] = nil
	session.Options.MaxAge = -1
	session.Save(r, w)

	http.Redirect(w, r, "/", http.StatusTemporaryRedirect)
}

func (ac *AuthConfig) generateJWT(userID, username string) (string, error) {
	claims := Claims{
		UserID:   userID,
		Username: username,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(24 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			NotBefore: jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(ac.JWTSecret))
}

func (ac *AuthConfig) ValidateJWT(tokenString string) (*Claims, error) {
	claims := &Claims{}
	token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
		return []byte(ac.JWTSecret), nil
	})

	if err != nil {
		return nil, err
	}

	if !token.Valid {
		return nil, fmt.Errorf("invalid token")
	}

	return claims, nil
}

func generateRandomState() string {
	return strconv.FormatInt(time.Now().UnixNano(), 36)
}

// Generate access token with HS512 algorithm (matching vanilla server)
func (ac *AuthConfig) GenerateAccessToken(userID, username, email string) (string, error) {
	claims := Claims{
		UserID:   userID,
		Username: username,
		Email:    email,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(1 * time.Hour)), // 1 hour
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			NotBefore: jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS512, claims)
	return token.SignedString([]byte(ac.JWTSecret))
}

// Generate refresh token with HS512 algorithm (matching vanilla server)
func (ac *AuthConfig) GenerateRefreshToken(userID string) (string, error) {
	claims := jwt.MapClaims{
		"user_id": userID,
		"type":    "refresh",
		"exp":     time.Now().Add(30 * 24 * time.Hour).Unix(), // 30 days
		"iat":     time.Now().Unix(),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS512, claims)
	return token.SignedString([]byte(ac.JWTSecret))
}

// Generate both access and refresh tokens
func (ac *AuthConfig) GenerateTokenPair(userID, username, email string) (string, string, error) {
	accessToken, err := ac.GenerateAccessToken(userID, username, email)
	if err != nil {
		return "", "", err
	}

	refreshToken, err := ac.GenerateRefreshToken(userID)
	if err != nil {
		return "", "", err
	}

	return accessToken, refreshToken, nil
}

// Verify access token and return payload
func (ac *AuthConfig) VerifyAccessToken(tokenString string) (*AccessTokenPayload, error) {
	claims := &Claims{}
	token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
		return []byte(ac.JWTSecret), nil
	})

	if err != nil {
		return nil, err
	}

	if !token.Valid {
		return nil, fmt.Errorf("invalid token")
	}

	return &AccessTokenPayload{
		UserID:   claims.UserID,
		Username: claims.Username,
		Email:    claims.Email,
		Exp:      claims.ExpiresAt.Time.Unix(),
		Iat:      claims.IssuedAt.Time.Unix(),
	}, nil
}

// Verify refresh token and return payload
func (ac *AuthConfig) VerifyRefreshToken(tokenString string) (*RefreshTokenPayload, error) {
	claims := jwt.MapClaims{}
	token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
		return []byte(ac.JWTSecret), nil
	})

	if err != nil {
		return nil, err
	}

	if !token.Valid {
		return nil, fmt.Errorf("invalid token")
	}

	userID, ok := claims["user_id"].(string)
	if !ok {
		return nil, fmt.Errorf("invalid user_id in token")
	}

	tokenType, ok := claims["type"].(string)
	if !ok || tokenType != "refresh" {
		return nil, fmt.Errorf("invalid token type")
	}

	return &RefreshTokenPayload{
		UserID: userID,
		Type:   tokenType,
		Exp:    int64(claims["exp"].(float64)),
		Iat:    int64(claims["iat"].(float64)),
	}, nil
}

// Extract token from Authorization header
func (ac *AuthConfig) ExtractTokenFromHeader(authHeader string) string {
	if authHeader == "" {
		return ""
	}

	// Check if it starts with "Bearer "
	if len(authHeader) > 7 && authHeader[:7] == "Bearer " {
		return authHeader[7:]
	}

	return ""
}

// Extract token from cookies
func (ac *AuthConfig) ExtractTokenFromCookies(cookies map[string]string) string {
	if cookies == nil {
		return ""
	}
	return cookies["accessToken"]
}

// Extract refresh token from cookies
func (ac *AuthConfig) ExtractRefreshTokenFromCookies(cookies map[string]string) string {
	if cookies == nil {
		return ""
	}
	return cookies["refreshToken"]
}

// Set JWT cookies
func (ac *AuthConfig) SetJWTCookies(w http.ResponseWriter, accessToken, refreshToken string) {
	// Set access token cookie
	http.SetCookie(w, &http.Cookie{
		Name:     "accessToken",
		Value:    accessToken,
		HttpOnly: true,
		Secure:   false, // Set to true in production with HTTPS
		SameSite: http.SameSiteLaxMode,
		Path:     "/",
		MaxAge:   3600, // 1 hour
	})

	// Set refresh token cookie
	http.SetCookie(w, &http.Cookie{
		Name:     "refreshToken",
		Value:    refreshToken,
		HttpOnly: true,
		Secure:   false, // Set to true in production with HTTPS
		SameSite: http.SameSiteLaxMode,
		Path:     "/",
		MaxAge:   3600 * 24 * 30, // 30 days
	})
}

// Clear JWT cookies
func (ac *AuthConfig) ClearJWTCookies(w http.ResponseWriter) {
	http.SetCookie(w, &http.Cookie{
		Name:     "accessToken",
		Value:    "",
		HttpOnly: true,
		Secure:   false,
		SameSite: http.SameSiteLaxMode,
		Path:     "/",
		MaxAge:   -1,
	})

	http.SetCookie(w, &http.Cookie{
		Name:     "refreshToken",
		Value:    "",
		HttpOnly: true,
		Secure:   false,
		SameSite: http.SameSiteLaxMode,
		Path:     "/",
		MaxAge:   -1,
	})
}
