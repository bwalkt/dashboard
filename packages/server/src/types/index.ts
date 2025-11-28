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
export interface Section {
  title: string;
  content: string;
}
export interface SectionResponse {
  sections: Section[];
}