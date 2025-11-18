import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  ajv,
  apiResponseValidator,
  BaseValidator,
  CommonSchemas,
  createValidator,
  DynamicValidator,
  dynamicValidator,
  MigrationHelpers,
  productValidator,
  SchemaBuilder,
  userValidator,
  type ValidationError,
  type ValidationResult,
  validateData,
} from './ajv.js'

describe('AJV Validation System', () => {
  describe('Core AJV Instance', () => {
    it('should be configured with proper options', () => {
      expect(ajv.opts.allErrors).toBe(true)
      expect(ajv.opts.verbose).toBe(true)
      expect(ajv.opts.strict).toBe(false)
      expect(ajv.opts.removeAdditional).toBe(false)
    })

    it('should support standard formats', () => {
      const schema = {
        type: 'object',
        properties: {
          email: { type: 'string', format: 'email' },
          date: { type: 'string', format: 'date-time' },
          url: { type: 'string', format: 'uri' },
        },
      }

      const validate = ajv.compile(schema)

      // Valid data
      expect(
        validate({
          email: 'test@example.com',
          date: '2023-01-01T00:00:00.000Z',
          url: 'https://example.com',
        }),
      ).toBe(true)

      // Invalid email
      expect(
        validate({
          email: 'invalid-email',
          date: '2023-01-01T00:00:00.000Z',
          url: 'https://example.com',
        }),
      ).toBe(false)
    })
  })

  describe('BaseValidator', () => {
    let validator: BaseValidator<{ name: string; age: number }>

    beforeEach(() => {
      const schema = {
        type: 'object',
        properties: {
          name: { type: 'string' },
          age: { type: 'number' },
        },
        required: ['name', 'age'],
        additionalProperties: true,
      }
      validator = createValidator<{ name: string; age: number }>(schema)
    })

    it('should validate valid data', () => {
      const result = validator.validate({ name: 'John', age: 30 })
      expect(result.success).toBe(true)
      expect(result.data).toEqual({ name: 'John', age: 30 })
      expect(result.errors).toBeUndefined()
    })

    it('should allow additional properties', () => {
      const result = validator.validate({
        name: 'John',
        age: 30,
        extra: 'field',
        nested: { data: true },
      })
      expect(result.success).toBe(true)
      expect(result.data).toEqual({
        name: 'John',
        age: 30,
        extra: 'field',
        nested: { data: true },
      })
    })

    it('should return validation errors for invalid data', () => {
      const result = validator.validate({ name: 'John' })
      expect(result.success).toBe(false)
      expect(result.data).toBeUndefined()
      expect(result.errors).toBeDefined()
      expect(result.errors!.length).toBeGreaterThan(0)
      // Check that the error is about a required field (could be different field path formats)
      expect(result.errors![0].message).toContain('required')
    })

    it('should format errors correctly', () => {
      const result = validator.validate({ name: 123, age: 'invalid' })
      expect(result.success).toBe(false)
      expect(result.errors).toBeDefined()
      expect(result.errors!.length).toBe(2)

      const nameError = result.errors!.find(e => e.field.includes('name'))
      const ageError = result.errors!.find(e => e.field.includes('age'))

      expect(nameError).toBeDefined()
      expect(ageError).toBeDefined()
      expect(nameError!.code).toBe('type')
      expect(ageError!.code).toBe('type')
    })
  })

  describe('DynamicValidator', () => {
    let validator: DynamicValidator

    beforeEach(() => {
      validator = new DynamicValidator()
    })

    afterEach(() => {
      validator.clearCache()
    })

    it('should create and cache validators', () => {
      const schema = {
        type: 'object',
        properties: { test: { type: 'string' } },
      }

      const validator1 = validator.createValidator('test-schema', schema)
      const validator2 = validator.createValidator('test-schema', schema)

      expect(validator1).toBe(validator2) // Should return cached instance
    })

    it('should validate with dynamic schema', () => {
      const schema = {
        type: 'object',
        properties: {
          dynamicField: { type: 'string' },
        },
        additionalProperties: true,
      }

      const result = validator.validate('dynamic-test', schema, {
        dynamicField: 'value',
        customField: 'extra',
      })

      expect(result.success).toBe(true)
      expect(result.data).toEqual({
        dynamicField: 'value',
        customField: 'extra',
      })
    })

    it('should return errors for invalid dynamic data', () => {
      const schema = {
        type: 'object',
        properties: {
          requiredField: { type: 'string' },
        },
        required: ['requiredField'],
      }

      const result = validator.validate('dynamic-error-test', schema, {})

      expect(result.success).toBe(false)
      expect(result.errors).toBeDefined()
      expect(result.errors!.length).toBeGreaterThan(0)
    })

    it('should clear cache', () => {
      const schema = { type: 'string' }
      validator.createValidator('cache-test', schema)

      expect(validator['schemas'].size).toBe(1)
      validator.clearCache()
      expect(validator['schemas'].size).toBe(0)
    })
  })

  describe('Global dynamic validator', () => {
    it('should work with global instance', () => {
      const schema = {
        type: 'object',
        properties: { global: { type: 'boolean' } },
      }

      const result = dynamicValidator.validate('global-test', schema, {
        global: true,
        extra: 'allowed',
      })

      expect(result.success).toBe(true)
    })
  })

  describe('Utility Functions', () => {
    describe('validateData', () => {
      it('should validate data with one-off schema', () => {
        const schema = {
          type: 'object',
          properties: { test: { type: 'number' } },
        }

        const result = validateData<{ test: number }>(schema, { test: 42 })
        expect(result.success).toBe(true)
        expect(result.data!.test).toBe(42)
      })
    })
  })

  describe('SchemaBuilder', () => {
    describe('withDynamicFields', () => {
      it('should add additionalProperties to schema', () => {
        const baseSchema = {
          type: 'object',
          properties: { name: { type: 'string' } },
        }

        const dynamicSchema = SchemaBuilder.withDynamicFields(baseSchema)
        expect(dynamicSchema.additionalProperties).toBe(true)
      })
    })

    describe('createFormSchema', () => {
      it('should create schema from field definitions', () => {
        const fields = [
          { name: 'firstName', type: 'string' as const, required: true },
          { name: 'age', type: 'number' as const, required: false, minimum: 0 },
          { name: 'email', type: 'string' as const, format: 'email', required: true },
        ]

        const schema = SchemaBuilder.createFormSchema(fields)

        expect(schema.type).toBe('object')
        expect(schema.properties.firstName).toEqual({ type: 'string' })
        expect(schema.properties.age).toEqual({ type: 'number', minimum: 0 })
        expect(schema.properties.email).toEqual({ type: 'string', format: 'email' })
        expect(schema.required).toEqual(['firstName', 'email'])
        expect(schema.additionalProperties).toBe(true)
      })

      it('should handle all field options', () => {
        const fields = [
          {
            name: 'pattern_field',
            type: 'string' as const,
            pattern: '^[A-Z]+$',
            required: true,
          },
          {
            name: 'range_field',
            type: 'number' as const,
            minimum: 1,
            maximum: 100,
          },
          {
            name: 'array_field',
            type: 'array' as const,
            items: { type: 'string' },
          },
          {
            name: 'object_field',
            type: 'object' as const,
            properties: { nested: { type: 'string' } },
          },
        ]

        const schema = SchemaBuilder.createFormSchema(fields)

        expect(schema.properties.pattern_field.pattern).toBe('^[A-Z]+$')
        expect(schema.properties.range_field.minimum).toBe(1)
        expect(schema.properties.range_field.maximum).toBe(100)
        expect(schema.properties.array_field.items).toEqual({ type: 'string' })
        expect(schema.properties.object_field.properties).toEqual({ nested: { type: 'string' } })
      })
    })

    describe('createEntitySchema', () => {
      it('should create entity schema with base fields', () => {
        const baseFields = {
          id: { type: 'number' },
          name: { type: 'string' },
        }

        const schema = SchemaBuilder.createEntitySchema(baseFields)

        expect(schema.type).toBe('object')
        expect(schema.properties).toEqual(baseFields)
        expect(schema.additionalProperties).toBe(true)
      })

      it('should allow disabling dynamic fields', () => {
        const baseFields = {
          id: { type: 'number' },
        }

        const schema = SchemaBuilder.createEntitySchema(baseFields, false)
        expect(schema.additionalProperties).toBe(false)
      })
    })
  })

  describe('CommonSchemas', () => {
    describe('user schema', () => {
      it('should validate user with required fields', () => {
        const userData = {
          id: 1,
          email: 'user@example.com',
          name: 'Test User',
          created_at: '2023-01-01T00:00:00.000Z',
          updated_at: '2023-01-01T00:00:00.000Z',
        }

        const result = validateData(CommonSchemas.user, userData)
        expect(result.success).toBe(true)
      })

      it('should allow dynamic user fields', () => {
        const userData = {
          id: 1,
          email: 'user@example.com',
          name: 'Test User',
          created_at: '2023-01-01T00:00:00.000Z',
          updated_at: '2023-01-01T00:00:00.000Z',
          profile: { avatar: 'url', bio: 'description' },
          custom_field: 'value',
        }

        const result = validateData(CommonSchemas.user, userData)
        expect(result.success).toBe(true)
        expect(result.data!.profile).toBeDefined()
        expect(result.data!.custom_field).toBe('value')
      })
    })

    describe('product schema', () => {
      it('should validate product with required fields', () => {
        const productData = {
          id: 'prod-123',
          name: 'Test Product',
          description: 'A test product',
          price: 99.99,
          isActive: true,
          created_at: '2023-01-01T00:00:00.000Z',
        }

        const result = validateData(CommonSchemas.product, productData)
        expect(result.success).toBe(true)
      })

      it('should allow custom product fields', () => {
        const productData = {
          id: 'prod-123',
          name: 'Test Product',
          price: 99.99,
          isActive: true,
          created_at: '2023-01-01T00:00:00.000Z',
          category__c: 'Electronics',
          sku__c: 'SKU-123',
        }

        const result = validateData(CommonSchemas.product, productData)
        expect(result.success).toBe(true)
      })

      it('should enforce price minimum', () => {
        const productData = {
          id: 'prod-123',
          name: 'Test Product',
          price: -10,
          isActive: true,
          created_at: '2023-01-01T00:00:00.000Z',
        }

        const result = validateData(CommonSchemas.product, productData)
        expect(result.success).toBe(false)
        expect(result.errors!.some(e => e.field.includes('price'))).toBe(true)
      })
    })

    describe('apiResponse schema', () => {
      it('should validate API response', () => {
        const responseData = {
          success: true,
          message: 'Operation successful',
          data: { result: 'test' },
        }

        const result = validateData(CommonSchemas.apiResponse, responseData)
        expect(result.success).toBe(true)
      })

      it('should validate API error response', () => {
        const responseData = {
          success: false,
          message: 'Validation failed',
          errors: [
            { field: 'email', message: 'Invalid email format' },
            { field: 'age', message: 'Must be a number' },
          ],
        }

        const result = validateData(CommonSchemas.apiResponse, responseData)
        expect(result.success).toBe(true)
      })

      it('should require success field', () => {
        const responseData = {
          message: 'Missing success field',
        }

        const result = validateData(CommonSchemas.apiResponse, responseData)
        expect(result.success).toBe(false)
      })
    })
  })

  describe('MigrationHelpers', () => {
    describe('commonPatterns', () => {
      it('should provide basic type patterns', () => {
        expect(MigrationHelpers.commonPatterns.string()).toEqual({ type: 'string' })
        expect(MigrationHelpers.commonPatterns.number()).toEqual({ type: 'number' })
        expect(MigrationHelpers.commonPatterns.boolean()).toEqual({ type: 'boolean' })
      })

      it('should provide format patterns', () => {
        expect(MigrationHelpers.commonPatterns.email()).toEqual({ type: 'string', format: 'email' })
        expect(MigrationHelpers.commonPatterns.url()).toEqual({ type: 'string', format: 'uri' })
        expect(MigrationHelpers.commonPatterns.datetime()).toEqual({ type: 'string', format: 'date-time' })
        expect(MigrationHelpers.commonPatterns.uuid()).toEqual({ type: 'string', format: 'uuid' })
      })

      it('should provide complex patterns', () => {
        const baseSchema = { type: 'string' }
        expect(MigrationHelpers.commonPatterns.nullable(baseSchema)).toEqual({
          type: 'string',
          nullable: true,
        })

        expect(MigrationHelpers.commonPatterns.array({ type: 'number' })).toEqual({
          type: 'array',
          items: { type: 'number' },
        })

        expect(MigrationHelpers.commonPatterns.enum(['a', 'b', 'c'])).toEqual({
          type: 'string',
          enum: ['a', 'b', 'c'],
        })

        expect(MigrationHelpers.commonPatterns.literal('test')).toEqual({ const: 'test' })
      })
    })

    describe('createHybridValidator', () => {
      it('should create validator that allows additional properties', () => {
        const staticSchema = {
          type: 'object',
          properties: {
            name: { type: 'string' },
            age: { type: 'number' },
          },
          required: ['name'],
        }

        const validator = MigrationHelpers.createHybridValidator(staticSchema)

        const result = validator.validate({
          name: 'John',
          age: 30,
          customField: 'allowed',
        })

        expect(result.success).toBe(true)
        expect(result.data!.customField).toBe('allowed')
      })

      it('should provide strict validation mode', () => {
        const staticSchema = {
          type: 'object',
          properties: {
            name: { type: 'string' },
            age: { type: 'number' },
          },
          required: ['name'],
        }

        const validator = MigrationHelpers.createHybridValidator(staticSchema)

        const result = validator.validateStrict({
          name: 'John',
          age: 30,
          customField: 'filtered out',
        })

        expect(result.success).toBe(true)
        expect(result.data!.name).toBe('John')
        expect(result.data!.age).toBe(30)
        expect((result.data! as any).customField).toBeUndefined()
      })
    })
  })

  describe('Pre-configured Validators', () => {
    describe('userValidator', () => {
      it('should validate users', () => {
        const user = {
          id: 1,
          email: 'test@example.com',
          name: 'Test User',
          created_at: '2023-01-01T00:00:00.000Z',
          updated_at: '2023-01-01T00:00:00.000Z',
          customData: { preferences: { theme: 'dark' } },
        }

        const result = userValidator.validate(user)
        expect(result.success).toBe(true)
      })
    })

    describe('productValidator', () => {
      it('should validate products', () => {
        const product = {
          id: 'prod-123',
          name: 'Widget',
          description: 'A useful widget',
          price: 19.99,
          isActive: true,
          created_at: '2023-01-01T00:00:00.000Z',
          metadata: { category: 'tools' },
        }

        const result = productValidator.validate(product)
        expect(result.success).toBe(true)
      })
    })

    describe('apiResponseValidator', () => {
      it('should validate API responses', () => {
        const response = {
          success: true,
          message: 'Data retrieved successfully',
          data: { items: [], total: 0 },
          metadata: { timestamp: Date.now() },
        }

        const result = apiResponseValidator.validate(response)
        expect(result.success).toBe(true)
      })
    })
  })

  describe('Error Handling and Edge Cases', () => {
    it('should handle circular references in data', () => {
      const schema = {
        type: 'object',
        additionalProperties: true,
      }

      const circularData: any = { name: 'test' }
      circularData.self = circularData

      // AJV should handle this gracefully
      const result = validateData(schema, circularData)
      expect(result.success).toBe(true)
    })

    it('should handle very large objects', () => {
      const schema = {
        type: 'object',
        additionalProperties: true,
      }

      const largeData: any = {}
      for (let i = 0; i < 1000; i++) {
        largeData[`field_${i}`] = `value_${i}`
      }

      const result = validateData(schema, largeData)
      expect(result.success).toBe(true)
    })

    it('should handle null and undefined values', () => {
      const schema = {
        type: 'object',
        properties: {
          optional: { type: 'string', nullable: true },
          required: { type: 'string' },
        },
        required: ['required'],
        additionalProperties: true,
      }

      const validResult = validateData(schema, {
        optional: null,
        required: 'value',
        undefined_field: undefined,
      })
      expect(validResult.success).toBe(true)

      const invalidResult = validateData(schema, {
        optional: null,
        required: null,
      })
      expect(invalidResult.success).toBe(false)
    })

    it('should handle deeply nested objects', () => {
      const schema = {
        type: 'object',
        additionalProperties: true,
      }

      const deepData = {
        level1: {
          level2: {
            level3: {
              level4: {
                value: 'deep',
              },
            },
          },
        },
      }

      const result = validateData(schema, deepData)
      expect(result.success).toBe(true)
    })
  })

  describe('Performance Tests', () => {
    it('should handle multiple validations efficiently', () => {
      const schema = {
        type: 'object',
        properties: {
          id: { type: 'number' },
          name: { type: 'string' },
        },
        additionalProperties: true,
      }

      const validator = createValidator(schema)
      const testData = { id: 1, name: 'test', extra: 'field' }

      const start = Date.now()
      for (let i = 0; i < 1000; i++) {
        validator.validate({ ...testData, id: i })
      }
      const duration = Date.now() - start

      expect(duration).toBeLessThan(1000) // Should complete in under 1 second
    })
  })
})
