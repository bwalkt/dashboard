package main

import (
	"testing"
)

func TestDatabaseOperations(t *testing.T) {
	// Create a test database
	db, err := NewDatabase(":memory:")
	if err != nil {
		t.Fatalf("Failed to create test database: %v", err)
	}
	defer db.Close()

	// Test creating a user
	user, err := db.CreateOrUpdateUser(
		12345,
		"testuser",
		"test@example.com",
		"Test User",
		"https://avatars.githubusercontent.com/u/12345",
	)
	if err != nil {
		t.Fatalf("Failed to create user: %v", err)
	}

	if user.GitHubID != 12345 {
		t.Errorf("Expected GitHubID 12345, got %d", user.GitHubID)
	}

	if user.Username != "testuser" {
		t.Errorf("Expected username 'testuser', got '%s'", user.Username)
	}

	// Test retrieving the user
	retrievedUser, err := db.GetUserByID(user.ID)
	if err != nil {
		t.Fatalf("Failed to retrieve user: %v", err)
	}

	if retrievedUser.GitHubID != user.GitHubID {
		t.Errorf("Retrieved user GitHubID doesn't match: expected %d, got %d", user.GitHubID, retrievedUser.GitHubID)
	}

	// Test updating the user
	updatedUser, err := db.CreateOrUpdateUser(
		12345,
		"updateduser",
		"updated@example.com",
		"Updated User",
		"https://avatars.githubusercontent.com/u/12345",
	)
	if err != nil {
		t.Fatalf("Failed to update user: %v", err)
	}

	if updatedUser.Username != "updateduser" {
		t.Errorf("Expected updated username 'updateduser', got '%s'", updatedUser.Username)
	}

	if updatedUser.ID != user.ID {
		t.Errorf("User ID should remain the same after update: expected %s, got %s", user.ID, updatedUser.ID)
	}
}

func TestJWTToken(t *testing.T) {
	authConfig := &AuthConfig{
		JWTSecret: "test-secret",
	}

	// Test generating JWT
	token, err := authConfig.generateJWT("user123", "testuser")
	if err != nil {
		t.Fatalf("Failed to generate JWT: %v", err)
	}

	if token == "" {
		t.Error("Generated token is empty")
	}

	// Test validating JWT
	claims, err := authConfig.ValidateJWT(token)
	if err != nil {
		t.Fatalf("Failed to validate JWT: %v", err)
	}

	if claims.UserID != "user123" {
		t.Errorf("Expected UserID 'user123', got '%s'", claims.UserID)
	}

	if claims.Username != "testuser" {
		t.Errorf("Expected Username 'testuser', got '%s'", claims.Username)
	}

	// Test validating invalid token
	_, err = authConfig.ValidateJWT("invalid-token")
	if err == nil {
		t.Error("Expected error for invalid token")
	}
}
