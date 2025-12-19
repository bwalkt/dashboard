import Ajv from 'ajv'
import addFormats from 'ajv-formats'

const ajv = new Ajv()
addFormats(ajv)
export const User = {
  github_id: { type: ['string', 'null'] },
  name: { type: 'string' },
  email: { type: 'string', format: 'email' },
  avatar: { type: ['string', 'null'], format: 'url' },
  email_verified: { type: 'boolean', default: false },
}
// AJV schemas
export const UserSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    ...User,
    created_at: { type: 'string' },
    updated_at: { type: 'string' },
  },
  required: ['id', 'name', 'email', 'created_at', 'updated_at'],
  additionalProperties: false,
}

export const CreateUserDataSchema = {
  type: 'object',
  properties: {
    ...User,
    device: { type: 'object' },
  },
  required: ['name', 'email'],
  additionalProperties: false,
}

// GitHub OAuth response schemas
export const GitHubUserSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    login: { type: 'string' },
    name: { type: 'string' },
    email: { type: 'string', format: 'email' },
    avatar_url: { type: 'string', format: 'url' },
  },
  required: ['id', 'login', 'name', 'email', 'avatar_url'],
  additionalProperties: false,
}

// JWT Token payload schemas
export const AccessTokenPayloadSchema = {
  type: 'object',
  properties: {
    userId: { type: 'string' },
    githubId: { type: ['string', 'null'] },
    email: { type: 'string', format: 'email' },
    exp: { type: 'number' },
    iat: { type: 'number' },
  },
  required: ['userId', 'email', 'exp', 'iat'],
  additionalProperties: false,
}

export const RefreshTokenPayloadSchema = {
  type: 'object',
  properties: {
    userId: { type: 'string' },
    type: { const: 'refresh' },
    exp: { type: 'number' },
    iat: { type: 'number' },
  },
  required: ['userId', 'type', 'exp', 'iat'],
  additionalProperties: false,
}

// API Response schemas
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

// Request types with authentication
export const AuthenticatedRequestSchema = {
  type: 'object',
  properties: {
    user: UserSchema,
  },
  required: ['user'],
  additionalProperties: false,
}

// Compiled validators
export const validateUser = ajv.compile(UserSchema)
export const validateCreateUserData = ajv.compile(CreateUserDataSchema)
export const validateGitHubUser = ajv.compile(GitHubUserSchema)
export const validateAccessTokenPayload = ajv.compile(AccessTokenPayloadSchema)
export const validateRefreshTokenPayload = ajv.compile(RefreshTokenPayloadSchema)
export const validateAuthResponse = ajv.compile(AuthResponseSchema)
export const validateUserResponse = ajv.compile(UserResponseSchema)
export const validateErrorResponse = ajv.compile(ErrorResponseSchema)
export const validateAuthenticatedRequest = ajv.compile(AuthenticatedRequestSchema)

// Type definitions
export interface User {
  id: string
  github_id: string | null
  name: string
  email: string
  avatar: string | null
  email_verified?: boolean
  created_at: string
  updated_at: string
}

export interface CreateUserData {
  github_id: string | null
  name: string
  email: string
  avatar: string | null
  email_verified?: boolean
  device?: unknown
}

export interface GitHubUser {
  id: string
  login: string
  name: string
  email: string
  avatar_url: string
}

export interface AccessTokenPayload {
  userId: string
  githubId: string | null
  email: string
  exp: number
  iat: number
}

export interface RefreshTokenPayload {
  userId: string
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
