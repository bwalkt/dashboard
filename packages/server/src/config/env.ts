import dotenv from "dotenv";

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
  NODE_ENV: string;
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
  REDIS_URL: string;
  BREVO_API_KEY: string;
  BREVO_SENDER_EMAIL: string;
  BREVO_SENDER_NAME: string;
  TWILIO_ACCOUNT_SID: string;
  TWILIO_API_KEY: string;
  TWILIO_API_SECRET: string;
  TWILIO_VERIFY_SERVICE_SID: string;
  TWILIO_PHONE_NUMBER: string;
  TWILIO_MESSAGE: string;
  PORT: number;
  SERVER_BASE_URL: string;
  FRONTEND_URL: string | undefined;
  DOMAIN: string;
  POSTGRES_MAX_CLIENTS?: number;
  CORS_ALLOWED_ORIGINS: string | string[];
  CORS_ALLOW_CREDENTIALS?: boolean;
  CORS_EXPOSED_HEADERS: string[];
  CORS_ALLOWED_HEADERS: string[];
  EMAIL_EXPIRY_MINUTES: number;
  ALLOWED_DOMAINS: string | undefined;
  COOKIE_DOMAIN: string | undefined;
  LOGO_PUBLIC_URL: string | undefined;
  SIGNOZ_API_URL: string | undefined;
  SIGNOZ_API_KEY: string | undefined;
  REDIS_STATUS_NAMESPACE: string;
  REDIS_STATUS_TTL_SECONDS: number;
  STATS_API_KEY: string | undefined;
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
  "X-Custom-Header",
  "X-Test-Eval",
];

const DEFAULT_EXPOSED_HEADERS = [
  "Content-Range",
  "X-Content-Range",
  "X-Test-Eval",
];
function parserOnlyArray(envVar: string | undefined, def?: string[]): string[] {
  if (!envVar) {
    return def ?? [];
  }
  return envVar.split(",").map((item) => item.trim());
}
function parserArray(
  envVar: string | undefined,
  def: string,
): string | string[] {
  if (!envVar) return def;
  const vars = envVar
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
  if (vars.length === 0) return def;
  return vars.length === 1 ? vars[0] || def : vars;
}
export const config: EnvironmentConfig = {
  NODE_ENV: process.env.NODE_ENV || "development",
  GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID || "",
  GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET || "",
  JWT_SECRET:
    process.env.JWT_SECRET || "default-secret-key-change-in-production",
  POSTGRES_HOST: process.env.POSTGRES_HOST || "localhost",
  POSTGRES_PORT: parseInt(process.env.POSTGRES_PORT || "5432", 10),
  POSTGRES_USER: process.env.POSTGRES_USER || "postgres",
  POSTGRES_PASSWORD: process.env.POSTGRES_PASSWORD || "postgres",
  POSTGRES_DB: process.env.POSTGRES_DB || "pzero",
  REDIS_URL:
    process.env.REDIS_URL ||
    (() => {
      // Fallback: construct URL from individual components for backward compatibility
      const host = process.env.REDIS_HOST || "localhost";
      const port = process.env.REDIS_PORT || "6379";
      const username = process.env.REDIS_USERNAME;
      const password = process.env.REDIS_PASSWORD;
      if (username && password) {
        return `redis://${encodeURIComponent(username)}:${encodeURIComponent(password)}@${host}:${port}`;
      } else if (password) {
        return `redis://:${encodeURIComponent(password)}@${host}:${port}`;
      }
      return `redis://${host}:${port}`;
    })(),
  BREVO_API_KEY: process.env.BREVO_API_KEY || "",
  BREVO_SENDER_EMAIL: process.env.BREVO_SENDER_EMAIL || "",
  BREVO_SENDER_NAME: process.env.BREVO_SENDER_NAME || "P-Zero",
  TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID || "",
  TWILIO_API_KEY: process.env.TWILIO_API_KEY || "",
  TWILIO_API_SECRET: process.env.TWILIO_API_SECRET || "",
  TWILIO_VERIFY_SERVICE_SID: process.env.TWILIO_VERIFY_SERVICE_SID || "",
  TWILIO_PHONE_NUMBER: process.env.TWILIO_PHONE_NUMBER || "",
  TWILIO_MESSAGE: process.env.TWILIO_MESSAGE || "",
  PORT: process.env.PORT ? parseInt(process.env.PORT, 10) : 8090,
  SERVER_BASE_URL: process.env.SERVER_BASE_URL || "http://localhost:8090",
  FRONTEND_URL: process.env.FRONTEND_URL,
  DOMAIN: domain,
  POSTGRES_IDLE_TIMEOUT: parseInt(
    process.env.POSTGRES_IDLE_TIMEOUT || "30000",
    10,
  ),
  POSTGRES_CONNECTION_TIMEOUT: parseInt(
    process.env.POSTGRES_CONNECTION_TIMEOUT || "2000",
    10,
  ),
  POSTGRES_MAX_CLIENTS: parseInt(process.env.POSTGRES_MAX_CLIENTS || "20", 10),
  CORS_ALLOWED_ORIGINS: parserArray(process.env.CORS_ALLOWED_ORIGINS, "*"),
  CORS_ALLOW_CREDENTIALS: process.env.CORS_ALLOW_CREDENTIALS === "true",
  CORS_EXPOSED_HEADERS: parserOnlyArray(
    process.env.CORS_EXPOSED_HEADERS,
    DEFAULT_EXPOSED_HEADERS,
  ),
  CORS_ALLOWED_HEADERS: parserOnlyArray(
    process.env.CORS_ALLOWED_HEADERS,
    DEFAULT_ALLOWED_HEADERS,
  ),
  EMAIL_EXPIRY_MINUTES: parseInt(process.env.EMAIL_EXPIRY_MINUTES || "100", 10),
  ALLOWED_DOMAINS: process.env.ALLOWED_DOMAINS,
  COOKIE_DOMAIN: process.env.COOKIE_DOMAIN,
  LOGO_PUBLIC_URL: process.env.LOGO_PUBLIC_URL,
  SIGNOZ_API_URL: process.env.SIGNOZ_API_URL,
  SIGNOZ_API_KEY: process.env.SIGNOZ_API_KEY,
  // Redis cache configuration for user status
  REDIS_STATUS_NAMESPACE: process.env.REDIS_STATUS_NAMESPACE || "APP:auth:status:",
  REDIS_STATUS_TTL_SECONDS: parseInt(process.env.REDIS_STATUS_TTL_SECONDS || "86400", 10), // Default: 24 hours
  STATS_API_KEY: process.env.STATS_API_KEY,
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
    "FRONTEND_URL",
    "JWT_SECRET",
    "BREVO_API_KEY",
    "BREVO_SENDER_EMAIL",
    "TWILIO_ACCOUNT_SID",
    "TWILIO_API_KEY",
    "TWILIO_API_SECRET",
    "TWILIO_PHONE_NUMBER",
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

  // Validate SERVER_BASE_URL is not empty and properly formatted
  if (!config.SERVER_BASE_URL || config.SERVER_BASE_URL.trim() === "") {
    console.error("❌ SERVER_BASE_URL cannot be empty or undefined");
    process.exit(1);
  }
}
