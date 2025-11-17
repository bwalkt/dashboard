import Ajv, { ErrorObject, ValidateFunction } from 'ajv'
import addFormats from 'ajv-formats'

/**
 * AJV Validation System for Dynamic Fields
 *
 * This system provides:
 * 1. Static schema validation (like Zod)
 * 2. Dynamic field validation (runtime schema generation)
 * 3. Type-safe validation with TypeScript
 * 4. Comprehensive error handling
 */

// Configure AJV instance with all standard formats
export const ajv = new Ajv({
  allErrors: true,
  verbose: true,
  strict: false, // Allow dynamic properties
  removeAdditional: false, // Keep additional properties for dynamic fields
})

// Add standard formats (date, email, uri, etc.)
addFormats(ajv)

// Validation result interface
export interface ValidationResult<T> {
  success: boolean
  data?: T
  errors?: ValidationError[]
}

export interface ValidationError {
  field: string
  message: string
  value?: any
  code?: string
}

// Base validator class for type safety
export abstract class BaseValidator<T> {
  public validator: ValidateFunction

  constructor(schema: any) {
    this.validator = ajv.compile(schema)
  }

  validate(data: unknown): ValidationResult<T> {
    const isValid = this.validator(data)

    if (isValid) {
      return {
        success: true,
        data: data as T,
      }
    }

    return {
      success: false,
      errors: this.formatErrors(this.validator.errors || []),
    }
  }

  public formatErrors(errors: ErrorObject[]): ValidationError[] {
    return errors.map(error => ({
      field: error.instancePath || error.schemaPath || 'root',
      message: error.message || 'Validation failed',
      value: error.data,
      code: error.keyword,
    }))
  }
}

// Dynamic schema builder for runtime validation
export class DynamicValidator {
  private schemas: Map<string, ValidateFunction> = new Map()

  /**
   * Create a validator from a dynamic schema definition
   */
  createValidator(schemaId: string, schema: any): ValidateFunction {
    if (this.schemas.has(schemaId)) {
      return this.schemas.get(schemaId)!
    }

    const validator = ajv.compile(schema)
    this.schemas.set(schemaId, validator)
    return validator
  }

  /**
   * Validate data against a dynamic schema
   */
  validate(schemaId: string, schema: any, data: unknown): ValidationResult<any> {
    const validator = this.createValidator(schemaId, schema)
    const isValid = validator(data)

    if (isValid) {
      return {
        success: true,
        data,
      }
    }

    return {
      success: false,
      errors: this.formatErrors(validator.errors || []),
    }
  }

  private formatErrors(errors: ErrorObject[]): ValidationError[] {
    return errors.map(error => ({
      field: error.instancePath || error.schemaPath || 'root',
      message: error.message || 'Validation failed',
      value: error.data,
      code: error.keyword,
    }))
  }

  /**
   * Clear cached validators
   */
  clearCache(): void {
    this.schemas.clear()
  }
}

// Global dynamic validator instance
export const dynamicValidator = new DynamicValidator()

/**
 * Utility function to create static validators
 */
export function createValidator<T>(schema: any): BaseValidator<T> {
  return new (class extends BaseValidator<T> {
    constructor() {
      super(schema)
    }
  })()
}

/**
 * Quick validation function for one-off validations
 */
export function validateData<T>(schema: any, data: unknown): ValidationResult<T> {
  const validator = createValidator<T>(schema)
  return validator.validate(data)
}

/**
 * Dynamic field schema builder helpers
 */
