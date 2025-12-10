// Internal schema used by orgs.ts - not exported to avoid conflict with types/user.ts
export const UserSchema = {
  type: 'object' as const,
  properties: {
    id: { type: 'string' as const },
    email: { type: 'string' as const },
    name: { type: 'string' as const },
  },
  required: ['id', 'email', 'name'] as const,
  additionalProperties: false,
} as const

// Re-export user-related utilities
export { generateContactEmail, generateNameFromEmail } from '../utils/handles'
