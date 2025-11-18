import { createValidator } from '@boardwalk/shared/validator/ajv'

// =============================================================================
// TypeScript Interfaces
// =============================================================================

export interface User {
  id: number
  github_id: string
  name: string
  email: string
  avatar: string
  created_at: string
  updated_at: string
}

export interface CreateUserData {
  github_id: string
  name: string
  email: string
  avatar: string
}

export interface GitHubUser {
  id: string
  login: string
  name: string
  email: string
  avatar_url: string
}

export interface AccessTokenPayload {
  userId: number
  githubId: string
  email: string
  exp: number
  iat: number
}

export interface RefreshTokenPayload {
  userId: number
  type: 'refresh'
  exp: number
  iat: number
}

export interface AuthResponse {
  accessToken: string
  refreshToken: string
  user: User
}

export interface UserResponse {
  user: User
}

export interface ErrorResponse {
  error: string
  message: string
}

export interface AuthenticatedRequest {
  user: User
}

// =============================================================================
// AJV Schemas
// =============================================================================

export const UserSchema = {
  type: 'object',
  properties: {
    id: { type: 'number' },
    github_id: { type: 'string' },
    name: { type: 'string' },
    email: { type: 'string', format: 'email' },
    avatar: { type: 'string', format: 'uri' },
    created_at: { type: 'string' },
    updated_at: { type: 'string' },
  },
  required: ['id', 'github_id', 'name', 'email', 'avatar', 'created_at', 'updated_at'],
  additionalProperties: false,
}

export const CreateUserDataSchema = {
  type: 'object',
  properties: {
    github_id: { type: 'string' },
    name: { type: 'string' },
    email: { type: 'string', format: 'email' },
    avatar: { type: 'string', format: 'uri' },
  },
  required: ['github_id', 'name', 'email', 'avatar'],
  additionalProperties: false,
}

export const GitHubUserSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    login: { type: 'string' },
    name: { type: 'string' },
    email: { type: 'string', format: 'email' },
    avatar_url: { type: 'string', format: 'uri' },
  },
  required: ['id', 'login', 'name', 'email', 'avatar_url'],
  additionalProperties: false,
}

export const AccessTokenPayloadSchema = {
  type: 'object',
  properties: {
    userId: { type: 'number' },
    githubId: { type: 'string' },
    email: { type: 'string', format: 'email' },
    exp: { type: 'number' },
    iat: { type: 'number' },
  },
  required: ['userId', 'githubId', 'email', 'exp', 'iat'],
  additionalProperties: false,
}

export const RefreshTokenPayloadSchema = {
  type: 'object',
  properties: {
    userId: { type: 'number' },
    type: { const: 'refresh' },
    exp: { type: 'number' },
    iat: { type: 'number' },
  },
  required: ['userId', 'type', 'exp', 'iat'],
  additionalProperties: false,
}

export const AuthResponseSchema = {
  type: 'object',
  properties: {
    accessToken: { type: 'string' },
    refreshToken: { type: 'string' },
    user: UserSchema,
  },
  required: ['accessToken', 'refreshToken', 'user'],
  additionalProperties: false,
}

export const UserResponseSchema = {
  type: 'object',
  properties: {
    user: UserSchema,
  },
  required: ['user'],
  additionalProperties: false,
}

export const ErrorResponseSchema = {
  type: 'object',
  properties: {
    error: { type: 'string' },
    message: { type: 'string' },
  },
  required: ['error', 'message'],
  additionalProperties: false,
}

export const AuthenticatedRequestSchema = {
  type: 'object',
  properties: {
    user: UserSchema,
  },
  required: ['user'],
  additionalProperties: false,
}

// =============================================================================
// Validators
// =============================================================================

export const validateUser = createValidator<User>(UserSchema)
export const validateCreateUserData = createValidator<CreateUserData>(CreateUserDataSchema)
export const validateGitHubUser = createValidator<GitHubUser>(GitHubUserSchema)
export const validateAccessTokenPayload = createValidator<AccessTokenPayload>(AccessTokenPayloadSchema)
export const validateRefreshTokenPayload = createValidator<RefreshTokenPayload>(RefreshTokenPayloadSchema)
export const validateAuthResponse = createValidator<AuthResponse>(AuthResponseSchema)
export const validateUserResponse = createValidator<UserResponse>(UserResponseSchema)
export const validateErrorResponse = createValidator<ErrorResponse>(ErrorResponseSchema)
export const validateAuthenticatedRequest = createValidator<AuthenticatedRequest>(AuthenticatedRequestSchema)
