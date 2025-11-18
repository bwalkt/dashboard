/**
 * AJV Validation Test - Demonstrating Dynamic Field Support
 * This shows how AJV can handle both static and dynamic fields
 */

import { ajv } from './ajv'

// Example: User schema with dynamic fields
const userSchemaWithDynamicFields = {
  type: 'object',
  properties: {
    id: { type: 'number' },
    name: { type: 'string' },
    email: { type: 'string', format: 'email' },
    created_at: { type: 'string', format: 'date-time' },
  },
  required: ['id', 'name', 'email'],
  additionalProperties: true, // This allows dynamic fields!
}

const validateUser = ajv.compile(userSchemaWithDynamicFields)

// Example: Product schema with Salesforce-style custom fields
const productSchemaWithCustomFields = {
  type: 'object',
  properties: {
    Id: { type: 'string' },
    Name: { type: 'string' },
    IsActive: { type: 'boolean' },
  },
  required: ['Id', 'Name'],
  additionalProperties: true, // Allows custom fields like Product_Category__c
}

const validateProduct = ajv.compile(productSchemaWithCustomFields)

// Example: Dynamic form validation based on configuration
export type JsonSchemaType = 'string' | 'number' | 'boolean' | 'integer' | 'array' | 'object'

function createDynamicFormValidator(
  fields: Array<{
    name: string
    type: JsonSchemaType
    required?: boolean
    format?: string
  }>,
) {
  const properties: any = {}
  const required: string[] = []

  for (const field of fields) {
    properties[field.name] = {
      type: field.type,
      ...(field.format && { format: field.format }),
    }

    if (field.required) {
      required.push(field.name)
    }
  }

  const schema: any = {
    type: 'object',
    properties,
    additionalProperties: true, // Always allow additional fields
  }

  // Only include required array if there are required fields
  if (required.length > 0) {
    schema.required = required
  }

  return ajv.compile(schema)
}

// Test examples
export const AjvExamples = {
  // Test user with dynamic fields
  testUserValidation() {
    const userData = {
      id: 1,
      name: 'John Doe',
      email: 'john@example.com',
      created_at: '2023-01-01T00:00:00.000Z',
      // Dynamic fields
      profile: {
        avatar: 'https://example.com/avatar.jpg',
        bio: 'Software developer',
        preferences: {
          theme: 'dark',
          notifications: true,
        },
      },
      custom_field_123: 'Custom value',
      organization_id: 456,
    }

    const isValid = validateUser(userData)
    console.log('User validation:', isValid ? 'PASSED' : 'FAILED')
    if (!isValid) {
      console.log('Errors:', validateUser.errors)
    }
    return { isValid, data: userData, errors: validateUser.errors }
  },

  // Test product with Salesforce custom fields
  testProductValidation() {
    const productData = {
      Id: '001xx000003DHPt',
      Name: 'Widget Pro',
      IsActive: true,
      // Salesforce-style custom fields
      Product_Category__c: 'Software',
      Unit_Price__c: 99.99,
      External_Id__c: 'EXT_123',
      Custom_Field_ABC__c: 'Custom value',
    }

    const isValid = validateProduct(productData)
    console.log('Product validation:', isValid ? 'PASSED' : 'FAILED')
    if (!isValid) {
      console.log('Errors:', validateProduct.errors)
    }
    return { isValid, data: productData, errors: validateProduct.errors }
  },

  // Test dynamic form based on runtime configuration
  testDynamicForm() {
    const formConfig = [
      { name: 'firstName', type: 'string', required: true },
      { name: 'lastName', type: 'string', required: true },
      { name: 'email', type: 'string', required: true, format: 'email' },
      { name: 'age', type: 'number', required: false },
    ]

    const validateForm = createDynamicFormValidator(formConfig)

    const formData = {
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane@example.com',
      age: 30,
      // Additional fields not in config - should still be valid
      phone: '+1234567890',
      newsletter: true,
      source: 'website',
      metadata: {
        utm_source: 'google',
        utm_campaign: 'summer2023',
      },
    }

    const isValid = validateForm(formData)
    console.log('Dynamic form validation:', isValid ? 'PASSED' : 'FAILED')
    if (!isValid) {
      console.log('Errors:', validateForm.errors)
    }
    return { isValid, data: formData, errors: validateForm.errors }
  },

  // Run all tests
  runAllTests() {
    console.log('=== AJV Dynamic Field Validation Tests ===')

    const userResult = AjvExamples.testUserValidation()
    const productResult = AjvExamples.testProductValidation()
    const formResult = AjvExamples.testDynamicForm()

    const allPassed = userResult.isValid && productResult.isValid && formResult.isValid

    console.log('\n=== Summary ===')
    console.log(`All tests ${allPassed ? 'PASSED' : 'FAILED'}`)

    return {
      allPassed,
      results: {
        user: userResult,
        product: productResult,
        form: formResult,
      },
    }
  },
}
