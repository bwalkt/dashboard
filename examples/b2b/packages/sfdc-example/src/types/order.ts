import { createValidator } from "@pzero/shared/validator/ajv";

/**
 * AJV schemas for Salesforce Order object
 * Based on Salesforce describe API metadata
 *
 * Key updates based on actual Salesforce metadata:
 * - Required fields (nillable: false): Id, OwnerId, EffectiveDate, IsReductionOrder, Status, StatusCode,
 *   OrderNumber, TotalAmount, CreatedDate, CreatedById, LastModifiedDate, LastModifiedById, IsDeleted, SystemModstamp
 * - Required for creation (custom validation): AccountId (required by Salesforce validation rules)
 * - Optional fields (nillable: true): All other fields including ContractId, Pricebook2Id, etc.
 * - Read-only fields (createable: false or updateable: false): Id, OriginalOrderId, IsReductionOrder,
 *   ActivatedDate, ActivatedById, OrderNumber, TotalAmount, BillingAddress, ShippingAddress, and all system fields
 * - All picklist values match actual Salesforce metadata exactly
 * - Field metadata includes all Salesforce field properties
 * - Object metadata includes child relationships and action overrides
 */

// =============================================================================
// TypeScript Interfaces
// =============================================================================

export type OrderStatus = "Draft" | "Activated" | "Processing" | "Completed" | "Shipped";
export type OrderStatusCode = "Draft" | "Activated" | "Canceled" | "Expired" | "Superseded";
export type PaymentMethod = "Credit Card" | "Wire Transfer" | "Purchase Order";
export type GeocodeAccuracy = "Address" | "NearAddress" | "Block" | "Street" | "ExtendedZip" | "Zip" | "Neighborhood" | "City" | "County" | "State" | "Unknown";

export interface Address {
  street?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  country?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  geocodeAccuracy?: GeocodeAccuracy | null;
}

export interface OrderAttributes {
  type: "Order";
  url: string;
}

export interface Order {
  attributes: OrderAttributes;
  // Core fields - Required
  Id: string;
  OwnerId: string;
  EffectiveDate: string;
  IsReductionOrder: boolean;
  Status: OrderStatus;
  StatusCode: OrderStatusCode;
  OrderNumber: string;
  TotalAmount: number;
  // Core fields - Optional
  ContractId: string | null;
  AccountId: string | null;
  Pricebook2Id: string | null;
  OriginalOrderId: string | null;
  // Date fields - Optional
  EndDate: string | null;
  PoDate: string | null;
  ActivatedDate: string | null;
  Order_Date__c: string | null;
  Ship_Date__c: string | null;
  // Description and type - Optional
  Description: string | null;
  Type: string | null;
  // Authorization fields - Optional
  CustomerAuthorizedById: string | null;
  CustomerAuthorizedDate: string | null;
  CompanyAuthorizedById: string | null;
  CompanyAuthorizedDate: string | null;
  // Billing address fields - Optional
  BillingStreet: string | null;
  BillingCity: string | null;
  BillingState: string | null;
  BillingPostalCode: string | null;
  BillingCountry: string | null;
  BillingLatitude: number | null;
  BillingLongitude: number | null;
  BillingGeocodeAccuracy: GeocodeAccuracy | null;
  BillingAddress: Address | null;
  // Shipping address fields - Optional
  ShippingStreet: string | null;
  ShippingCity: string | null;
  ShippingState: string | null;
  ShippingPostalCode: string | null;
  ShippingCountry: string | null;
  ShippingLatitude: number | null;
  ShippingLongitude: number | null;
  ShippingGeocodeAccuracy: GeocodeAccuracy | null;
  ShippingAddress: Address | null;
  // Order details - Optional
  Name: string | null;
  PoNumber: string | null;
  OrderReferenceNumber: string | null;
  BillToContactId: string | null;
  ShipToContactId: string | null;
  ActivatedById: string | null;
  // System fields - Required
  CreatedDate: string;
  CreatedById: string;
  LastModifiedDate: string;
  LastModifiedById: string;
  IsDeleted: boolean;
  SystemModstamp: string;
  // System fields - Optional
  LastViewedDate: string | null;
  LastReferencedDate: string | null;
  // Custom fields - Optional
  Customer_Name__c: string | null;
  Customer_Email__c: string | null;
  Sales_Rep__c: string | null;
  Product_Id__c: string | null;
  Quantity__c: number | null;
  Unit_Price__c: number | null;
  Total_Amount__c: number | null;
  Payment__c: PaymentMethod | null;
  External_Id__c: string | null;
}

