package main

import (
	"strconv"
	"time"

	"github.com/tetratelabs/proxy-wasm-go-sdk/proxywasm"
)

const (
	sharedDataKeyPrefix = "challenge:"
	defaultTTL          = 3600 // 1 hour in seconds
)

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

	expectedAnswer := string(value)
	proxywasm.LogInfof("Found challenge in shared data: %s (CAS: %d)", key, cas)
	return expectedAnswer, true
}

// SetChallengeInSharedData stores the expected answer for a challenge in Envoy shared data with TTL
func SetChallengeInSharedData(challengeID, expectedAnswer string, ttlSeconds uint32) error {
	key := sharedDataKeyPrefix + challengeID

	err := proxywasm.SetSharedData(key, []byte(expectedAnswer), ttlSeconds)
	if err != nil {
		proxywasm.LogErrorf("Failed to set shared data for key %s: %v", key, err)
		return err
	}

	proxywasm.LogInfof("Cached challenge in shared data: %s (TTL: %ds)", key, ttlSeconds)
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
	// In WASM context, we use TTL directly, not absolute timestamps
	// This is a placeholder if needed for future enhancements
	return uint32(time.Now().Unix())
}


