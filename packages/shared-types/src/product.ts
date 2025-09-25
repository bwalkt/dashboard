/**
 * TypeScript type definitions for Salesforce Product object
 * Based on Salesforce describe API metadata and existing Product type
 */

// Picklist value types based on actual Salesforce metadata
export type ProductFamily = "None"; // Only "None" is available in this org
export type ProductClass = "Simple" | "VariationParent" | "Variation" | "Bundle" | "Set";
export type ProductType = "Base" | "Bundle" | "Set";
export type ProductCategory = "Software" | "Services";

// Product attributes interface
export interface SalesforceProductAttributes {
  type: "Product";
  url: string;
}

// Main Product interface based on Salesforce metadata
export interface SalesforceProduct {
  attributes: SalesforceProductAttributes;

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
  CreatedDate: string; // datetime
  CreatedById: string; // Reference to User
  LastModifiedDate: string; // datetime
  LastModifiedById: string; // Reference to User
  SystemModstamp: string; // datetime
  IsDeleted: boolean;
  LastViewedDate: string | null; // datetime
  LastReferencedDate: string | null; // datetime

  // Product details
  StockKeepingUnit: string | null; // SKU
  QuantityUnitOfMeasure: string | null;
  DisplayUrl: string | null;
  ExternalDataSourceId: string | null; // Reference to ExternalDataSource
  ExternalId: string | null;

  // Custom fields (based on existing Product type)
  Product_Category__c: ProductCategory | null; // picklist: Software, Services
  Unit_Price__c: number | null; // currency
  Cost_Per_Unit__c: number | null; // currency
  External_Id__c: string | null; // string, unique
}

// Product creation request interface
export interface SalesforceProductCreateRequest {
  // Required fields
  Name: string;
  IsActive: boolean;
  // Note: ProductClass is read-only in this org and cannot be set during creation

  // Optional standard fields
  ProductCode?: string;
  Description?: string;
  Family?: ProductFamily;
  Type?: ProductType;
  StockKeepingUnit?: string;
  QuantityUnitOfMeasure?: string;
  DisplayUrl?: string;
  ExternalDataSourceId?: string;
  ExternalId?: string;

  // Custom fields
  Product_Category__c?: ProductCategory;
  Unit_Price__c?: number;
  Cost_Per_Unit__c?: number;
  External_Id__c?: string;
}

// Product update request interface
export interface SalesforceProductUpdateRequest extends Partial<SalesforceProductCreateRequest> {
  // All fields are optional for updates
}

// Product query response interface
export interface SalesforceProductQueryResponse {
  success: boolean;
  query: string;
  totalSize: number;
  records: SalesforceProduct[];
  done: boolean;
}
