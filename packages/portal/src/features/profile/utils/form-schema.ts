import { createValidator } from '@boardwalk/shared/validator/ajv'
import { FieldErrors, FieldValues, ResolverOptions } from 'react-hook-form'

// =============================================================================
// TypeScript Interfaces
// =============================================================================

export interface JobData {
  jobcountry: string
  jobcity: string
  jobtitle: string
  employer: string
  startdate: string
  enddate: string
}

export interface ProfileFormValues {
  firstname: string
  lastname: string
  email: string
  contactno: number
  country: string
  city: string
  jobs: JobData[]
}

// =============================================================================
// AJV Schemas
// =============================================================================

const jobSchema = {
  type: 'object',
  properties: {
    jobcountry: { type: 'string', minLength: 1 },
    jobcity: { type: 'string', minLength: 1 },
    jobtitle: { type: 'string', minLength: 3 },
    employer: { type: 'string', minLength: 3 },
    startdate: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
    enddate: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
  },
  required: ['jobcountry', 'jobcity', 'jobtitle', 'employer', 'startdate', 'enddate'],
  additionalProperties: false,
}

export const profileSchema = {
  type: 'object',
  properties: {
    firstname: { type: 'string', minLength: 3 },
    lastname: { type: 'string', minLength: 3 },
    email: { type: 'string', format: 'email' },
    contactno: { type: 'number' },
    country: { type: 'string', minLength: 1 },
    city: { type: 'string', minLength: 1 },
    jobs: { type: 'array', items: jobSchema },
  },
  required: ['firstname', 'lastname', 'email', 'contactno', 'country', 'city', 'jobs'],
  additionalProperties: false,
}

// =============================================================================
// Validators
// =============================================================================

const validateProfile = createValidator<ProfileFormValues>(profileSchema)

// =============================================================================
// React Hook Form Resolver
// =============================================================================

export const profileResolver = async (values: FieldValues, context: any, options: ResolverOptions<FieldValues>) => {
  const result = validateProfile.validate(values)

  if (result.success) {
    return {
      values,
      errors: {},
    }
  }

  // Convert AJV errors to react-hook-form format
  const errors: FieldErrors = {}

  if (result.errors) {
    for (const error of result.errors) {
      const fieldPath = error.field.replace(/^\//g, '').replace(/\//g, '.')

      let message = 'Invalid value'

      // Custom error messages based on field and constraint
      if (
        fieldPath.includes('firstname') ||
        fieldPath.includes('lastname') ||
        fieldPath.includes('jobtitle') ||
        fieldPath.includes('employer')
      ) {
        if (error.code === 'minLength') {
          message = 'Must be at least 3 characters'
        }
      } else if (fieldPath.includes('email')) {
        if (error.code === 'format') {
          message = 'Please enter a valid email address'
        }
      } else if (
        fieldPath.includes('country') ||
        fieldPath.includes('city') ||
        fieldPath.includes('jobcountry') ||
        fieldPath.includes('jobcity')
      ) {
        if (error.code === 'minLength') {
          message = 'Please select a category'
        }
      } else if (fieldPath.includes('startdate')) {
        if (error.code === 'pattern') {
          message = 'Start date should be in the format YYYY-MM-DD'
        }
      } else if (fieldPath.includes('enddate')) {
        if (error.code === 'pattern') {
          message = 'End date should be in the format YYYY-MM-DD'
        }
      }

      // Handle nested paths for react-hook-form
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
