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
const domain =
  serverUrl
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "")
    .split(":")[0] || "localhost";

// Environment variables
export interface EnvironmentConfig {
  POSTGRES_IDLE_TIMEOUT: number;
  POSTGRES_CONNECTION_TIMEOUT: number;
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  JWT_SECRET: string;
  POSTGRES_HOST: string;
  POSTGRES_PORT: number;
  POSTGRES_USER: string;
  POSTGRES_PASSWORD: string;
  POSTGRES_DB: string;
  REDIS_HOST: string;
  REDIS_PORT: number;
  BREVO_API_KEY: string;
  BREVO_SENDER_EMAIL: string;
  BREVO_SENDER_NAME: string;
  SIGNALWIRE_PROJECT_ID: string;
  SIGNALWIRE_TOKEN: string;
  SIGNALWIRE_PHONE_NUMBER: string;
  PORT?: number;
  OAUTH_REDIRECT_URL: string;
  SERVER_BASE_URL?: string;
  DOMAIN?: string;
  POSTGRES_MAX_CLIENTS?: number;
  CORS_ALLOW_ORIGINS?: string | string[];
  CORS_ALLOW_CREDENTIALS?: boolean;
  CORS_EXPOSED_HEADERS?: string | string[];
  CORS_ALLOWED_HEADERS?: string | string[];
}
const DEFAULT_ALLOWED_HEADERS = [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "Accept",
      "traceparent",
      "x-client-type",
      "x-auth-token",
      "tracestate",
      "X-Custom-Auth",
      "x-grpc-web",
      "x-grpc-web-accept-encoding",
      "X-Custom-Header"
  ];
const DEFAULT_EXPOSED_HEADERS = [
      "Content-Range",
      "X-Content-Range"
  ];  
function parserOnlyArray(envVar: string | undefined, def?: string): string[]  {
  if (!envVar) {
    if (def) {
      return [def]
     } else {
       return [];
    }
  }
  return  envVar.split(",").map((item) => item.trim());
}
function parserArray(envVar: string | undefined, def?: string): string[] | string | undefined {
  if (!envVar) return def || undefined;
  const vars = envVar.split(",").map((item) => item.trim());
  return vars.length === 1 ? vars[0] : vars;
}
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
  POSTGRES_IDLE_TIMEOUT: parseInt(process.env.POSTGRES_IDLE_TIMEOUT || "30000", 10),
  POSTGRES_CONNECTION_TIMEOUT: parseInt(process.env.POSTGRES_CONNECTION_TIMEOUT || "2000", 10),
  POSTGRES_MAX_CLIENTS: parseInt(process.env.POSTGRES_MAX_CLIENTS || "20", 10),
  CORS_ALLOWED_ORIGINS: parserArray(process.env.CORS_ALLOWED_ORIGINS, "*"),
  CORS_ALLOW_CREDENTIALS: process.env.CORS_ALLOW_CREDENTIALS === "true",
  CORS_EXPOSED_HEADERS: parserOnlyArray(process.env.CORS_EXPOSED_HEADERS, DEFAULT_EXPOSED_HEADERS.join(",")),
  CORS_ALLOWED_HEADERS: parserOnlyArray(process.env.CORS_ALLOWED_HEADERS, DEFAULT_ALLOWED_HEADERS.join(",")),
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
