import Ajv from 'ajv'
import addFormats from 'ajv-formats'

const ajv = new Ajv()
addFormats(ajv)

/**
 * AJV schemas for Salesforce Product object
 * Based on Salesforce describe API metadata and existing Product type
 */

// Picklist value schemas based on actual Salesforce metadata
export const ProductFamilySchema = { const: 'None' } // Only "None" is available in this org
export const ProductClassSchema = { enum: ['Simple', 'VariationParent', 'Variation', 'Bundle', 'Set'] }
export const ProductTypeSchema = { enum: ['Base', 'Bundle', 'Set'] }
export const ProductCategorySchema = { enum: ['Software', 'Services'] }

// Product attributes schema
export const ProductAttributesSchema = {
  type: 'object',
  properties: {
    type: { const: 'Product' },
    url: { type: 'string', format: 'url' },
  },
  required: ['type', 'url'],
  additionalProperties: false,
}

// Main Product schema based on Salesforce metadata
export const ProductSchema = {
  type: 'object',
  properties: {
    attributes: ProductAttributesSchema,

    // Core fields
    Id: { type: 'string' },
    Name: { type: 'string' },
    ProductCode: { type: ['string', 'null'] },
    Description: { type: ['string', 'null'] },
    IsActive: { type: 'boolean' },
    Family: { oneOf: [ProductFamilySchema, { type: 'null' }] },
    ProductClass: ProductClassSchema,
    Type: { oneOf: [ProductTypeSchema, { type: 'null' }] },

    // System fields
    CreatedDate: { type: 'string' }, // datetime
    CreatedById: { type: 'string' }, // Reference to User
    LastModifiedDate: { type: 'string' }, // datetime
    LastModifiedById: { type: 'string' }, // Reference to User
    SystemModstamp: { type: 'string' }, // datetime
    IsDeleted: { type: 'boolean' },
    LastViewedDate: { type: ['string', 'null'] }, // datetime
    LastReferencedDate: { type: ['string', 'null'] }, // datetime

    // Product details
    StockKeepingUnit: { type: ['string', 'null'] }, // SKU
    QuantityUnitOfMeasure: { type: ['string', 'null'] },
    DisplayUrl: { type: ['string', 'null'], format: 'url' },
    ExternalDataSourceId: { type: ['string', 'null'] }, // Reference to ExternalDataSource
    ExternalId: { type: ['string', 'null'] },

    // Custom fields (based on existing Product type)
    Product_Category__c: { oneOf: [ProductCategorySchema, { type: 'null' }] }, // picklist: Software, Services
    Unit_Price__c: { type: ['number', 'null'] }, // currency
    Cost_Per_Unit__c: { type: ['number', 'null'] }, // currency
    External_Id__c: { type: ['string', 'null'] }, // string, unique
  },
  required: [
    'attributes',
    'Id',
    'Name',
    'IsActive',
    'ProductClass',
    'CreatedDate',
    'CreatedById',
    'LastModifiedDate',
    'LastModifiedById',
    'SystemModstamp',
    'IsDeleted',
  ],
  additionalProperties: false,
}

// Product creation request schema
export const ProductCreateRequestSchema = {
  type: 'object',
  properties: {
    // Required fields
    Name: { type: 'string' },
    IsActive: { type: 'boolean' },
    // Note: ProductClass is read-only in this org and cannot be set during creation

    // Optional standard fields
    ProductCode: { type: ['string', 'null'] },
    Description: { type: ['string', 'null'] },
    Family: { oneOf: [ProductFamilySchema, { type: 'null' }] },
    Type: { oneOf: [ProductTypeSchema, { type: 'null' }] },
    StockKeepingUnit: { type: ['string', 'null'] },
    QuantityUnitOfMeasure: { type: ['string', 'null'] },
    DisplayUrl: { type: ['string', 'null'], format: 'url' },
    ExternalDataSourceId: { type: ['string', 'null'] },
    ExternalId: { type: ['string', 'null'] },

    // Custom fields
    Product_Category__c: { oneOf: [ProductCategorySchema, { type: 'null' }] },
    Unit_Price__c: { type: ['number', 'null'] },
    Cost_Per_Unit__c: { type: ['number', 'null'] },
    External_Id__c: { type: ['string', 'null'] },
  },
  required: ['Name', 'IsActive'],
  additionalProperties: false,
}