export interface OrderQueryResponse {
  success: boolean;
  query: string;
  totalSize: number;
  records: Order[];
  done: boolean;
}

export interface OrderCreateRequest {
  // Required fields
  OwnerId: string;
  EffectiveDate: string;
  Status: OrderStatus;
  AccountId: string;
  // Optional fields
  ContractId?: string | null;
  Pricebook2Id?: string | null;
  EndDate?: string | null;
  Description?: string | null;
  Type?: string | null;
  CustomerAuthorizedById?: string | null;
  CustomerAuthorizedDate?: string | null;
  CompanyAuthorizedById?: string | null;
  CompanyAuthorizedDate?: string | null;
  BillingStreet?: string | null;
  BillingCity?: string | null;
  BillingState?: string | null;
  BillingPostalCode?: string | null;
  BillingCountry?: string | null;
  BillingLatitude?: number | null;
  BillingLongitude?: number | null;
  BillingGeocodeAccuracy?: GeocodeAccuracy | null;
  ShippingStreet?: string | null;
  ShippingCity?: string | null;
  ShippingState?: string | null;
  ShippingPostalCode?: string | null;
  ShippingCountry?: string | null;
  ShippingLatitude?: number | null;
  ShippingLongitude?: number | null;
  ShippingGeocodeAccuracy?: GeocodeAccuracy | null;
  Name?: string | null;
  PoDate?: string | null;
  PoNumber?: string | null;
  OrderReferenceNumber?: string | null;
  BillToContactId?: string | null;
  ShipToContactId?: string | null;
  // Custom fields
  Customer_Name__c?: string | null;
  Customer_Email__c?: string | null;
  Sales_Rep__c?: string | null;
  Product_Id__c?: string | null;
  Quantity__c?: number | null;
  Unit_Price__c?: number | null;
  Total_Amount__c?: number | null;
  Order_Date__c?: string | null;
  Ship_Date__c?: string | null;
  Payment__c?: PaymentMethod | null;
  External_Id__c?: string | null;
}

export type OrderUpdateRequest = Partial<OrderCreateRequest>;

// =============================================================================
// AJV Schemas
// =============================================================================

// Picklist value schemas based on Salesforce metadata
export const OrderStatusSchema = { type: "string", enum: ["Draft", "Activated", "Processing", "Completed", "Shipped"] };
export const OrderStatusCodeSchema = {
  type: "string",
  enum: ["Draft", "Activated", "Canceled", "Expired", "Superseded"],
};
export const PaymentMethodSchema = { type: "string", enum: ["Credit Card", "Wire Transfer", "Purchase Order"] };
export const GeocodeAccuracySchema = {
  type: "string",
  enum: ["Address", "NearAddress", "Block", "Street", "ExtendedZip", "Zip", "Neighborhood", "City", "County", "State", "Unknown"],
};

export const AddressSchema = {
  type: "object",
  properties: {
    street: { type: ["string", "null"] },
    city: { type: ["string", "null"] },
    state: { type: ["string", "null"] },
    postalCode: { type: ["string", "null"] },
    country: { type: ["string", "null"] },
    latitude: { type: ["number", "null"] },
    longitude: { type: ["number", "null"] },
    geocodeAccuracy: { oneOf: [GeocodeAccuracySchema, { type: "null" }] },
  },
  additionalProperties: false,
};

export const OrderAttributesSchema = {
  type: "object",
  properties: {
    type: { const: "Order" },
    url: { type: "string", format: "uri" },
  },
  required: ["type", "url"],
  additionalProperties: false,
};

