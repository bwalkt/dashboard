import type { JSONSchemaType } from 'ajv'
import Ajv from 'ajv'
import addFormats from 'ajv-formats'
import { extractCompanyInfoFromDomain, generateOrgHandle } from '../utils/handles.js'
import { type PaginationListResponse, PaginationListResponseSchema } from './pagination.js'
import type { BaseLocTable } from './type.js'
import { generateContactEmail, UserSchema } from './users.js'

const ajv = new Ajv()
addFormats(ajv)

export interface CreateOrgData extends BaseLocTable {
  logo_url?: string | null
  website?: string | null
  email?: string | null
  phone?: string | null
}
export interface Org extends CreateOrgData {
  status: OrgStatus
  plan: OrgPlan
}

// Base field definitions for reuse
const baseFields = {
  id: { type: 'string' as const },
  name: { type: 'string' as const },
  handle: { type: 'string' as const },
  dscr: { type: 'string' as const, nullable: true },
  c_at: { type: 'string' as const },
  u_at: { type: 'string' as const, nullable: true },
  data: { type: 'object' as const, nullable: true },
  tags: { type: 'object' as const, nullable: true },
  logo_url: { type: 'string' as const, nullable: true, format: 'url' },
  website: { type: 'string' as const, nullable: true, format: 'url' },
  email: { type: 'string' as const, nullable: true, format: 'email' },
  phone: { type: 'string' as const, nullable: true },
  address: { type: 'string' as const, nullable: true },
  status: {
    type: 'string' as const,
    enum: ['active', 'inactive', 'suspended'] as const,
    default: 'active',
  },
  plan: {
    type: 'string' as const,
    enum: ['free', 'starter', 'pro', 'enterprise'] as const,
    default: 'starter',
  },
}

// Helper function to create schema with selected fields
function createSchema<T extends keyof typeof baseFields>(
  fields: T[],
  required: T[] = [],
  additionalProperties = false,
) {
  const properties = fields.reduce(
    (acc, field) => {
      acc[field] = baseFields[field]
      return acc
    },
    {} as Record<T, (typeof baseFields)[T]>,
  )

  return {
    type: 'object' as const,
    properties,
    required,
    additionalProperties,
  }
}

// Core schemas
export const OrgSchema = createSchema(
  [
    'id',
    'name',
    'handle',
    'dscr',
    'c_at',
    'u_at',
    'data',
    'logo_url',
    'website',
    'email',
    'phone',
    'status',
    'plan',
    'address',
    'tags',
  ],
  ['id', 'name', 'handle', 'c_at', 'status', 'plan'],
)

export const CreateOrgDataSchema = createSchema(
  ['name', 'handle', 'dscr', 'logo_url', 'website', 'email', 'phone', 'address', 'data', 'tags'],
  ['name', 'handle'],
)

export const UpdateOrgDataSchema = createSchema([
  'name',
  'handle',
  'dscr',
  'logo_url',
  'website',
  'email',
  'phone',
  'status',
  'plan',
  'address',
  'data',
  'tags',
])

// API Response schemas
export const OrgResponseSchema = {
  type: 'object' as const,
  properties: {
    org: OrgSchema,
  },
  required: ['org'] as const,
  additionalProperties: false,
}

export const OrgsListResponseSchema = {
  type: 'object' as const,
  properties: {
    orgs: {
      type: 'array' as const,
      items: OrgSchema,
    },
    ...PaginationListResponseSchema.properties,
  },
  required: ['orgs', ...PaginationListResponseSchema.required] as const,
  additionalProperties: false,
}

export const OrgWithUserResponseSchema = {
  type: 'object' as const,
  properties: {
    org: OrgSchema,
    user: UserSchema,
  },
  required: ['org', 'user'] as const,
  additionalProperties: false,
}

// Schema-derived TypeScript types
export type OrgStatus = (typeof baseFields.status.enum)[number]
export type OrgPlan = (typeof baseFields.plan.enum)[number]

export interface CreateOrganizationWithUserData extends CreateOrgData {
  status: OrgStatus
  plan: OrgPlan
  create_user?: {
    name: string
    email: string
    email_verified?: boolean
  }
  associate_users?: string[]
  owner_id?: string // Optional as server derives from authenticated user context
}

export type UpdateOrgData = Partial<Omit<CreateOrgData, 'handle'>> & {
  handle?: string
  status?: OrgStatus
  plan?: OrgPlan
}

export interface OrgResponse {
  org: Org
}

export interface OrgWithUserResponse {
  org: Org
  user?: {
    id: string
    email: string
    name: string
  }
}

export interface OrgsListResponse extends PaginationListResponse {
  orgs: Org[]
}

// Compiled validators
export const validateOrganization = ajv.compile(OrgSchema)
export const validateCreateOrgData = ajv.compile(CreateOrgDataSchema)
export const validateUpdateOrgData = ajv.compile(UpdateOrgDataSchema)
export const validateOrgResponse = ajv.compile(OrgResponseSchema)
export const validateOrgWithUserResponse = ajv.compile(OrgWithUserResponseSchema)
export const validateOrgsListResponse = ajv.compile(OrgsListResponseSchema)

// Re-export organization-related utilities for convenience
export { extractCompanyInfoFromDomain, generateOrgHandle } from '../utils/handles.js'

export function generateOrgDefaults(website: string): Partial<CreateOrgData> {
  const { domain, companyName, handle } = extractCompanyInfoFromDomain(website)

  return {
    website: website.startsWith('http') ? website : `https://${website}`,
    name: companyName,
    handle,
    email: generateContactEmail(domain),
  }
}

// Validation helpers
export function isValidOrganization(data: unknown): data is Org {
  return validateOrganization(data)
}

export function isValidCreateData(data: unknown): data is CreateOrgData {
  return validateCreateOrgData(data)
}

export function isValidUpdateData(data: unknown): data is UpdateOrgData {
  return validateUpdateOrgData(data)
}

// Status and plan helpers
export const ORG_STATUSES = baseFields.status.enum
export const ORG_PLANS = baseFields.plan.enum

export function isValidStatus(status: string): status is OrgStatus {
  return ORG_STATUSES.includes(status as OrgStatus)
}

export function isValidPlan(plan: string): plan is OrgPlan {
  return ORG_PLANS.includes(plan as OrgPlan)
}

// Re-export handle utilities for convenience
export {
  generateContactEmail,
  generateNameFromEmail,
} from '../utils/handles.js'
