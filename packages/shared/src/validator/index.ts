// Export AJV validation system (separate from conflicting Zod exports)
export {
  ajv,
  BaseValidator,
  CommonSchemas,
  createValidator,
  dynamicValidator,
  MigrationHelpers,
  SchemaBuilder,
  type ValidationError,
  type ValidationResult,
  validateData,
} from './ajv.js'

// Export other validators
export * from './email.js'
export * from './validator.js'

// Note: AjvExamples is available for testing at '@pzero/shared/validator/test-ajv'
// but not exported from the main index to keep the public API surface clean
