import type { Org, OrgPlan, OrgStatus } from '@pzero/shared/pzero'
import { validateCreateOrgData } from '@pzero/shared/pzero'
import { FieldErrors, FieldValues, ResolverOptions } from 'react-hook-form'

export interface OrgFormValues {
  name: string
  handle: string
  dscr?: string
  email?: string
  phone?: string
  website?: string
  status: OrgStatus
  plan: OrgPlan
}

// Use shared validator from @pzero/shared/pzero/orgs
const validateOrg = validateCreateOrgData

export const orgResolver = async (values: OrgFormValues, context: any, options: ResolverOptions<OrgFormValues>) => {
  const isValid = validateOrg(values)
  const result = { success: isValid, errors: isValid ? [] : validateOrg.errors }

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
  dscr: '',
  email: '',
  phone: '',
  website: '',
  status: 'ACTIVE',
  plan: 'STARTER',
}
