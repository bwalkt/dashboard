import { BaseValidator } from '@pzero/shared/validator/ajv'
import { FieldErrors, FieldValues, ResolverOptions } from 'react-hook-form'

/**
 * Create a react-hook-form resolver from an AJV validator
 */
export function createAjvResolver<T extends FieldValues>(validator: BaseValidator<T>) {
  return async (values: FieldValues, context: any, options: ResolverOptions<FieldValues>) => {
    const result = validator.validate(values)

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
        // Convert AJV instancePath to react-hook-form field path
        const fieldPath = error.field.replace(/^\//, '').replace(/\//g, '.')

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
          message: error.message,
        }
      }
    }

    return {
      values: {},
      errors,
    }
  }
}
