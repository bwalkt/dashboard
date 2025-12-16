package main

import (
	"encoding/json"
	"strconv"
	"time"

	"github.com/proxy-wasm/proxy-wasm-go-sdk/proxywasm"
)

const (
	sharedDataKeyPrefix = "challenge:"
	defaultTTL          = 3600 // 1 hour in seconds
)

// ChallengeCacheEntry represents a cached challenge entry with expiry
type ChallengeCacheEntry struct {
	Value     string `json:"value"`
	ExpiresAt uint32 `json:"expiresAt"`
}

// GetChallengeFromSharedData retrieves the expected answer for a challenge from Envoy shared data
func GetChallengeFromSharedData(challengeID string) (string, bool) {
	key := sharedDataKeyPrefix + challengeID

	value, cas, err := proxywasm.GetSharedData(key)
	if err != nil {
		proxywasm.LogWarnf("Failed to get shared data for key %s: %v", key, err)
		return "", false
	}

	if value == nil || len(value) == 0 {
		return "", false
	}

	// Parse the cached entry
	var entry ChallengeCacheEntry
	if err := json.Unmarshal(value, &entry); err != nil {
		// Fallback: treat as plain string for backward compatibility
		proxywasm.LogWarnf("Failed to parse cache entry for key %s, treating as plain string: %v", key, err)
		expectedAnswer := string(value)
		proxywasm.LogInfof("Found challenge in shared data (legacy format): %s (CAS: %d)", key, cas)
		return expectedAnswer, true
	}

	// Check if entry has expired
	currentTime := uint32(time.Now().Unix())
	if entry.ExpiresAt > 0 && currentTime >= entry.ExpiresAt {
		proxywasm.LogInfof("Challenge cache entry expired for key %s (expired at %d, current %d)", key, entry.ExpiresAt, currentTime)
		// Optionally delete expired entry
		_ = proxywasm.SetSharedData(key, nil, cas)
		return "", false
	}

	proxywasm.LogInfof("Found challenge in shared data: %s (CAS: %d, expires at %d)", key, cas, entry.ExpiresAt)
	return entry.Value, true
}

// SetChallengeInSharedData stores the expected answer for a challenge in Envoy shared data with TTL
func SetChallengeInSharedData(challengeID, expectedAnswer string, ttlSeconds uint32) error {
	key := sharedDataKeyPrefix + challengeID

	// Calculate expiry timestamp
	expiresAt := uint32(time.Now().Unix()) + ttlSeconds

	// Create cache entry with expiry
	entry := ChallengeCacheEntry{
		Value:     expectedAnswer,
		ExpiresAt: expiresAt,
	}

	// Serialize to JSON
	entryJSON, err := json.Marshal(entry)
	if err != nil {
		proxywasm.LogErrorf("Failed to marshal cache entry for key %s: %v", key, err)
		return err
	}

	// Use CAS token 0 for unconditional write
	err = proxywasm.SetSharedData(key, entryJSON, 0)
	if err != nil {
		proxywasm.LogErrorf("Failed to set shared data for key %s: %v", key, err)
		return err
	}

	proxywasm.LogInfof("Cached challenge in shared data: %s (TTL: %ds, expires at %d)", key, ttlSeconds, expiresAt)
	return nil
}

// SetChallengeInSharedDataWithDefaultTTL stores challenge with default TTL
func SetChallengeInSharedDataWithDefaultTTL(challengeID, expectedAnswer string) error {
	return SetChallengeInSharedData(challengeID, expectedAnswer, defaultTTL)
}

// ParseTTLFromResponse attempts to parse TTL from response headers or uses default
func ParseTTLFromResponse() uint32 {
	// Try to get TTL from response header if available
	ttlHeader, err := proxywasm.GetHttpResponseHeader("x-challenge-ttl")
	if err == nil && ttlHeader != "" {
		if ttl, err := strconv.ParseUint(ttlHeader, 10, 32); err == nil {
			return uint32(ttl)
		}
	}
	return defaultTTL
}

// GetCurrentTimeInSeconds returns current time in seconds (for TTL calculations)
func GetCurrentTimeInSeconds() uint32 {
	return uint32(time.Now().Unix())
}