export const OrderSchema = {
  type: "object",
  properties: {
    attributes: OrderAttributesSchema,
    // Core fields - Required
    Id: { type: "string" }, // read-only, required
    OwnerId: { type: "string" }, // Reference to User/Group, required, updateable
    EffectiveDate: { type: "string" }, // date, required, updateable
    IsReductionOrder: { type: "boolean" }, // read-only, required
    Status: OrderStatusSchema, // required, updateable
    StatusCode: OrderStatusCodeSchema, // required, updateable
    OrderNumber: { type: "string" }, // auto-number, name field, read-only, required
    TotalAmount: { type: "number" }, // currency, read-only, required
    // Core fields - Optional
    ContractId: { type: ["string", "null"] }, // Reference to Contract, optional, updateable
    AccountId: { type: ["string", "null"] }, // Reference to Account, optional, updateable
    Pricebook2Id: { type: ["string", "null"] }, // Reference to Pricebook2, optional, updateable
    OriginalOrderId: { type: ["string", "null"] }, // Reference to Order (self-reference), read-only
    // Date fields - Optional
    EndDate: { type: ["string", "null"] }, // date, optional, updateable
    PoDate: { type: ["string", "null"] }, // date, optional, updateable
    ActivatedDate: { type: ["string", "null"] }, // datetime, read-only
    Order_Date__c: { type: ["string", "null"] }, // date (custom), optional, updateable
    Ship_Date__c: { type: ["string", "null"] }, // date (custom), optional, updateable
    // Description and type - Optional
    Description: { type: ["string", "null"] }, // textarea, optional, updateable
    Type: { type: ["string", "null"] }, // picklist, optional, updateable
    // Authorization fields - Optional
    CustomerAuthorizedById: { type: ["string", "null"] }, // Reference to Contact, optional, updateable
    CustomerAuthorizedDate: { type: ["string", "null"] }, // date, optional, updateable
    CompanyAuthorizedById: { type: ["string", "null"] }, // Reference to User, optional, updateable
    CompanyAuthorizedDate: { type: ["string", "null"] }, // date, optional, updateable
    // Billing address fields - Optional
    BillingStreet: { type: ["string", "null"] }, // textarea, optional, updateable
    BillingCity: { type: ["string", "null"] }, // optional, updateable
    BillingState: { type: ["string", "null"] }, // optional, updateable
    BillingPostalCode: { type: ["string", "null"] }, // optional, updateable
    BillingCountry: { type: ["string", "null"] }, // optional, updateable
    BillingLatitude: { type: ["number", "null"] }, // double, optional, updateable
    BillingLongitude: { type: ["number", "null"] }, // double, optional, updateable
    BillingGeocodeAccuracy: { oneOf: [GeocodeAccuracySchema, { type: "null" }] }, // optional, updateable
    BillingAddress: { oneOf: [AddressSchema, { type: "null" }] }, // compound field, read-only
    // Shipping address fields - Optional
    ShippingStreet: { type: ["string", "null"] }, // textarea, optional, updateable
    ShippingCity: { type: ["string", "null"] }, // optional, updateable
    ShippingState: { type: ["string", "null"] }, // optional, updateable
    ShippingPostalCode: { type: ["string", "null"] }, // optional, updateable
    ShippingCountry: { type: ["string", "null"] }, // optional, updateable
    ShippingLatitude: { type: ["number", "null"] }, // double, optional, updateable
    ShippingLongitude: { type: ["number", "null"] }, // double, optional, updateable
    ShippingGeocodeAccuracy: { oneOf: [GeocodeAccuracySchema, { type: "null" }] }, // optional, updateable
    ShippingAddress: { oneOf: [AddressSchema, { type: "null" }] }, // compound field, read-only
    // Order details - Optional
    Name: { type: ["string", "null"] }, // optional, updateable
    PoNumber: { type: ["string", "null"] }, // optional, updateable
    OrderReferenceNumber: { type: ["string", "null"] }, // unique, optional, updateable
    BillToContactId: { type: ["string", "null"] }, // Reference to Contact, optional, updateable
    ShipToContactId: { type: ["string", "null"] }, // Reference to Contact, optional, updateable
    ActivatedById: { type: ["string", "null"] }, // Reference to User, read-only
    // System fields - Required
    CreatedDate: { type: "string" }, // datetime, read-only, required
    CreatedById: { type: "string" }, // Reference to User, read-only, required
    LastModifiedDate: { type: "string" }, // datetime, read-only, required
    LastModifiedById: { type: "string" }, // Reference to User, read-only, required
    IsDeleted: { type: "boolean" }, // read-only, required
    SystemModstamp: { type: "string" }, // datetime, read-only, required
    // System fields - Optional
    LastViewedDate: { type: ["string", "null"] }, // datetime, read-only
    LastReferencedDate: { type: ["string", "null"] }, // datetime, read-only
    // Custom fields - Optional
    Customer_Name__c: { type: ["string", "null"] }, // string, optional, updateable
    Customer_Email__c: { type: ["string", "null"], format: "email" }, // email, optional, updateable
    Sales_Rep__c: { type: ["string", "null"] }, // Reference to SalesRep__c, optional, updateable
    Product_Id__c: { type: ["string", "null"] }, // string, optional, updateable
    Quantity__c: { type: ["number", "null"] }, // double, optional, updateable
    Unit_Price__c: { type: ["number", "null"] }, // currency, optional, updateable
    Total_Amount__c: { type: ["number", "null"] }, // currency, optional, updateable
    Payment__c: { oneOf: [PaymentMethodSchema, { type: "null" }] }, // picklist, optional, updateable
    External_Id__c: { type: ["string", "null"] }, // string, unique, optional, updateable
  },
  required: [
    "attributes",
    "Id",
    "OwnerId",
    "EffectiveDate",
    "IsReductionOrder",
    "Status",
    "StatusCode",
    "OrderNumber",
    "TotalAmount",
    "CreatedDate",
    "CreatedById",
    "LastModifiedDate",
    "LastModifiedById",
    "IsDeleted",
    "SystemModstamp",
  ],
  additionalProperties: false,
};

