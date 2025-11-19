import { createValidator } from "@pzero/shared/validator/ajv";

/**
 * AJV schemas for Salesforce Product object
 * Based on Salesforce describe API metadata and existing Product type
 */

// =============================================================================
// TypeScript Interfaces
// =============================================================================

export type ProductFamily = "None";
export type ProductClass = "Simple" | "VariationParent" | "Variation" | "Bundle" | "Set";
export type ProductType = "Base" | "Bundle" | "Set";
export type ProductCategory = "Software" | "Services";

export interface ProductAttributes {
  type: "Product";
  url: string;
}

export interface Product {
  attributes: ProductAttributes;
  // Core fields
  Id: string;
  Name: string;
  ProductCode: string | null;
  Description: string | null;
  IsActive: boolean;
  Family: ProductFamily | null;
  ProductClass: ProductClass;
  Type: ProductType | null;
  // System fields
  CreatedDate: string;
  CreatedById: string;
  LastModifiedDate: string;
  LastModifiedById: string;
  SystemModstamp: string;
  IsDeleted: boolean;
  LastViewedDate: string | null;
  LastReferencedDate: string | null;
  // Product details
  StockKeepingUnit: string | null;
  QuantityUnitOfMeasure: string | null;
  DisplayUrl: string | null;
  ExternalDataSourceId: string | null;
  ExternalId: string | null;
  // Custom fields
  Product_Category__c: ProductCategory | null;
  Unit_Price__c: number | null;
  Cost_Per_Unit__c: number | null;
  External_Id__c: string | null;
}

export interface ProductCreateRequest {
  // Required fields
  Name: string;
  IsActive: boolean;
  // Optional fields
  ProductCode?: string | null;
  Description?: string | null;
  Family?: ProductFamily | null;
  Type?: ProductType | null;
  StockKeepingUnit?: string | null;
  QuantityUnitOfMeasure?: string | null;
  DisplayUrl?: string | null;
  ExternalDataSourceId?: string | null;
  ExternalId?: string | null;
  Product_Category__c?: ProductCategory | null;
  Unit_Price__c?: number | null;
  Cost_Per_Unit__c?: number | null;
  External_Id__c?: string | null;
}

export type ProductUpdateRequest = Partial<ProductCreateRequest>;

export interface ProductQueryResponse {
  success: boolean;
  query: string;
  totalSize: number;
  records: Product[];
  done: boolean;
}

// =============================================================================
// AJV Schemas
// =============================================================================

// Picklist value schemas based on actual Salesforce metadata
export const ProductFamilySchema = { const: "None" }; // Only "None" is available in this org
export const ProductClassSchema = { type: "string", enum: ["Simple", "VariationParent", "Variation", "Bundle", "Set"] };
export const ProductTypeSchema = { type: "string", enum: ["Base", "Bundle", "Set"] };
export const ProductCategorySchema = { type: "string", enum: ["Software", "Services"] };

export const ProductAttributesSchema = {
  type: "object",
  properties: {
    type: { const: "Product" },
    url: { type: "string", format: "uri" },
  },
  required: ["type", "url"],
  additionalProperties: false,
};

