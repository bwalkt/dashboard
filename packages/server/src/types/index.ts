// Re-export shared types for convenience
export type {
  AccessTokenPayload,
  AuthenticatedRequest,
  AuthResponse,
  CreateUserData,
  ErrorResponse,
  GitHubUser,
  RefreshTokenPayload,
  User,
  UserResponse,
} from "@pzero/shared";

// Server-specific types
export interface GitHubTokenResponse {
  access_token: string;
  token_type: string;
  scope: string;
}

// Environment variables
export interface EnvironmentConfig {
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
}