export const OrderQueryResponseSchema = {
  type: "object",
  properties: {
    success: { type: "boolean" },
    query: { type: "string" },
    totalSize: { type: "number" },
    records: { type: "array", items: OrderSchema },
    done: { type: "boolean" },
  },
  required: ["success", "query", "totalSize", "records", "done"],
  additionalProperties: false,
};

export const OrderCreateRequestSchema = {
  type: "object",
  properties: {
    // Required fields
    OwnerId: { type: "string" }, // Reference to User/Group, required
    EffectiveDate: { type: "string" }, // date, required
    Status: OrderStatusSchema, // required
    AccountId: { type: "string" }, // Reference to Account, required (custom validation rule)
    // Optional fields
    ContractId: { type: ["string", "null"] },
    Pricebook2Id: { type: ["string", "null"] },
    EndDate: { type: ["string", "null"] },
    Description: { type: ["string", "null"] },
    Type: { type: ["string", "null"] },
    CustomerAuthorizedById: { type: ["string", "null"] },
    CustomerAuthorizedDate: { type: ["string", "null"] },
    CompanyAuthorizedById: { type: ["string", "null"] },
    CompanyAuthorizedDate: { type: ["string", "null"] },
    BillingStreet: { type: ["string", "null"] },
    BillingCity: { type: ["string", "null"] },
    BillingState: { type: ["string", "null"] },
    BillingPostalCode: { type: ["string", "null"] },
    BillingCountry: { type: ["string", "null"] },
    BillingLatitude: { type: ["number", "null"] },
    BillingLongitude: { type: ["number", "null"] },
    BillingGeocodeAccuracy: { oneOf: [GeocodeAccuracySchema, { type: "null" }] },
    ShippingStreet: { type: ["string", "null"] },
    ShippingCity: { type: ["string", "null"] },
    ShippingState: { type: ["string", "null"] },
    ShippingPostalCode: { type: ["string", "null"] },
    ShippingCountry: { type: ["string", "null"] },
    ShippingLatitude: { type: ["number", "null"] },
    ShippingLongitude: { type: ["number", "null"] },
    ShippingGeocodeAccuracy: { oneOf: [GeocodeAccuracySchema, { type: "null" }] },
    Name: { type: ["string", "null"] },
    PoDate: { type: ["string", "null"] },
    PoNumber: { type: ["string", "null"] },
    OrderReferenceNumber: { type: ["string", "null"] },
    BillToContactId: { type: ["string", "null"] },
    ShipToContactId: { type: ["string", "null"] },
    // Custom fields
    Customer_Name__c: { type: ["string", "null"] },
    Customer_Email__c: { type: ["string", "null"], format: "email" },
    Sales_Rep__c: { type: ["string", "null"] },
    Product_Id__c: { type: ["string", "null"] },
    Quantity__c: { type: ["number", "null"] },
    Unit_Price__c: { type: ["number", "null"] },
    Total_Amount__c: { type: ["number", "null"] },
    Order_Date__c: { type: ["string", "null"] },
    Ship_Date__c: { type: ["string", "null"] },
    Payment__c: { oneOf: [PaymentMethodSchema, { type: "null" }] },
    External_Id__c: { type: ["string", "null"] },
  },
  required: ["OwnerId", "EffectiveDate", "Status", "AccountId"],
  additionalProperties: false,
};