export const SchemaBuilder = {
  /**
   * Create a schema that accepts additional properties
   */
  withDynamicFields<T>(baseSchema: any): any {
    return {
      ...baseSchema,
      additionalProperties: true,
    }
  },

  /**
   * Create a schema for form fields with dynamic validation rules
   */
  createFormSchema(
    fields: Array<{
      name: string
      type: 'string' | 'number' | 'boolean' | 'array' | 'object'
      required?: boolean
      format?: string
      pattern?: string
      minimum?: number
      maximum?: number
      items?: any
      properties?: any
    }>,
  ): any {
    const properties: any = {}
    const required: string[] = []

    fields.forEach(field => {
      properties[field.name] = {
        type: field.type,
        ...(field.format && { format: field.format }),
        ...(field.pattern && { pattern: field.pattern }),
        ...(field.minimum !== undefined && { minimum: field.minimum }),
        ...(field.maximum !== undefined && { maximum: field.maximum }),
        ...(field.items && { items: field.items }),
        ...(field.properties && { properties: field.properties }),
      }

      if (field.required) {
        required.push(field.name)
      }
    })

    return {
      type: 'object',
      properties,
      required,
      additionalProperties: true, // Allow extra fields
    }
  },

  /**
   * Create a schema for database records with dynamic columns
   */
  createEntitySchema(baseFields: Record<string, any>, allowDynamicFields = true): any {
    return {
      type: 'object',
      properties: baseFields,
      additionalProperties: allowDynamicFields,
    }
  },
}

/**
 * Common schema patterns for reuse
 */
export const CommonSchemas = {
  // User schema that allows dynamic profile fields
  user: SchemaBuilder.createEntitySchema({
    id: { type: 'number' },
    email: { type: 'string', format: 'email' },
    name: { type: 'string' },
    created_at: { type: 'string', format: 'date-time' },
    updated_at: { type: 'string', format: 'date-time' },
  }),

  // Product schema that allows custom fields
  product: SchemaBuilder.createEntitySchema({
    id: { type: 'string' },
    name: { type: 'string' },
    description: { type: 'string', nullable: true },
    price: { type: 'number', minimum: 0 },
    isActive: { type: 'boolean' },
    created_at: { type: 'string', format: 'date-time' },
  }),

  // Generic API response with dynamic data
  apiResponse: {
    type: 'object',
    properties: {
      success: { type: 'boolean' },
      message: { type: 'string' },
      data: {}, // Allows any data structure
      errors: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            field: { type: 'string' },
            message: { type: 'string' },
          },
          required: ['field', 'message'],
        },
      },
    },
    required: ['success'],
    additionalProperties: true,
  },
}

/**
 * Migration helpers from Zod to AJV
 */
export const MigrationHelpers = {
  /**
   * Convert common Zod patterns to AJV schemas
   */
  zodToAjv: {
    string: () => ({ type: 'string' as const }),
    number: () => ({ type: 'number' as const }),
    boolean: () => ({ type: 'boolean' as const }),
    email: () => ({ type: 'string' as const, format: 'email' }),
    url: () => ({ type: 'string' as const, format: 'uri' }),
    datetime: () => ({ type: 'string' as const, format: 'date-time' }),
    uuid: () => ({ type: 'string' as const, format: 'uuid' }),
    nullable: <T>(schema: T) => ({ ...schema, nullable: true }),
    optional: <T>(schema: T) => schema, // Handle in required array instead
    array: <T>(items: T) => ({ type: 'array' as const, items }),
    object: <T>(properties: T) => ({ type: 'object' as const, properties }),
    enum: (values: readonly string[]) => ({ type: 'string' as const, enum: [...values] }),
    literal: (value: string | number | boolean) => ({ const: value }),
  },

  /**
   * Create a backward-compatible validator that accepts both static and dynamic fields
   */
  createHybridValidator<T>(staticSchema: any) {
    return new (class extends BaseValidator<T> {
      constructor() {
        super({
          ...staticSchema,
          additionalProperties: true, // Allow dynamic fields
        })
      }

      // Override to filter out additional properties when needed
      validateStrict(data: unknown): ValidationResult<T> {
        const result = this.validate(data)
        if (result.success && result.data) {
          // Remove additional properties for strict typing
          const knownKeys = Object.keys(staticSchema.properties || {})
          const filteredData = Object.keys(result.data as any)
            .filter(key => knownKeys.includes(key))
            .reduce((obj, key) => {
              ;(obj as any)[key] = (result.data as any)[key]
              return obj
            }, {} as T)

          return {
            success: true,
            data: filteredData,
          }
        }
        return result
      }
    })()
  },
}

// Export pre-configured validators for common use cases
export const userValidator = createValidator(CommonSchemas.user as any)
export const productValidator = createValidator(CommonSchemas.product as any)
export const apiResponseValidator = createValidator(CommonSchemas.apiResponse as any)
