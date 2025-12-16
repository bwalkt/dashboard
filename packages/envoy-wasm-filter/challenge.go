package main

import (
	"strings"

	"github.com/proxy-wasm/proxy-wasm-go-sdk/proxywasm"
)

const (
	challengeIDHeader    = "x-challenge-id"
	challengeAnswerHeader = "x-challenge-answer"
)

// ChallengeHeaders represents the challenge headers from the request
type ChallengeHeaders struct {
	ChallengeID    string
	ChallengeAnswer string
}

// ExtractChallengeHeaders extracts challenge headers from the request
func ExtractChallengeHeaders() (*ChallengeHeaders, error) {
	challengeID, err := proxywasm.GetHttpRequestHeader(challengeIDHeader)
	if err != nil {
		return nil, err
	}

	challengeAnswer, err := proxywasm.GetHttpRequestHeader(challengeAnswerHeader)
	if err != nil {
		return nil, err
	}

	// Trim whitespace
	challengeID = strings.TrimSpace(challengeID)
	challengeAnswer = strings.TrimSpace(challengeAnswer)

	return &ChallengeHeaders{
		ChallengeID:    challengeID,
		ChallengeAnswer: challengeAnswer,
	}, nil
}

// ValidateChallengeFormat validates that challenge headers are present and non-empty
func (c *ChallengeHeaders) ValidateFormat() bool {
	return c.ChallengeID != "" && c.ChallengeAnswer != "" &&
		len(c.ChallengeID) > 0 && len(c.ChallengeAnswer) > 0
}

// ValidateAnswer compares the provided answer with the expected answer
func ValidateAnswer(providedAnswer, expectedAnswer string) bool {
	return providedAnswer == expectedAnswer
}