export const ProductSchema = {
  type: "object",
  properties: {
    attributes: ProductAttributesSchema,
    // Core fields
    Id: { type: "string" },
    Name: { type: "string" },
    ProductCode: { type: ["string", "null"] },
    Description: { type: ["string", "null"] },
    IsActive: { type: "boolean" },
    Family: { oneOf: [ProductFamilySchema, { type: "null" }] },
    ProductClass: ProductClassSchema,
    Type: { oneOf: [ProductTypeSchema, { type: "null" }] },
    // System fields
    CreatedDate: { type: "string" }, // datetime
    CreatedById: { type: "string" }, // Reference to User
    LastModifiedDate: { type: "string" }, // datetime
    LastModifiedById: { type: "string" }, // Reference to User
    SystemModstamp: { type: "string" }, // datetime
    IsDeleted: { type: "boolean" },
    LastViewedDate: { type: ["string", "null"] }, // datetime
    LastReferencedDate: { type: ["string", "null"] }, // datetime
    // Product details
    StockKeepingUnit: { type: ["string", "null"] }, // SKU
    QuantityUnitOfMeasure: { type: ["string", "null"] },
    DisplayUrl: { type: ["string", "null"], format: "uri" },
    ExternalDataSourceId: { type: ["string", "null"] }, // Reference to ExternalDataSource
    ExternalId: { type: ["string", "null"] },
    // Custom fields
    Product_Category__c: { oneOf: [ProductCategorySchema, { type: "null" }] }, // picklist: Software, Services
    Unit_Price__c: { type: ["number", "null"] }, // currency
    Cost_Per_Unit__c: { type: ["number", "null"] }, // currency
    External_Id__c: { type: ["string", "null"] }, // string, unique
  },
  required: [
    "attributes",
    "Id",
    "Name",
    "IsActive",
    "ProductClass",
    "CreatedDate",
    "CreatedById",
    "LastModifiedDate",
    "LastModifiedById",
    "SystemModstamp",
    "IsDeleted",
  ],
  additionalProperties: false,
};

export const ProductCreateRequestSchema = {
  type: "object",
  properties: {
    // Required fields
    Name: { type: "string" },
    IsActive: { type: "boolean" },
    // Optional standard fields
    ProductCode: { type: ["string", "null"] },
    Description: { type: ["string", "null"] },
    Family: { oneOf: [ProductFamilySchema, { type: "null" }] },
    Type: { oneOf: [ProductTypeSchema, { type: "null" }] },
    StockKeepingUnit: { type: ["string", "null"] },
    QuantityUnitOfMeasure: { type: ["string", "null"] },
    DisplayUrl: { type: ["string", "null"], format: "uri" },
    ExternalDataSourceId: { type: ["string", "null"] },
    ExternalId: { type: ["string", "null"] },
    // Custom fields
    Product_Category__c: { oneOf: [ProductCategorySchema, { type: "null" }] },
    Unit_Price__c: { type: ["number", "null"] },
    Cost_Per_Unit__c: { type: ["number", "null"] },
    External_Id__c: { type: ["string", "null"] },
  },
  required: ["Name", "IsActive"],
  additionalProperties: false,
};

export const ProductUpdateRequestSchema = {
  type: "object",
  properties: {
    Name: { type: "string" },
    IsActive: { type: "boolean" },
    ProductCode: { type: ["string", "null"] },
    Description: { type: ["string", "null"] },
    Family: { oneOf: [ProductFamilySchema, { type: "null" }] },
    Type: { oneOf: [ProductTypeSchema, { type: "null" }] },
    StockKeepingUnit: { type: ["string", "null"] },
    QuantityUnitOfMeasure: { type: ["string", "null"] },
    DisplayUrl: { type: ["string", "null"], format: "uri" },
    ExternalDataSourceId: { type: ["string", "null"] },
    ExternalId: { type: ["string", "null"] },
    Product_Category__c: { oneOf: [ProductCategorySchema, { type: "null" }] },
    Unit_Price__c: { type: ["number", "null"] },
    Cost_Per_Unit__c: { type: ["number", "null"] },
    External_Id__c: { type: ["string", "null"] },
  },
  additionalProperties: false,
};

export const ProductQueryResponseSchema = {
  type: "object",
  properties: {
    success: { type: "boolean" },
    query: { type: "string" },
    totalSize: { type: "number" },
    records: { type: "array", items: ProductSchema },
    done: { type: "boolean" },
  },
  required: ["success", "query", "totalSize", "records", "done"],
  additionalProperties: false,
};

// =============================================================================
// Validators
// =============================================================================

export const validateProduct = createValidator<Product>(ProductSchema);
export const validateProductCreateRequest = createValidator<ProductCreateRequest>(ProductCreateRequestSchema);
export const validateProductUpdateRequest = createValidator<ProductUpdateRequest>(ProductUpdateRequestSchema);
export const validateProductQueryResponse = createValidator<ProductQueryResponse>(ProductQueryResponseSchema);
