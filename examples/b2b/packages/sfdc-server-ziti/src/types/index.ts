// Re-export shared types for convenience
export type {
  User,
  CreateUserData,
  GitHubUser,
  AccessTokenPayload,
  RefreshTokenPayload,
  AuthResponse,
  UserResponse,
  ErrorResponse,
  AuthenticatedRequest,
} from "@dashboard/shared-types";

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
  DATABASE_PATH: string;
  PORT?: number;
  OAUTH_REDIRECT_URL: string;
}
