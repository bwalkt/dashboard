import { readFileSync } from "fs";
import { join } from "path";

export interface OpenZitiConfig {
  enabled: boolean;
  controllerUrl: string;
  identityPath: string;
  serviceName: string;
  localAddress: string;
  tunnelerEnabled: boolean;
  tunnelerConfigPath: string;
}

export interface OpenZitiIdentity {
  id: string;
  name: string;
  ca: string;
  cert: string;
  key: string;
  server_cert: string;
  server_key: string;
}

export interface OpenZitiTunnelerConfig {
  hostname: string;
  port: number;
  identity: string;
  services: Array<{
    name: string;
    protocol: string;
    hostname: string;
    port: number;
  }>;
}

/**
 * Validates OpenZiti environment configuration
 */
export function validateOpenZitiEnvironment(): OpenZitiConfig {
  const config: OpenZitiConfig = {
    enabled: process.env.OPENZITI_ENABLED === "true",
    controllerUrl: process.env.OPENZITI_CONTROLLER_URL || "https://localhost:1280",
    identityPath: process.env.OPENZITI_IDENTITY_PATH || "./config/ziti-identity.json",
    serviceName: process.env.OPENZITI_SERVICE_NAME || "sfdc-api-server",
    localAddress: process.env.OPENZITI_LOCAL_ADDRESS || "127.0.0.1:8080",
    tunnelerEnabled: process.env.OPENZITI_TUNNELER_ENABLED === "true",
    tunnelerConfigPath: process.env.OPENZITI_TUNNELER_CONFIG_PATH || "./config/tunneler.json",
  };

  if (config.enabled) {
    console.log("OpenZiti integration is enabled");

    // Validate required configuration when OpenZiti is enabled
    if (!config.controllerUrl) {
      throw new Error("OPENZITI_CONTROLLER_URL is required when OpenZiti is enabled");
    }

    if (!config.tunnelerEnabled && !config.identityPath) {
      throw new Error("OPENZITI_IDENTITY_PATH is required when OpenZiti tunneler is disabled");
    }
  }

  return config;
}

/**
 * Loads OpenZiti identity configuration from file
 */
export function loadOpenZitiIdentity(identityPath: string): OpenZitiIdentity {
  try {
    const identityData = readFileSync(identityPath, "utf8");
    return JSON.parse(identityData);
  } catch (error) {
    throw new Error(`Failed to load OpenZiti identity from ${identityPath}: ${error}`);
  }
}

/**
 * Loads OpenZiti tunneler configuration from file
 */
export function loadOpenZitiTunnelerConfig(configPath: string): OpenZitiTunnelerConfig {
  try {
    const configData = readFileSync(configPath, "utf8");
    return JSON.parse(configData);
  } catch (error) {
    throw new Error(`Failed to load OpenZiti tunneler config from ${configPath}: ${error}`);
  }
}

/**
 * Creates a default OpenZiti identity template
 */
export function createDefaultIdentityTemplate(): OpenZitiIdentity {
  return {
    id: "your-identity-id",
    name: "sfdc-server-identity",
    ca: "your-ca-certificate",
    cert: "your-client-certificate",
    key: "your-client-private-key",
    server_cert: "your-server-certificate",
    server_key: "your-server-private-key",
  };
}

/**
 * Creates a default OpenZiti tunneler configuration template
 */
export function createDefaultTunnelerConfig(): OpenZitiTunnelerConfig {
  return {
    hostname: "localhost",
    port: 8080,
    identity: "./config/ziti-identity.json",
    services: [
      {
        name: "sfdc-api-server",
        protocol: "tcp",
        hostname: "127.0.0.1",
        port: 8080,
      },
    ],
  };
}
