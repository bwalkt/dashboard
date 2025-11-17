/**
 * User types with AJV validation - demonstrating migration from Zod
 * This maintains backward compatibility while adding dynamic field support
 */

// Using plain JSON Schema objects instead of JSONSchemaType for better compatibility
import { createValidator, ValidationResult } from '../validator/ajv'

// =============================================================================
// Core User Interface with Dynamic Field Support
// =============================================================================

export interface User {
  id: number
  github_id: string | null
  name: string
  email: string
  avatar: string | null
  email_verified?: boolean
  created_at: string
  updated_at: string
  // Dynamic fields for custom user attributes
  [key: string]: any
}

export interface CreateUserData {
  github_id: string | null
  name: string
  email: string
  avatar: string | null
  email_verified?: boolean
  // Dynamic fields allowed during creation
  [key: string]: any
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
  githubId: string | null
  email: string
  exp: number
  iat: number
  // Allow additional JWT claims
  [key: string]: any
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
  // Allow additional auth metadata
  [key: string]: any
}

export interface UserResponse {
  user: User
  // Allow additional response metadata
  [key: string]: any
}

export interface ErrorResponse {
  error: string
  message: string
  // Allow additional error context
  [key: string]: any
}

export interface AuthenticatedRequest {
  user: User
  // Allow additional request context
  [key: string]: any
}

// =============================================================================
// AJV Schemas
// =============================================================================

export const UserSchema = {
  type: 'object',
  properties: {
    id: { type: 'number' },
    github_id: { type: ['string', 'null'] },
    name: { type: 'string' },
    email: { type: 'string', format: 'email' },
    avatar: { type: ['string', 'null'], format: 'uri' },
    email_verified: { type: 'boolean', default: false },
    created_at: { type: 'string', format: 'date-time' },
    updated_at: { type: 'string', format: 'date-time' },
  },
  required: ['id', 'name', 'email', 'created_at', 'updated_at'],
  additionalProperties: true, // Allow dynamic user attributes
}

export const CreateUserDataSchema = {
  type: 'object',
  properties: {
    github_id: { type: ['string', 'null'] },
    name: { type: 'string' },
    email: { type: 'string', format: 'email' },
    avatar: { type: ['string', 'null'], format: 'uri' },
    email_verified: { type: 'boolean', default: false },
  },
  required: ['name', 'email'],
  additionalProperties: true, // Allow custom fields during user creation
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
  additionalProperties: false, // GitHub API response should be strict
}

export const AccessTokenPayloadSchema = {
  type: 'object',
  properties: {
    userId: { type: 'number' },
    githubId: { type: ['string', 'null'] },
    email: { type: 'string', format: 'email' },
    exp: { type: 'number' },
    iat: { type: 'number' },
  },
  required: ['userId', 'email', 'exp', 'iat'],
  additionalProperties: true, // Allow additional JWT claims
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
  additionalProperties: false, // Refresh tokens should be strict
}

export const AuthResponseSchema = {
  type: 'object',
  properties: {
    accessToken: { type: 'string' },
    refreshToken: { type: 'string' },
    user: UserSchema,
  },
  required: ['accessToken', 'refreshToken', 'user'],
  additionalProperties: true, // Allow additional auth metadata
}

export const UserResponseSchema = {
  type: 'object',
  properties: {
    user: UserSchema,
  },
  required: ['user'],
  additionalProperties: true, // Allow additional response metadata
}

export const ErrorResponseSchema = {
  type: 'object',
  properties: {
    error: { type: 'string' },
    message: { type: 'string' },
  },
  required: ['error', 'message'],
  additionalProperties: true, // Allow additional error context
}

export const AuthenticatedRequestSchema = {
  type: 'object',
  properties: {
    user: UserSchema,
  },
  required: ['user'],
  additionalProperties: true, // Allow additional request context
}

// =============================================================================
// Validators
// =============================================================================

export const userValidator = createValidator(UserSchema)
export const createUserDataValidator = createValidator(CreateUserDataSchema)
export const githubUserValidator = createValidator(GitHubUserSchema)
export const accessTokenPayloadValidator = createValidator(AccessTokenPayloadSchema)
export const refreshTokenPayloadValidator = createValidator(RefreshTokenPayloadSchema)
export const authResponseValidator = createValidator(AuthResponseSchema)
export const userResponseValidator = createValidator(UserResponseSchema)
export const errorResponseValidator = createValidator(ErrorResponseSchema)
export const authenticatedRequestValidator = createValidator(AuthenticatedRequestSchema)

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Validate user data with custom fields
 */
