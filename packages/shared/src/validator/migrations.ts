/**
 * Migration Examples: Zod to AJV
 *
 * This file demonstrates how to migrate existing Zod schemas to AJV
 * while maintaining type safety and adding dynamic field support.
 */

// Using plain JSON Schema objects for better TypeScript compatibility
import { createValidator, MigrationHelpers, SchemaBuilder, ValidationResult } from './ajv'

// =============================================================================
// EXAMPLE 1: Basic User Schema Migration
// =============================================================================

// Original Zod schema (from shared/src/types/user.ts)
/*
const UserSchema = z.object({
  id: z.number(),
  github_id: z.string().nullable(),
  name: z.string(),
  email: z.string().email(),
  avatar: z.string().url().nullable(),
  email_verified: z.boolean().optional().default(false),
  created_at: z.string(),
  updated_at: z.string(),
})
*/

// AJV equivalent with dynamic field support
export interface User {
  id: number
  github_id: string | null
  name: string
  email: string
  avatar: string | null
  email_verified?: boolean
  created_at: string
  updated_at: string
  [key: string]: any // Allow dynamic fields
}

export const UserSchema: any = {
  type: 'object',
  properties: {
    id: { type: 'number' },
    github_id: { type: 'string', nullable: true },
    name: { type: 'string' },
    email: { type: 'string', format: 'email' },
    avatar: { type: 'string', format: 'uri', nullable: true },
    email_verified: { type: 'boolean', default: false },
    created_at: { type: 'string', format: 'date-time' },
    updated_at: { type: 'string', format: 'date-time' },
  },
  required: ['id', 'github_id', 'name', 'email', 'avatar', 'created_at', 'updated_at'],
  additionalProperties: true, // This is the key for dynamic fields!
}

export const userValidator = createValidator(UserSchema)

// =============================================================================
// EXAMPLE 2: Product Schema with Custom Fields
// =============================================================================

// Original Zod schema (from shared/src/types/product.ts)
/*
const ProductSchema = z.object({
  Id: z.string(),
  Name: z.string(),
  ProductCode: z.string().nullable(),
  Description: z.string().nullable(),
  IsActive: z.boolean(),
  // ... other fields
})
*/

// AJV equivalent that allows Salesforce custom fields
export interface Product {
  Id: string
  Name: string
  ProductCode: string | null
  Description: string | null
  IsActive: boolean
  // Custom fields (dynamically added)
  [key: string]: any
}

export const ProductSchema: any = {
  type: 'object',
  properties: {
    Id: { type: 'string' },
    Name: { type: 'string' },
    ProductCode: { type: 'string', nullable: true },
    Description: { type: 'string', nullable: true },
    IsActive: { type: 'boolean' },
  },
  required: ['Id', 'Name', 'ProductCode', 'Description', 'IsActive'],
  additionalProperties: true, // Allows Salesforce custom fields like Product_Category__c
}

export const productValidator = createValidator(ProductSchema)

// =============================================================================
// EXAMPLE 3: Dynamic Form Validation
// =============================================================================

/**
 * Example: Dynamic form that can have different fields based on configuration
 */
export class DynamicFormValidator {
  /**
   * Create a form validator based on field configuration
   */
  static createFormValidator(
    fieldConfig: Array<{
      name: string
      type: 'string' | 'number' | 'boolean' | 'email' | 'url'
      required?: boolean
      validation?: {
        minLength?: number
        maxLength?: number
        min?: number
        max?: number
        pattern?: string
      }
    }>,
  ) {
    const schema = SchemaBuilder.createFormSchema(
      fieldConfig.map(field => ({
        name: field.name,
        type: field.type === 'email' || field.type === 'url' ? 'string' : field.type,
        required: field.required,
        format: field.type === 'email' ? 'email' : field.type === 'url' ? 'uri' : undefined,
        ...(field.validation?.minLength && { minLength: field.validation.minLength }),
        ...(field.validation?.maxLength && { maxLength: field.validation.maxLength }),
        ...(field.validation?.min && { minimum: field.validation.min }),
        ...(field.validation?.max && { maximum: field.validation.max }),
        ...(field.validation?.pattern && { pattern: field.validation.pattern }),
      })),
    )

    return createValidator(schema)
  }
}

// =============================================================================
// EXAMPLE 4: API Response with Dynamic Data
// =============================================================================

export interface ApiResponse<T = any> {
  success: boolean
  message?: string
  data?: T
  errors?: Array<{ field: string; message: string }>
  [key: string]: any // Allow additional metadata
}

export const ApiResponseSchema: any = {
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    message: { type: 'string' },
    data: {}, // Can be anything
    errors: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          field: { type: 'string' },
          message: { type: 'string' },
        },
        required: ['field', 'message'],
        additionalProperties: true,
      },
    },
  },
  required: ['success'],
  additionalProperties: true,
}