export const OrderUpdateRequestSchema = {
  type: "object",
  properties: {
    OwnerId: { type: "string" },
    EffectiveDate: { type: "string" },
    Status: OrderStatusSchema,
    AccountId: { type: "string" },
    ContractId: { type: ["string", "null"] },
    Pricebook2Id: { type: ["string", "null"] },
    EndDate: { type: ["string", "null"] },
    Description: { type: ["string", "null"] },
    Type: { type: ["string", "null"] },
    CustomerAuthorizedById: { type: ["string", "null"] },
    CustomerAuthorizedDate: { type: ["string", "null"] },
    CompanyAuthorizedById: { type: ["string", "null"] },
    CompanyAuthorizedDate: { type: ["string", "null"] },
    BillingStreet: { type: ["string", "null"] },
    BillingCity: { type: ["string", "null"] },
    BillingState: { type: ["string", "null"] },
    BillingPostalCode: { type: ["string", "null"] },
    BillingCountry: { type: ["string", "null"] },
    BillingLatitude: { type: ["number", "null"] },
    BillingLongitude: { type: ["number", "null"] },
    BillingGeocodeAccuracy: { oneOf: [GeocodeAccuracySchema, { type: "null" }] },
    ShippingStreet: { type: ["string", "null"] },
    ShippingCity: { type: ["string", "null"] },
    ShippingState: { type: ["string", "null"] },
    ShippingPostalCode: { type: ["string", "null"] },
    ShippingCountry: { type: ["string", "null"] },
    ShippingLatitude: { type: ["number", "null"] },
    ShippingLongitude: { type: ["number", "null"] },
    ShippingGeocodeAccuracy: { oneOf: [GeocodeAccuracySchema, { type: "null" }] },
    Name: { type: ["string", "null"] },
    PoDate: { type: ["string", "null"] },
    PoNumber: { type: ["string", "null"] },
    OrderReferenceNumber: { type: ["string", "null"] },
    BillToContactId: { type: ["string", "null"] },
    ShipToContactId: { type: ["string", "null"] },
    Customer_Name__c: { type: ["string", "null"] },
    Customer_Email__c: { type: ["string", "null"], format: "email" },
    Sales_Rep__c: { type: ["string", "null"] },
    Product_Id__c: { type: ["string", "null"] },
    Quantity__c: { type: ["number", "null"] },
    Unit_Price__c: { type: ["number", "null"] },
    Total_Amount__c: { type: ["number", "null"] },
    Order_Date__c: { type: ["string", "null"] },
    Ship_Date__c: { type: ["string", "null"] },
    Payment__c: { oneOf: [PaymentMethodSchema, { type: "null" }] },
    External_Id__c: { type: ["string", "null"] },
  },
  additionalProperties: false,
};

// =============================================================================
// Validators
// =============================================================================

export const validateOrder = createValidator<Order>(OrderSchema);
export const validateOrderCreateRequest = createValidator<OrderCreateRequest>(OrderCreateRequestSchema);
export const validateOrderUpdateRequest = createValidator<OrderUpdateRequest>(OrderUpdateRequestSchema);
export const validateOrderQueryResponse = createValidator<OrderQueryResponse>(OrderQueryResponseSchema);
