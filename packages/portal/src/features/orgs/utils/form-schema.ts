import { createValidator } from '@boardwalk/shared/validator/ajv'
import type { Org, OrgPlan, OrgStatus } from '@pzero/shared/pzero'
import { FieldErrors, FieldValues, ResolverOptions } from 'react-hook-form'

export interface OrgFormValues {
  name: string
  handle: string
  description?: string
  email?: string
  phone?: string
  website?: string
  status: OrgStatus
  plan: OrgPlan
}

export const orgSchema = {
  type: 'object',
  properties: {
    name: { type: 'string', minLength: 1 },
    handle: { type: 'string', minLength: 1, pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$' },
    description: { type: 'string' },
    email: { type: 'string', format: 'email' },
    phone: { type: 'string' },
    website: { type: 'string', format: 'uri' },
    status: { type: 'string', enum: ['active', 'inactive', 'suspended'] },
    plan: { type: 'string', enum: ['free', 'starter', 'pro', 'enterprise'] },
  },
  required: ['name', 'handle', 'status', 'plan'],
  additionalProperties: false,
}

const validateOrg = createValidator<OrgFormValues>(orgSchema)

export const orgResolver = async (values: FieldValues, context: any, options: ResolverOptions<FieldValues>) => {
  const result = validateOrg.validate(values)

  if (result.success) {
    return {
      values,
      errors: {},
    }
  }

  const errors: FieldErrors = {}

  if (result.errors) {
    for (const error of result.errors) {
      const fieldPath = error.field.replace(/^\//g, '').replace(/\//g, '.')

      let message = 'Invalid value'

      if (fieldPath === 'name') {
        if (error.code === 'minLength') {
          message = 'Org name is required'
        }
      } else if (fieldPath === 'handle') {
        if (error.code === 'minLength') {
          message = 'Handle is required'
        } else if (error.code === 'pattern') {
          message = 'Handle must contain only lowercase letters, numbers, and hyphens'
        }
      } else if (fieldPath === 'email') {
        if (error.code === 'format') {
          message = 'Please enter a valid email address'
        }
      } else if (fieldPath === 'website') {
        if (error.code === 'format') {
          message = 'Please enter a valid URL'
        }
      } else if (fieldPath === 'status') {
        if (error.code === 'enum') {
          message = 'Please select a valid status'
        }
      } else if (fieldPath === 'plan') {
        if (error.code === 'enum') {
          message = 'Please select a valid plan'
        }
      }

      const pathParts = fieldPath.split('.')
      let current = errors

      for (let i = 0; i < pathParts.length - 1; i++) {
        const part = pathParts[i]
        if (!current[part]) {
          current[part] = {}
        }
        current = current[part] as any
      }

      const lastPart = pathParts[pathParts.length - 1]
      current[lastPart] = {
        type: error.code || 'validation',
        message,
      }
    }
  }

  return {
    values: {},
    errors,
  }
}

export const defaultFormValues: Partial<OrgFormValues> = {
  name: '',
  handle: '',
  description: '',
  email: '',
  phone: '',
  website: '',
  status: 'active',
  plan: 'starter',
}
