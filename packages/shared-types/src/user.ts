export interface User {
  id: number;
  github_id: string;
  name: string;
  email: string;
  avatar: string;
  created_at: string;
  updated_at: string;
}

export interface CreateUserData {
  github_id: string;
  name: string;
  email: string;
  avatar: string;
}

// GitHub OAuth response types
export interface GitHubUser {
  id: string;
  login: string;
  name: string;
  email: string;
  avatar_url: string;
}

// JWT Token payloads
export interface AccessTokenPayload {
  userId: number;
  githubId: string;
  email: string;
  exp: number;
  iat: number;
}

export interface RefreshTokenPayload {
  userId: number;
  type: "refresh";
  exp: number;
  iat: number;
}

// API Response types
export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface UserResponse {
  user: User;
}

export interface ErrorResponse {
  error: string;
  message: string;
}

// Request types with authentication
export interface AuthenticatedRequest {
  user: User;
}