// Product update request schema (partial version of create schema)
export const ProductUpdateRequestSchema = {
  type: 'object',
  properties: {
    Name: { type: 'string' },
    IsActive: { type: 'boolean' },
    ProductCode: { type: ['string', 'null'] },
    Description: { type: ['string', 'null'] },
    Family: { oneOf: [ProductFamilySchema, { type: 'null' }] },
    Type: { oneOf: [ProductTypeSchema, { type: 'null' }] },
    StockKeepingUnit: { type: ['string', 'null'] },
    QuantityUnitOfMeasure: { type: ['string', 'null'] },
    DisplayUrl: { type: ['string', 'null'], format: 'url' },
    ExternalDataSourceId: { type: ['string', 'null'] },
    ExternalId: { type: ['string', 'null'] },
    Product_Category__c: { oneOf: [ProductCategorySchema, { type: 'null' }] },
    Unit_Price__c: { type: ['number', 'null'] },
    Cost_Per_Unit__c: { type: ['number', 'null'] },
    External_Id__c: { type: ['string', 'null'] },
  },
  additionalProperties: false,
}

// Product query response schema
export const ProductQueryResponseSchema = {
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    query: { type: 'string' },
    totalSize: { type: 'number' },
    records: { type: 'array', items: ProductSchema },
    done: { type: 'boolean' },
  },
  required: ['success', 'query', 'totalSize', 'records', 'done'],
  additionalProperties: false,
}

// Compiled validators
export const validateProduct = ajv.compile(ProductSchema)
export const validateProductCreateRequest = ajv.compile(ProductCreateRequestSchema)
export const validateProductUpdateRequest = ajv.compile(ProductUpdateRequestSchema)
export const validateProductQueryResponse = ajv.compile(ProductQueryResponseSchema)

// Type definitions
export type ProductFamily = 'None'
export type ProductClass = 'Simple' | 'VariationParent' | 'Variation' | 'Bundle' | 'Set'
export type ProductType = 'Base' | 'Bundle' | 'Set'
export type ProductCategory = 'Software' | 'Services'

export interface ProductAttributes {
  type: 'Product'
  url: string
}

export interface Product {
  attributes: ProductAttributes
  Id: string
  Name: string
  ProductCode: string | null
  Description: string | null
  IsActive: boolean
  Family: ProductFamily | null
  ProductClass: ProductClass
  Type: ProductType | null
  CreatedDate: string
  CreatedById: string
  LastModifiedDate: string
  LastModifiedById: string
  SystemModstamp: string
  IsDeleted: boolean
  LastViewedDate: string | null
  LastReferencedDate: string | null
  StockKeepingUnit: string | null
  QuantityUnitOfMeasure: string | null
  DisplayUrl: string | null
  ExternalDataSourceId: string | null
  ExternalId: string | null
  Product_Category__c: ProductCategory | null
  Unit_Price__c: number | null
  Cost_Per_Unit__c: number | null
  External_Id__c: string | null
}

export interface ProductCreateRequest {
  Name: string
  IsActive: boolean
  ProductCode?: string | null
  Description?: string | null
  Family?: ProductFamily | null
  Type?: ProductType | null
  StockKeepingUnit?: string | null
  QuantityUnitOfMeasure?: string | null
  DisplayUrl?: string | null
  ExternalDataSourceId?: string | null
  ExternalId?: string | null
  Product_Category__c?: ProductCategory | null
  Unit_Price__c?: number | null
  Cost_Per_Unit__c?: number | null
  External_Id__c?: string | null
}

export type ProductUpdateRequest = Partial<ProductCreateRequest>

export interface ProductQueryResponse {
  success: boolean
  query: string
  totalSize: number
  records: Product[]
  done: boolean
}
