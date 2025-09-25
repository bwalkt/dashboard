/**
 * TypeScript type definitions for Salesforce Order object
 * Based on Salesforce describe API metadata
 */

// Picklist value types based on Salesforce metadata
export type OrderStatus = "Draft" | "Activated" | "Processing" | "Completed" | "Shipped";
export type OrderStatusCode = "Draft" | "Activated" | "Canceled" | "Expired" | "Superseded";
export type PaymentMethod = "Credit Card" | "Wire Transfer" | "Purchase Order";
export type GeocodeAccuracy = "Address" | "NearAddress" | "Block" | "Street" | "ExtendedZip" | "Zip" | "Neighborhood" | "City" | "County" | "State" | "Unknown";

// Address compound field types
export interface SalesforceAddress {
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  geocodeAccuracy?: GeocodeAccuracy;
}

// Order attributes interface
export interface SalesforceOrderAttributes {
  type: "Order";
  url: string;
}

// Main Order interface
export interface SalesforceOrder {
  attributes: SalesforceOrderAttributes;

  // Core fields
  Id: string;
  OwnerId: string; // Reference to User/Group
  ContractId: string | null; // Reference to Contract
  AccountId: string | null; // Reference to Account
  Pricebook2Id: string | null; // Reference to Pricebook2
  OriginalOrderId: string | null; // Reference to Order (self-reference)

  // Date fields
  EffectiveDate: string; // date
  EndDate: string | null; // date
  PoDate: string | null; // date
  ActivatedDate: string | null; // datetime
  Order_Date__c: string | null; // date (custom)
  Ship_Date__c: string | null; // date (custom)

  // Status fields
  IsReductionOrder: boolean;
  Status: OrderStatus;
  StatusCode: OrderStatusCode;

  // Description and type
  Description: string | null; // textarea
  Type: string | null; // picklist

  // Authorization fields
  CustomerAuthorizedById: string | null; // Reference to Contact
  CustomerAuthorizedDate: string | null; // date
  CompanyAuthorizedById: string | null; // Reference to User
  CompanyAuthorizedDate: string | null; // date

  // Billing address fields
  BillingStreet: string | null; // textarea
  BillingCity: string | null;
  BillingState: string | null;
  BillingPostalCode: string | null;
  BillingCountry: string | null;
  BillingLatitude: number | null; // double
  BillingLongitude: number | null; // double
  BillingGeocodeAccuracy: GeocodeAccuracy | null;
  BillingAddress: SalesforceAddress | null; // compound field

  // Shipping address fields
  ShippingStreet: string | null; // textarea
  ShippingCity: string | null;
  ShippingState: string | null;
  ShippingPostalCode: string | null;
  ShippingCountry: string | null;
  ShippingLatitude: number | null; // double
  ShippingLongitude: number | null; // double
  ShippingGeocodeAccuracy: GeocodeAccuracy | null;
  ShippingAddress: SalesforceAddress | null; // compound field

  // Order details
  Name: string | null;
  PoNumber: string | null;
  OrderReferenceNumber: string | null; // unique
  BillToContactId: string | null; // Reference to Contact
  ShipToContactId: string | null; // Reference to Contact
  ActivatedById: string | null; // Reference to User
  OrderNumber: string; // auto-number, name field
  TotalAmount: number; // currency

  // System fields
  CreatedDate: string; // datetime
  CreatedById: string; // Reference to User
  LastModifiedDate: string; // datetime
  LastModifiedById: string; // Reference to User
  IsDeleted: boolean;
  SystemModstamp: string; // datetime
  LastViewedDate: string | null; // datetime
  LastReferencedDate: string | null; // datetime

  // Custom fields
  Customer_Name__c: string | null; // string
  Customer_Email__c: string | null; // email
  Sales_Rep__c: string | null; // Reference to SalesRep__c
  Product_Id__c: string | null; // string
  Quantity__c: number | null; // double
  Unit_Price__c: number | null; // currency
  Total_Amount__c: number | null; // currency
  Payment__c: PaymentMethod | null; // picklist
  External_Id__c: string | null; // string, unique
}

// Order query response interface
export interface SalesforceOrderQueryResponse {
  success: boolean;
  query: string;
  totalSize: number;
  records: SalesforceOrder[];
  done: boolean;
}

// Order creation request interface
export interface SalesforceOrderCreateRequest {
  OwnerId?: string;
  ContractId?: string;
  AccountId?: string;
  Pricebook2Id?: string;
  OriginalOrderId?: string;
  EffectiveDate: string;
  EndDate?: string;
  Status?: OrderStatus;
  Description?: string;
  Type?: string;
  CustomerAuthorizedById?: string;
  CustomerAuthorizedDate?: string;
  CompanyAuthorizedById?: string;
  CompanyAuthorizedDate?: string;
  BillingStreet?: string;
  BillingCity?: string;
  BillingState?: string;
  BillingPostalCode?: string;
  BillingCountry?: string;
  BillingLatitude?: number;
  BillingLongitude?: number;
  BillingGeocodeAccuracy?: GeocodeAccuracy;
  ShippingStreet?: string;
  ShippingCity?: string;
  ShippingState?: string;
  ShippingPostalCode?: string;
  ShippingCountry?: string;
  ShippingLatitude?: number;
  ShippingLongitude?: number;
  ShippingGeocodeAccuracy?: GeocodeAccuracy;
  Name?: string;
  PoDate?: string;
  PoNumber?: string;
  OrderReferenceNumber?: string;
  BillToContactId?: string;
  ShipToContactId?: string;
  // Custom fields
  Customer_Name__c?: string;
  Customer_Email__c?: string;
  Sales_Rep__c?: string;
  Product_Id__c?: string;
  Quantity__c?: number;
  Unit_Price__c?: number;
  Total_Amount__c?: number;
  Order_Date__c?: string;
  Ship_Date__c?: string;
  Payment__c?: PaymentMethod;
  External_Id__c?: string;
}

// Order update request interface
export interface SalesforceOrderUpdateRequest extends Partial<SalesforceOrderCreateRequest> {
  // All fields are optional for updates
}

// Order field metadata for validation and UI
export interface OrderFieldMetadata {
  name: string;
  label: string;
  type: string;
  required: boolean;
  unique: boolean;
  updateable: boolean;
  createable: boolean;
  nillable: boolean;
  length?: number;
  precision?: number;
  scale?: number;
  picklistValues?: Array<{
    value: string;
    label: string;
    active: boolean;
  }>;
  referenceTo?: string[];
  relationshipName?: string;
}

// Order object metadata
export interface OrderObjectMetadata {
  name: string;
  label: string;
  labelPlural: string;
  keyPrefix: string;
  fields: OrderFieldMetadata[];
  createable: boolean;
  updateable: boolean;
  deletable: boolean;
  queryable: boolean;
  searchable: boolean;
  custom: boolean;
}

// Order metadata response
export interface OrderMetadataResponse {
  success: boolean;
  objectType: string;
  metadata: OrderObjectMetadata;
}