export function validateUser(data: unknown): ValidationResult<User> {
  return userValidator.validate(data) as ValidationResult<User>
}

/**
 * Validate user creation data with custom fields
 */
export function validateCreateUserData(data: unknown): ValidationResult<CreateUserData> {
  return createUserDataValidator.validate(data) as ValidationResult<CreateUserData>
}

/**
 * Example: Validate user with profile customizations
 */
export function validateUserWithProfile(data: unknown): ValidationResult<
  User & {
    profile?: {
      theme?: string
      notifications?: boolean
      preferences?: Record<string, any>
    }
  }
> {
  // First validate basic user structure
  const userResult = userValidator.validate(data)

  if (!userResult.success) {
    return userResult as ValidationResult<
      User & { profile?: { theme?: string; notifications?: boolean; preferences?: Record<string, any> } }
    >
  }

  // Additional validation for profile fields if present
  const userData = data as any
  if (userData.profile) {
    // You could add specific validation for profile structure here
    // For now, we'll accept any profile structure
  }

  return {
    success: true,
    data: userData,
  }
}

/**
 * Example: Validate user with organization-specific fields
 */
export function validateUserWithOrgFields(
  data: unknown,
  orgFieldConfig: Array<{
    fieldName: string
    required: boolean
    type: 'string' | 'number' | 'boolean'
  }>,
): ValidationResult<User> {
  // First validate basic user structure
  const userResult = userValidator.validate(data)

  if (!userResult.success) {
    return userResult as ValidationResult<User>
  }

  const userData = data as any
  const errors: any[] = []

  // Validate organization-specific fields
  for (const fieldConfig of orgFieldConfig) {
    const fieldValue = userData[fieldConfig.fieldName]

    if (fieldConfig.required && (fieldValue === undefined || fieldValue === null)) {
      errors.push({
        field: fieldConfig.fieldName,
        message: `${fieldConfig.fieldName} is required`,
      })
      continue
    }

    if (fieldValue !== undefined && fieldValue !== null) {
      const expectedType = fieldConfig.type
      const actualType = typeof fieldValue

      if (expectedType === 'number' && actualType !== 'number') {
        errors.push({
          field: fieldConfig.fieldName,
          message: `${fieldConfig.fieldName} must be a number`,
        })
      } else if (expectedType === 'boolean' && actualType !== 'boolean') {
        errors.push({
          field: fieldConfig.fieldName,
          message: `${fieldConfig.fieldName} must be a boolean`,
        })
      } else if (expectedType === 'string' && actualType !== 'string') {
        errors.push({
          field: fieldConfig.fieldName,
          message: `${fieldConfig.fieldName} must be a string`,
        })
      }
    }
  }

  if (errors.length > 0) {
    return {
      success: false,
      errors,
    }
  }

  return {
    success: true,
    data: userData,
  }
}

// =============================================================================
// Migration Helper
// =============================================================================

/**
 * Utility to help migrate from Zod-based validation to AJV
 */
export const UserMigrationHelper = {
  /**
   * Validate using the new AJV system but return Zod-like interface
   */
  safeParse: (data: unknown) => {
    const result = userValidator.validate(data)
    return {
      success: result.success,
      data: result.data,
      error: result.errors
        ? {
            issues: result.errors.map(err => ({
              path: [err.field],
              message: err.message,
              code: err.code || 'custom',
            })),
          }
        : undefined,
    }
  },

  /**
   * Get only the static fields (removes dynamic fields)
   */
  getStaticFields: (
    user: User,
  ): Pick<User, 'id' | 'github_id' | 'name' | 'email' | 'avatar' | 'email_verified' | 'created_at' | 'updated_at'> => {
    const { id, github_id, name, email, avatar, email_verified, created_at, updated_at } = user
    return { id, github_id, name, email, avatar, email_verified, created_at, updated_at }
  },

  /**
   * Get only the dynamic fields
   */
  getDynamicFields: (user: User): Record<string, any> => {
    const staticFields = ['id', 'github_id', 'name', 'email', 'avatar', 'email_verified', 'created_at', 'updated_at']
    const dynamicFields: Record<string, any> = {}

    for (const [key, value] of Object.entries(user)) {
      if (!staticFields.includes(key)) {
        dynamicFields[key] = value
      }
    }

    return dynamicFields
  },
}
