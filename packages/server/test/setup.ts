import { afterAll, afterEach, beforeAll, beforeEach } from "vitest";
import { config } from "../src/config/env";

// Import mocks
import "./mocks/redis";
import "./mocks/database";
import "./mocks/external-services";

// Test environment setup
beforeAll(async () => {
  // Set test environment variables - override only what's needed for tests
  process.env.NODE_ENV = "test";

  // Use test-specific values only if not already set
  if (!process.env.JWT_SECRET) {
    process.env.JWT_SECRET = "test-jwt-secret-key-for-testing-only";
  }

  if (!process.env.DATABASE_URL) {
    process.env.DATABASE_URL =
      process.env.TEST_DATABASE_URL ||
      "postgresql://test:test@localhost:5432/pzero_test";
  }

  if (!process.env.REDIS_URL) {
    process.env.REDIS_URL =
      process.env.TEST_REDIS_URL || "redis://localhost:6379/1";
  }

  // Mock external services for testing (only if not set)
  if (!process.env.BREVO_API_KEY) {
    process.env.BREVO_API_KEY = "test-api-key";
  }

  if (!process.env.SIGNALWIRE_PROJECT_ID) {
    process.env.SIGNALWIRE_PROJECT_ID = "test-project-id";
  }

  if (!process.env.SIGNALWIRE_TOKEN) {
    process.env.SIGNALWIRE_TOKEN = "test-token";
  }

  // Additional test environment config - use config defaults
  if (!process.env.OAUTH_REDIRECT_URL) {
    process.env.OAUTH_REDIRECT_URL = "http://localhost:1430"; // Portal port
  }

  if (!process.env.SERVER_BASE_URL) {
    process.env.SERVER_BASE_URL = "http://localhost:8090"; // Server port
  }

  // Ensure we use the config defaults by importing after env setup
  console.log("Test environment configured with config:", {
    NODE_ENV: process.env.NODE_ENV,
    hasJWTSecret: !!config.JWT_SECRET,
    hasDBConfig: !!config.POSTGRES_HOST,
    redisUrl: config.REDIS_URL,
    serverBaseUrl: config.SERVER_BASE_URL,
  });
});

afterAll(async () => {
  // Cleanup after all tests
});

beforeEach(async () => {
  // Setup before each test
});

afterEach(async () => {
  // Cleanup after each test
});
