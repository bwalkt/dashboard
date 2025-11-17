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
} from '@pzero/shared'

// Server-specific types
export interface GitHubTokenResponse {
  access_token: string
  token_type: string
  scope: string
}

// Environment variables
export interface EnvironmentConfig {
  GITHUB_CLIENT_ID: string
  GITHUB_CLIENT_SECRET: string
  JWT_SECRET: string
  DATABASE_PATH: string
  PORT?: number
  FRONTEND_URL: string
}
