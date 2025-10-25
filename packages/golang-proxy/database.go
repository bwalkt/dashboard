package main

import (
	"database/sql"
	"fmt"
	"time"

	"github.com/google/uuid"
	_ "modernc.org/sqlite"
)

type User struct {
	ID        string    `json:"id"`
	GitHubID  int64     `json:"github_id"`
	Username  string    `json:"username"`
	Email     string    `json:"email"`
	Name      string    `json:"name"`
	AvatarURL string    `json:"avatar_url"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type Database struct {
	db *sql.DB
}

func NewDatabase(dbPath string) (*Database, error) {
	db, err := sql.Open("sqlite", dbPath)
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}

	database := &Database{db: db}
	if err := database.createTables(); err != nil {
		return nil, fmt.Errorf("failed to create tables: %w", err)
	}

	return database, nil
}

func (d *Database) createTables() error {
	query := `
	CREATE TABLE IF NOT EXISTS users (
		id TEXT PRIMARY KEY,
		github_id INTEGER UNIQUE NOT NULL,
		username TEXT NOT NULL,
		email TEXT,
		name TEXT,
		avatar_url TEXT,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);
	
	CREATE INDEX IF NOT EXISTS idx_users_github_id ON users(github_id);
	CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
	`

	_, err := d.db.Exec(query)
	return err
}

func (d *Database) CreateOrUpdateUser(githubID int64, username, email, name, avatarURL string) (*User, error) {
	// Check if user exists
	var existingUser User
	query := "SELECT id, github_id, username, email, name, avatar_url, created_at, updated_at FROM users WHERE github_id = ?"
	err := d.db.QueryRow(query, githubID).Scan(
		&existingUser.ID,
		&existingUser.GitHubID,
		&existingUser.Username,
		&existingUser.Email,
		&existingUser.Name,
		&existingUser.AvatarURL,
		&existingUser.CreatedAt,
		&existingUser.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		// User doesn't exist, create new one
		userID := uuid.New().String()
		now := time.Now()

		insertQuery := `
		INSERT INTO users (id, github_id, username, email, name, avatar_url, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?)
		`

		_, err = d.db.Exec(insertQuery, userID, githubID, username, email, name, avatarURL, now, now)
		if err != nil {
			return nil, fmt.Errorf("failed to create user: %w", err)
		}

		return &User{
			ID:        userID,
			GitHubID:  githubID,
			Username:  username,
			Email:     email,
			Name:      name,
			AvatarURL: avatarURL,
			CreatedAt: now,
			UpdatedAt: now,
		}, nil
	} else if err != nil {
		return nil, fmt.Errorf("failed to query user: %w", err)
	}

	// User exists, update if needed
	now := time.Now()
	updateQuery := `
	UPDATE users 
	SET username = ?, email = ?, name = ?, avatar_url = ?, updated_at = ?
	WHERE github_id = ?
	`

	_, err = d.db.Exec(updateQuery, username, email, name, avatarURL, now, githubID)
	if err != nil {
		return nil, fmt.Errorf("failed to update user: %w", err)
	}

	existingUser.Username = username
	existingUser.Email = email
	existingUser.Name = name
	existingUser.AvatarURL = avatarURL
	existingUser.UpdatedAt = now

	return &existingUser, nil
}

func (d *Database) GetUserByID(userID string) (*User, error) {
	var user User
	query := "SELECT id, github_id, username, email, name, avatar_url, created_at, updated_at FROM users WHERE id = ?"
	err := d.db.QueryRow(query, userID).Scan(
		&user.ID,
		&user.GitHubID,
		&user.Username,
		&user.Email,
		&user.Name,
		&user.AvatarURL,
		&user.CreatedAt,
		&user.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("user not found")
	} else if err != nil {
		return nil, fmt.Errorf("failed to get user: %w", err)
	}

	return &user, nil
}

func (d *Database) GetUserByGitHubID(githubID int64) (*User, error) {
	var user User
	query := "SELECT id, github_id, username, email, name, avatar_url, created_at, updated_at FROM users WHERE github_id = ?"
	err := d.db.QueryRow(query, githubID).Scan(
		&user.ID,
		&user.GitHubID,
		&user.Username,
		&user.Email,
		&user.Name,
		&user.AvatarURL,
		&user.CreatedAt,
		&user.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("user not found")
	} else if err != nil {
		return nil, fmt.Errorf("failed to get user: %w", err)
	}

	return &user, nil
}

func (d *Database) Close() error {
	return d.db.Close()
}
