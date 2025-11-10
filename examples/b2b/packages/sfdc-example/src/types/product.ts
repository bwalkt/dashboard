import { z } from 'zod'

/**
 * Zod schemas for Salesforce Product object
 * Based on Salesforce describe API metadata and existing Product type
 */

// Picklist value schemas based on actual Salesforce metadata
export const ProductFamilySchema = z.literal('None') // Only "None" is available in this org
export const ProductClassSchema = z.enum(['Simple', 'VariationParent', 'Variation', 'Bundle', 'Set'])
export const ProductTypeSchema = z.enum(['Base', 'Bundle', 'Set'])
export const ProductCategorySchema = z.enum(['Software', 'Services'])

// Product attributes schema
export const ProductAttributesSchema = z.object({
  type: z.literal('Product'),
  url: z.string().url(),
})

// Main Product schema based on Salesforce metadata
export const ProductSchema = z.object({
  attributes: ProductAttributesSchema,

  // Core fields
  Id: z.string(),
  Name: z.string(),
  ProductCode: z.string().nullable(),
  Description: z.string().nullable(),
  IsActive: z.boolean(),
  Family: ProductFamilySchema.nullable(),
  ProductClass: ProductClassSchema,
  Type: ProductTypeSchema.nullable(),

  // System fields
  CreatedDate: z.string(), // datetime
  CreatedById: z.string(), // Reference to User
  LastModifiedDate: z.string(), // datetime
  LastModifiedById: z.string(), // Reference to User
  SystemModstamp: z.string(), // datetime
  IsDeleted: z.boolean(),
  LastViewedDate: z.string().nullable(), // datetime
  LastReferencedDate: z.string().nullable(), // datetime

  // Product details
  StockKeepingUnit: z.string().nullable(), // SKU
  QuantityUnitOfMeasure: z.string().nullable(),
  DisplayUrl: z.string().url().nullable(),
  ExternalDataSourceId: z.string().nullable(), // Reference to ExternalDataSource
  ExternalId: z.string().nullable(),

  // Custom fields (based on existing Product type)
  Product_Category__c: ProductCategorySchema.nullable(), // picklist: Software, Services
  Unit_Price__c: z.number().nullable(), // currency
  Cost_Per_Unit__c: z.number().nullable(), // currency
  External_Id__c: z.string().nullable(), // string, unique
})

// Product creation request schema
export const ProductCreateRequestSchema = z.object({
  // Required fields
  Name: z.string(),
  IsActive: z.boolean(),
  // Note: ProductClass is read-only in this org and cannot be set during creation

  // Optional standard fields
  ProductCode: z.string().nullish(),
  Description: z.string().nullish(),
  Family: ProductFamilySchema.nullish(),
  Type: ProductTypeSchema.nullish(),
  StockKeepingUnit: z.string().nullish(),
  QuantityUnitOfMeasure: z.string().nullish(),
  DisplayUrl: z.string().url().nullish(),
  ExternalDataSourceId: z.string().nullish(),
  ExternalId: z.string().nullish(),

  // Custom fields
  Product_Category__c: ProductCategorySchema.nullish(),
  Unit_Price__c: z.number().nullish(),
  Cost_Per_Unit__c: z.number().nullish(),
  External_Id__c: z.string().nullish(),
})

// Product update request schema
export const ProductUpdateRequestSchema = ProductCreateRequestSchema.partial()

// Product query response schema
export const ProductQueryResponseSchema = z.object({
  success: z.boolean(),
  query: z.string(),
  totalSize: z.number(),
  records: z.array(ProductSchema),
  done: z.boolean(),
})

// Inferred types from schemas
export type ProductFamily = z.infer<typeof ProductFamilySchema>
export type ProductClass = z.infer<typeof ProductClassSchema>
export type ProductType = z.infer<typeof ProductTypeSchema>
export type ProductCategory = z.infer<typeof ProductCategorySchema>
export type ProductAttributes = z.infer<typeof ProductAttributesSchema>
export type Product = z.infer<typeof ProductSchema>
export type ProductCreateRequest = z.infer<typeof ProductCreateRequestSchema>
export type ProductUpdateRequest = z.infer<typeof ProductUpdateRequestSchema>
export type ProductQueryResponse = z.infer<typeof ProductQueryResponseSchema>

