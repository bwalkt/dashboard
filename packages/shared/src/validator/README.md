# AJV Validation System with Dynamic Fields

This module provides a comprehensive validation system using AJV that supports both static schema validation (like Zod) and dynamic fields, making it perfect for applications that need runtime flexibility.

## 🚀 Key Features

- **Static Schema Validation** - Type-safe validation like Zod
- **Dynamic Field Support** - Allow additional properties at runtime
- **Salesforce Integration** - Perfect for custom fields (e.g., `Product_Category__c`)
- **Form Builder Support** - Runtime form validation based on configuration
- **Migration Helpers** - Easy transition from Zod to AJV
- **TypeScript Support** - Full type safety where possible

## 📦 Installation

AJV is already installed in the shared package:

```bash
npm install ajv ajv-formats
```

## 🔧 Basic Usage

### Simple Dynamic Validation

```typescript
import { createValidator } from '@pzero/shared/validator';

const userSchema = {
  type: 'object',
  properties: {
    id: { type: 'number' },
    name: { type: 'string' },
    email: { type: 'string', format: 'email' },
  },
  required: ['id', 'name', 'email'],
  additionalProperties: true, // Allow dynamic fields
};

const validator = createValidator(userSchema);

const userData = {
  id: 1,
  name: 'John Doe',
  email: 'john@example.com',
  // Dynamic fields
  profile: { avatar: 'url', theme: 'dark' },
  custom_field_123: 'value',
};

const result = validator.validate(userData);
if (result.success) {
  console.log('Valid!', result.data);
} else {
  console.log('Errors:', result.errors);
}
```

### Salesforce-style Custom Fields

```typescript
import { createValidator } from '@pzero/shared/validator';

const productSchema = {
  type: 'object',
  properties: {
    Id: { type: 'string' },
    Name: { type: 'string' },
    IsActive: { type: 'boolean' },
  },
  required: ['Id', 'Name'],
  additionalProperties: true, // Allows Salesforce custom fields
};

const validator = createValidator(productSchema);

const productData = {
  Id: '001xx000003DHPt',
  Name: 'Widget Pro',
  IsActive: true,
  // Salesforce custom fields
  Product_Category__c: 'Software',
  Unit_Price__c: 99.99,
  External_Id__c: 'EXT_123',
};

const result = validator.validate(productData);
```

### Dynamic Form Validation

```typescript
import { createDynamicFormValidator } from '@pzero/shared/validator';

const formConfig = [
  { name: 'firstName', type: 'string', required: true },
  { name: 'email', type: 'string', required: true, format: 'email' },
  { name: 'age', type: 'number', required: false },
];

const validator = createDynamicFormValidator(formConfig);

const formData = {
  firstName: 'Jane',
  email: 'jane@example.com',
  age: 30,
  // Additional fields allowed
  newsletter: true,
  source: 'website',
  metadata: { utm_source: 'google' },
};
```

## 🔄 Migration from Zod

### Before (Traditional validation libraries)

```typescript
// Example with other validation libraries
const UserSchema = {
  id: { type: 'number' },
  name: { type: 'string' },
  email: { type: 'string', format: 'email' },
  // No dynamic fields allowed
};
```

### After (AJV with Dynamic Fields)

```typescript
import { createValidator } from '@pzero/shared/validator';

const UserSchema = {
  type: 'object',
  properties: {
    id: { type: 'number' },
    name: { type: 'string' },
    email: { type: 'string', format: 'email' },
  },
  required: ['id', 'name', 'email'],
  additionalProperties: true, // NEW: Allow dynamic fields
};

interface User {
  id: number;
  name: string;
  email: string;
  [key: string]: any; // NEW: Allow dynamic properties
}

const userValidator = createValidator<User>(UserSchema);
```

## 🛠 Advanced Usage

### Runtime Schema Generation

```typescript
import { SchemaBuilder } from '@pzero/shared/validator';

// Generate schema from database metadata
const tableSchema = SchemaBuilder.createEntitySchema({
  id: { type: 'number' },
  name: { type: 'string' },
  created_at: { type: 'string', format: 'date-time' },
}, true); // Allow dynamic fields

// Generate schema from form configuration
const formSchema = SchemaBuilder.createFormSchema([
  { name: 'title', type: 'string', required: true },
  { name: 'price', type: 'number', required: true, minimum: 0 },
  { name: 'description', type: 'string', required: false },
]);
```

