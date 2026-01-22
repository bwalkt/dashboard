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

export const orgResolver = (values: OrgFormValues, context: any, options: ResolverOptions<OrgFormValues>) => {
  try {
    // Simple validation for required fields
    const errors: FieldErrors = {}

    if (!values.name || values.name.trim() === '') {
      errors.name = { type: 'required', message: 'Org name is required' }
    }

    if (!values.handle || values.handle.trim() === '') {
      errors.handle = { type: 'required', message: 'Handle is required' }
    }

    if (!values.status) {
      errors.status = { type: 'required', message: 'Status is required' }
    }

    if (!values.plan) {
      errors.plan = { type: 'required', message: 'Plan is required' }
    }

    if (values.email && !values.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      errors.email = { type: 'format', message: 'Please enter a valid email address' }
    }

    if (values.website && !values.website.match(/^https?:\/\/.+/)) {
      errors.website = { type: 'format', message: 'Please enter a valid URL' }
    }

    const hasErrors = Object.keys(errors).length > 0

    return {
      values: hasErrors ? {} : values,
      errors,
    }
  } catch (error) {
    console.error('Form validation error:', error)
    return {
      values: {},
      errors: { root: { type: 'validation', message: 'Form validation failed' } },
    }
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
