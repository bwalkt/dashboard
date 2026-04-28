import { BaseValidator } from '@pzero/shared/validator/ajv'
import type { FieldErrors, FieldValues, Resolver, ResolverOptions } from 'react-hook-form'

/**
 * Create a react-hook-form resolver from an AJV validator
 */
export function createAjvResolver<T extends FieldValues>(validator: BaseValidator<T>): Resolver<T> {
  return async (values: T, _context: unknown, _options: ResolverOptions<T>) => {
    const result = validator.validate(values)

    if (result.success) {
      return {
        values,
        errors: {},
      }
    }

    // Convert AJV errors to react-hook-form format
    const errors: FieldErrors<T> = {} as FieldErrors<T>

    if (result.errors) {
      for (const error of result.errors) {
        // Convert AJV instancePath to react-hook-form field path
        const fieldPath = error.field.replace(/^\//, '').replace(/\//g, '.')

        // Handle nested paths for react-hook-form
        const pathParts = fieldPath.split('.')
        let current: Record<string, any> = errors as Record<string, any>

        for (let i = 0; i < pathParts.length - 1; i++) {
          const part = pathParts[i]
          if (!current[part]) {
            current[part] = {}
          }
          current = current[part] as Record<string, any>
        }

        const lastPart = pathParts[pathParts.length - 1]
        current[lastPart] = {
          type: error.code || 'validation',
          message: error.message,
        }
      }
    }

    return {
      values: {} as any,
      errors: errors as any,
    }
  }
}
