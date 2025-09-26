import dotenv from "dotenv";
import type { EnvironmentConfig } from "../types/index.js";

// Load environment variables from .env file
dotenv.config();

export const config: EnvironmentConfig = {
  GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID || "",
  GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET || "",
  JWT_SECRET: process.env.JWT_SECRET || "default-secret-key-change-in-production",
  DATABASE_PATH: process.env.DATABASE_PATH || "./database.db",
  OAUTH_REDIRECT_URL: process.env.OAUTH_REDIRECT_URL || "http://localhost:1420",
};

// Validate required environment variables
export function validateEnvironment(): void {
  const requiredVars = ["GITHUB_CLIENT_ID", "GITHUB_CLIENT_SECRET", "JWT_SECRET"];

  const missingVars = requiredVars.filter((varName) => !process.env[varName]);

  if (missingVars.length > 0) {
    console.error("❌ Missing required environment variables:");
    missingVars.forEach((varName) => {
      console.error(`   - ${varName}`);
    });
    console.error("\n📝 Please check your .env file and ensure all required variables are set.");
    console.error("📄 See env.example for reference.");
    process.exit(1);
  }

  // Warn about default JWT secret
  if (config.JWT_SECRET === "default-secret-key-change-in-production") {
    console.warn("⚠️  Using default JWT secret. Please set JWT_SECRET environment variable for production.");
  }

  console.log("✅ Environment configuration validated successfully");
}
