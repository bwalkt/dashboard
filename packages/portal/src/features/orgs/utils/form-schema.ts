import type { OrgPlan, OrgStatus } from '@pzero/shared/pzero'
import type { FieldErrors, Resolver } from 'react-hook-form'

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

export const orgResolver: Resolver<OrgFormValues> = values => {
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
