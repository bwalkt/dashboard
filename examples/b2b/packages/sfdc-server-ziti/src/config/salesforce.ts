import dotenv from "dotenv";
import type { EnvironmentVariables, SalesforceConfig } from "../types/salesforce.js";

// Load environment variables
dotenv.config();

/**
 * Salesforce Configuration
 * Validates and exports Salesforce-related environment variables
 */
export const salesforceConfig = {
  consumerKey: process.env.SALESFORCE_CONSUMER_KEY,
  username: process.env.SALESFORCE_USERNAME,
  loginUrl: process.env.SALESFORCE_LOGIN_URL || "https://login.salesforce.com",

  // Validate required configuration
  validate(): boolean {
    const errors: string[] = [];

    if (!this.consumerKey) {
      errors.push("SALESFORCE_CONSUMER_KEY is required");
    }

    if (!this.username) {
      errors.push("SALESFORCE_USERNAME is required");
    }

    if (errors.length > 0) {
      throw new Error(`Salesforce configuration errors:\n${errors.join("\n")}`);
    }

    return true;
  },

  // Get configuration object
  getConfig(): SalesforceConfig {
    this.validate();
    return {
      consumerKey: this.consumerKey!,
      username: this.username!,
      loginUrl: this.loginUrl,
    };
  },
};

// Environment variables documentation
export const ENV_VARS: Record<keyof EnvironmentVariables, string> = {
  SALESFORCE_CONSUMER_KEY: "Salesforce Connected App Consumer Key",
  SALESFORCE_USERNAME: "Salesforce Username (email)",
  SALESFORCE_LOGIN_URL: "Salesforce Login URL (default: https://login.salesforce.com, use https://test.salesforce.com for sandbox)",
};
