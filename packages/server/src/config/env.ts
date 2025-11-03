import dotenv from "dotenv";
import type { EnvironmentConfig } from "../types/index";

// Load environment variables from .env file only when running locally (not in Docker)
// In Docker, environment variables are provided at runtime via docker-compose
if (
  !process.env.DOCKER_CONTAINER &&
  !process.env.NODE_ENV?.includes("docker")
) {
  dotenv.config();
}
const serverUrl = process.env.SERVER_BASE_URL || "http://localhost:8090";
// remove port
const domain = serverUrl.replace(/^https?:\/\//, "").replace(/\/$/, "").split(":")[0];

export const config: EnvironmentConfig = {
  GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID || "",
  GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET || "",
  JWT_SECRET:
    process.env.JWT_SECRET || "default-secret-key-change-in-production",
  POSTGRES_HOST: process.env.POSTGRES_HOST || "localhost",
  POSTGRES_PORT: parseInt(process.env.POSTGRES_PORT || "5432", 10),
  POSTGRES_USER: process.env.POSTGRES_USER || "postgres",
  POSTGRES_PASSWORD: process.env.POSTGRES_PASSWORD || "postgres",
  POSTGRES_DB: process.env.POSTGRES_DB || "pzero",
  REDIS_HOST: process.env.REDIS_HOST || "localhost",
  REDIS_PORT: parseInt(process.env.REDIS_PORT || "6379", 10),
  BREVO_API_KEY: process.env.BREVO_API_KEY || "",
  BREVO_SENDER_EMAIL: process.env.BREVO_SENDER_EMAIL || "",
  BREVO_SENDER_NAME: process.env.BREVO_SENDER_NAME || "P-Zero",
  SIGNALWIRE_PROJECT_ID: process.env.SIGNALWIRE_PROJECT_ID || "",
  SIGNALWIRE_TOKEN: process.env.SIGNALWIRE_TOKEN || "",
  SIGNALWIRE_PHONE_NUMBER: process.env.SIGNALWIRE_PHONE_NUMBER || "",
  OAUTH_REDIRECT_URL: process.env.OAUTH_REDIRECT_URL || "http://localhost:1420",
  SERVER_BASE_URL: process.env.SERVER_BASE_URL || "http://localhost:8090",
  DOMAIN: domain,
};

/**
 * Validates that required environment variables are set and warns about insecure defaults.
 *
 * Checks for GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, and JWT_SECRET; if any are missing it logs the missing keys,
 * prints environment-specific guidance (Docker vs .env), and terminates the process with exit code 1.
 *
 * If JWT_SECRET equals the default development value, logs a warning advising to set a production secret.
 */
export function validateEnvironment(): void {
  const requiredVars = [
    "GITHUB_CLIENT_ID",
    "GITHUB_CLIENT_SECRET",
    "JWT_SECRET",
    "BREVO_API_KEY",
    "BREVO_SENDER_EMAIL",
    "SIGNALWIRE_PROJECT_ID",
    "SIGNALWIRE_TOKEN",
    "SIGNALWIRE_PHONE_NUMBER",
  ];

  const missingVars = requiredVars.filter((varName) => !process.env[varName]);

  if (missingVars.length > 0) {
    console.error("❌ Missing required environment variables:");
    missingVars.forEach((varName) => {
      console.error(`   - ${varName}`);
    });

    // Provide different instructions based on environment
    if (
      process.env.DOCKER_CONTAINER ||
      process.env.NODE_ENV?.includes("docker")
    ) {
      console.error(
        "\n📝 Please ensure all required variables are set in docker-compose.yml.",
      );
    } else {
      console.error(
        "\n📝 Please check your .env file and ensure all required variables are set.",
      );
    }
    console.error("📄 See env.example for reference.");
    process.exit(1);
  }

  // Warn about default JWT secret
  if (config.JWT_SECRET === "default-secret-key-change-in-production") {
    console.warn(
      "⚠️  Using default JWT secret. Please set JWT_SECRET environment variable for production.",
    );
  }
}