### Hybrid Validation (Static + Dynamic)

```typescript
import { MigrationHelpers } from '@pzero/shared/validator';

// Create validator that accepts both static and dynamic fields
const hybridValidator = MigrationHelpers.createHybridValidator({
  type: 'object',
  properties: {
    id: { type: 'number' },
    name: { type: 'string' },
  },
  required: ['id', 'name'],
});

// Validate strictly (only static fields)
const strictResult = hybridValidator.validateStrict(data);

// Validate loosely (allow dynamic fields)
const looseResult = hybridValidator.validate(data);
```

## 🎯 Use Cases

### 1. Salesforce Integration
Perfect for handling Salesforce objects with custom fields:
- Standard fields: `Name`, `Id`, `IsActive`
- Custom fields: `Product_Category__c`, `Custom_Field__c`

### 2. Multi-tenant Applications
Allow different tenants to have custom fields:
```typescript
const tenantUserSchema = {
  ...baseUserSchema,
  additionalProperties: true, // Tenant-specific fields
};
```

### 3. Form Builders
Create forms with runtime-defined fields:
```typescript
const formValidator = createDynamicFormValidator(configFromDatabase);
```

### 4. API Responses
Accept additional metadata in API responses:
```typescript
const apiResponseSchema = {
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    data: {},
  },
  required: ['success'],
  additionalProperties: true, // Allow metadata, pagination, etc.
};
```

## ⚡ Performance

AJV is highly optimized:
- **Fast compilation** - Schemas compiled to functions
- **Caching** - Compiled validators cached automatically
- **Memory efficient** - Reuse validators across requests

## 🔍 Debugging

### View Validation Errors

```typescript
const result = validator.validate(data);
if (!result.success) {
  result.errors?.forEach(error => {
    console.log(`Field: ${error.field}`);
    console.log(`Error: ${error.message}`);
    console.log(`Value: ${error.value}`);
  });
}
```

### Schema Testing

```typescript
import { validateData } from '@pzero/shared/validator';

// Quick one-off validation
const result = validateData(schema, data);
```

## 📚 Available Exports

### Main AJV Validation System
```typescript
// From @pzero/shared/validator
import {
  // Core validation
  ajv,                    // Main AJV instance
  createValidator,        // Create typed validators
  validateData,          // Quick validation
  dynamicValidator,      // Runtime schema validation
  
  // Schema builders
  SchemaBuilder,         // Build schemas programmatically
  CommonSchemas,         // Pre-built common schemas
  
  // Migration helpers
  MigrationHelpers,      // Schema conversion helpers
  
  // Types
  ValidationResult,      // Result interface
  ValidationError,       // Error interface
  BaseValidator,         // Base validator class
  
  // Utility validators
  validator,             // String validation utilities
} from '@pzero/shared/validator'
```

### Pre-built Migration Validators
```typescript
// From the migrations module (for migration examples)
import {
  userValidator,         // Pre-built user validator
  productValidator,      // Pre-built product validator  
  apiResponseValidator,  // Pre-built API response validator
  
  // Migration interfaces
  User,
  Product,
  ApiResponse,
  
  // Migration schemas
  UserSchema,
  ProductSchema,
  ApiResponseSchema,
} from '@pzero/shared/validator/migrations'
```

### Email & Phone Validation
```typescript
// Email validation
import { emailValidator } from '@pzero/shared/validator/email'

// Phone validation  
import { phoneValidator } from '@pzero/shared/validator/phone'
```

### Testing Examples
```typescript
// Testing utilities (not part of public API)
import { AjvExamples } from '@pzero/shared/validator/test-ajv'
```

## 🧪 Testing

Run the validation tests:

```bash
node -e "
const { AjvExamples } = require('./dist/validator/test-ajv');
AjvExamples.runAllTests();
"
```

## 🔗 Resources

- [AJV Documentation](https://ajv.js.org/)
- [JSON Schema Specification](https://json-schema.org/)
- [AJV Formats](https://github.com/ajv-validator/ajv-formats)

## 🚀 Next Steps

1. **Dynamic Forms**: Implement form builders using `createDynamicFormValidator`
2. **Custom Fields**: Add support for user/organization-specific custom fields
3. **API Integration**: Use for validating third-party API responses with unknown fields
4. **Schema Evolution**: Build schemas that can evolve with changing requirements

---

**Key Advantage**: AJV allows you to accept additional properties while still validating the core schema structure, making it perfect for dynamic applications!