export const apiResponseValidator = createValidator(ApiResponseSchema)

// =============================================================================
// EXAMPLE 5: Migration Utility Functions
// =============================================================================

/**
 * Utility to help migrate Zod schemas to AJV
 */
export class ZodToAjvMigrator {
  /**
   * Convert a basic Zod-style object definition to AJV schema
   */
  static convertObjectSchema<T>(
    zodLikeDefinition: Record<string, any>,
    requiredFields: (keyof T)[],
    allowDynamicFields = true,
  ): any {
    const properties: any = {}

    for (const [key, zodType] of Object.entries(zodLikeDefinition)) {
      properties[key] = this.convertFieldType(zodType)
    }

    return {
      type: 'object',
      properties,
      required: requiredFields,
      additionalProperties: allowDynamicFields,
    }
  }

  private static convertFieldType(zodType: any): any {
    // This is a simplified converter - extend as needed
    if (typeof zodType === 'string') {
      switch (zodType) {
        case 'string':
          return { type: 'string' }
        case 'number':
          return { type: 'number' }
        case 'boolean':
          return { type: 'boolean' }
        case 'email':
          return { type: 'string', format: 'email' }
        case 'url':
          return { type: 'string', format: 'uri' }
        case 'date':
          return { type: 'string', format: 'date-time' }
        default:
          return { type: 'string' }
      }
    }
    return zodType
  }
}

// =============================================================================
// EXAMPLE 6: Runtime Schema Generation
// =============================================================================

/**
 * Example: Generate validation schemas from database metadata
 */
export class DatabaseSchemaGenerator {
  /**
   * Generate AJV schema from database table metadata
   */
  static generateTableSchema(tableMetadata: {
    tableName: string
    columns: Array<{
      name: string
      type: string
      nullable: boolean
      defaultValue?: any
      constraints?: {
        maxLength?: number
        pattern?: string
        enum?: string[]
      }
    }>
    allowCustomFields?: boolean
  }) {
    const properties: any = {}
    const required: string[] = []

    for (const column of tableMetadata.columns) {
      const property: any = {
        type: this.mapDatabaseTypeToJsonType(column.type),
        nullable: column.nullable,
      }

      if (column.defaultValue !== undefined) {
        property.default = column.defaultValue
      }

      if (column.constraints) {
        if (column.constraints.maxLength) {
          property.maxLength = column.constraints.maxLength
        }
        if (column.constraints.pattern) {
          property.pattern = column.constraints.pattern
        }
        if (column.constraints.enum) {
          property.enum = column.constraints.enum
        }
      }

      properties[column.name] = property

      if (!column.nullable) {
        required.push(column.name)
      }
    }

    return {
      type: 'object',
      properties,
      required,
      additionalProperties: tableMetadata.allowCustomFields ?? true,
    }
  }

  private static mapDatabaseTypeToJsonType(dbType: string): string {
    const typeMap: Record<string, string> = {
      varchar: 'string',
      text: 'string',
      char: 'string',
      int: 'number',
      integer: 'number',
      bigint: 'number',
      decimal: 'number',
      float: 'number',
      boolean: 'boolean',
      bool: 'boolean',
      date: 'string',
      datetime: 'string',
      timestamp: 'string',
      json: 'object',
      jsonb: 'object',
    }

    return typeMap[dbType.toLowerCase()] || 'string'
  }
}

// =============================================================================
// EXAMPLE USAGE
// =============================================================================

/*
// Example 1: Validate user with dynamic profile fields
const userData = {
  id: 1,
  name: "John Doe",
  email: "john@example.com",
  // Dynamic fields
  profile_preferences: { theme: "dark", notifications: true },
  custom_field_123: "some value"
};

const userResult = userValidator.validate(userData);
if (userResult.success) {
  console.log("User is valid:", userResult.data);
}

// Example 2: Validate product with Salesforce custom fields
const productData = {
  Id: "001xx000003DHPt",
  Name: "Widget Pro",
  IsActive: true,
  // Salesforce custom fields
  Product_Category__c: "Software",
  Custom_Field__c: "Custom value"
};

const productResult = productValidator.validate(productData);

// Example 3: Dynamic form validation
const formConfig = [
  { name: "firstName", type: "string", required: true },
  { name: "email", type: "email", required: true },
  { name: "age", type: "number", required: false, validation: { min: 0, max: 120 } }
];

const formValidator = DynamicFormValidator.createFormValidator(formConfig);
const formData = {
  firstName: "Jane",
  email: "jane@example.com",
  age: 30,
  // Additional fields allowed
  newsletter: true,
  source: "website"
};

const formResult = formValidator.validate(formData);
*/
