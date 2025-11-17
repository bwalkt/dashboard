import { z } from 'zod'

// Zod schemas
export const UserSchema = z.object({
  id: z.number(),
  github_id: z.string(),
  name: z.string(),
  email: z.string().email(),
  avatar: z.string().url(),
  created_at: z.string(),
  updated_at: z.string(),
})

export const CreateUserDataSchema = z.object({
  github_id: z.string(),
  name: z.string(),
  email: z.string().email(),
  avatar: z.string().url(),
})

// GitHub OAuth response schemas
export const GitHubUserSchema = z.object({
  id: z.string(),
  login: z.string(),
  name: z.string(),
  email: z.string().email(),
  avatar_url: z.string().url(),
})

// JWT Token payload schemas
export const AccessTokenPayloadSchema = z.object({
  userId: z.number(),
  githubId: z.string(),
  email: z.string().email(),
  exp: z.number(),
  iat: z.number(),
})

export const RefreshTokenPayloadSchema = z.object({
  userId: z.number(),
  type: z.literal('refresh'),
  exp: z.number(),
  iat: z.number(),
})

// API Response schemas
export const AuthResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  user: UserSchema,
})

export const UserResponseSchema = z.object({
  user: UserSchema,
})

export const ErrorResponseSchema = z.object({
  error: z.string(),
  message: z.string(),
})

// Request types with authentication
export const AuthenticatedRequestSchema = z.object({
  user: UserSchema,
})

// Inferred types from schemas
export type User = z.infer<typeof UserSchema>
export type CreateUserData = z.infer<typeof CreateUserDataSchema>
export type GitHubUser = z.infer<typeof GitHubUserSchema>
export type AccessTokenPayload = z.infer<typeof AccessTokenPayloadSchema>
export type RefreshTokenPayload = z.infer<typeof RefreshTokenPayloadSchema>
export type AuthResponse = z.infer<typeof AuthResponseSchema>
export type UserResponse = z.infer<typeof UserResponseSchema>
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>
export type AuthenticatedRequest = z.infer<typeof AuthenticatedRequestSchema>
