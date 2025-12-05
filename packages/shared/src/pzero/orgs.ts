import Ajv from 'ajv'
import addFormats from 'ajv-formats'

const ajv = new Ajv()
addFormats(ajv)

// AJV schemas
export const OrganizationSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    slug: { type: 'string' },
    description: { type: ['string', 'null'] },
    logo_url: { type: ['string', 'null'], format: 'url' },
    website: { type: ['string', 'null'], format: 'url' },
    email: { type: ['string', 'null'], format: 'email' },
    phone: { type: ['string', 'null'] },
    status: {
      type: 'string',
      enum: ['active', 'inactive', 'suspended'],
      default: 'active',
    },
    plan: {
      type: 'string',
      enum: ['free', 'starter', 'pro', 'enterprise'],
      default: 'free',
    },
    owner_id: { type: 'string' },
    settings: { type: 'object', additionalProperties: true },
    metadata: { type: 'object', additionalProperties: true },
    created_at: { type: 'string' },
    updated_at: { type: 'string' },
    deleted_at: { type: ['string', 'null'] },
  },
  required: ['id', 'name', 'slug', 'status', 'plan', 'owner_id', 'created_at', 'updated_at'],
  additionalProperties: false,
}

export const CreateOrganizationDataSchema = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    slug: { type: 'string' },
    description: { type: ['string', 'null'] },
    logo_url: { type: ['string', 'null'], format: 'url' },
    website: { type: ['string', 'null'], format: 'url' },
    email: { type: ['string', 'null'], format: 'email' },
    phone: { type: ['string', 'null'] },
    settings: { type: 'object', additionalProperties: true },
    metadata: { type: 'object', additionalProperties: true },
  },
  required: ['name', 'slug'],
  additionalProperties: false,
}

export const UpdateOrganizationDataSchema = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    slug: { type: 'string' },
    description: { type: ['string', 'null'] },
    logo_url: { type: ['string', 'null'], format: 'url' },
    website: { type: ['string', 'null'], format: 'url' },
    email: { type: ['string', 'null'], format: 'email' },
    phone: { type: ['string', 'null'] },
    status: {
      type: 'string',
      enum: ['active', 'inactive', 'suspended'],
    },
    plan: {
      type: 'string',
      enum: ['free', 'starter', 'pro', 'enterprise'],
    },
    settings: { type: 'object', additionalProperties: true },
    metadata: { type: 'object', additionalProperties: true },
  },
  additionalProperties: false,
}

// API Response schemas
export const OrganizationResponseSchema = {
  type: 'object',
  properties: {
    organization: OrganizationSchema,
  },
  required: ['organization'],
  additionalProperties: false,
}

export const OrganizationsListResponseSchema = {
  type: 'object',
  properties: {
    organizations: {
      type: 'array',
      items: OrganizationSchema,
    },
    total: { type: 'number' },
    page: { type: 'number' },
    limit: { type: 'number' },
  },
  required: ['organizations', 'total', 'page', 'limit'],
  additionalProperties: false,
}

// Compiled validators
export const validateOrganization = ajv.compile(OrganizationSchema)
export const validateCreateOrganizationData = ajv.compile(CreateOrganizationDataSchema)
export const validateUpdateOrganizationData = ajv.compile(UpdateOrganizationDataSchema)
export const validateOrganizationResponse = ajv.compile(OrganizationResponseSchema)
export const validateOrganizationsListResponse = ajv.compile(OrganizationsListResponseSchema)

// Type definitions
export interface Organization {
  id: string
  name: string
  slug: string
  description: string | null
  logo_url: string | null
  website: string | null
  email: string | null
  phone: string | null
  status: 'active' | 'inactive' | 'suspended'
  plan: 'free' | 'starter' | 'pro' | 'enterprise'
  owner_id: string
  settings?: Record<string, any>
  metadata?: Record<string, any>
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface CreateOrganizationData {
  name: string
  slug: string
  description?: string | null
  logo_url?: string | null
  website?: string | null
  email?: string | null
  phone?: string | null
  settings?: Record<string, any>
  metadata?: Record<string, any>
}

export interface UpdateOrganizationData {
  name?: string
  slug?: string
  description?: string | null
  logo_url?: string | null
  website?: string | null
  email?: string | null
  phone?: string | null
  status?: 'active' | 'inactive' | 'suspended'
  plan?: 'free' | 'starter' | 'pro' | 'enterprise'
  settings?: Record<string, any>
  metadata?: Record<string, any>
}

export interface OrganizationResponse {
  organization: Organization
}

export interface OrganizationsListResponse {
  organizations: Organization[]
  total: number
  page: number
  limit: number
}
