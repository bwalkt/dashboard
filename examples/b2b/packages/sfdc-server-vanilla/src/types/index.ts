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
  JWT_ACCESS_TOKEN_EXPIRY: string
  JWT_REFRESH_TOKEN_EXPIRY: string
  DATABASE_PATH: string
  PORT?: number
  FRONTEND_URL: string
  REDIS_URL: string
  // OpenTelemetry/SigNoz configuration (optional)
  OTEL_SERVICE_NAME?: string
  OTEL_SERVICE_VERSION?: string
  OTEL_EXPORTER_OTLP_ENDPOINT?: string
  OTEL_EXPORTER_OTLP_TRACES_ENDPOINT?: string
  OTEL_EXPORTER_OTLP_METRICS_ENDPOINT?: string
  OTEL_RESOURCE_ATTRIBUTES?: string
}
