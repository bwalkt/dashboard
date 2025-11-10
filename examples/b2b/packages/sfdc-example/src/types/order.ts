import { z } from 'zod'

/**
 * Zod schemas for Salesforce Order object
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

// Picklist value schemas based on Salesforce metadata
export const OrderStatusSchema = z.enum(['Draft', 'Activated', 'Processing', 'Completed', 'Shipped'])
export const OrderStatusCodeSchema = z.enum(['Draft', 'Activated', 'Canceled', 'Expired', 'Superseded'])
export const PaymentMethodSchema = z.enum(['Credit Card', 'Wire Transfer', 'Purchase Order'])
export const GeocodeAccuracySchema = z.enum([
  'Address',
  'NearAddress',
  'Block',
  'Street',
  'ExtendedZip',
  'Zip',
  'Neighborhood',
  'City',
  'County',
  'State',
  'Unknown',
])

// Address compound field schema
export const AddressSchema = z.object({
  street: z.string().nullish(),
  city: z.string().nullish(),
  state: z.string().nullish(),
  postalCode: z.string().nullish(),
  country: z.string().nullish(),
  latitude: z.number().nullish(),
  longitude: z.number().nullish(),
  geocodeAccuracy: GeocodeAccuracySchema.nullish(),
})

// Order attributes schema
export const OrderAttributesSchema = z.object({
  type: z.literal('Order'),
  url: z.string().url(),
})

// Main Order schema
export const OrderSchema = z.object({
  attributes: OrderAttributesSchema,

  // Core fields - Required (nillable: false)
  Id: z.string(), // read-only, required
  OwnerId: z.string(), // Reference to User/Group, required, updateable
  EffectiveDate: z.string(), // date, required, updateable
  IsReductionOrder: z.boolean(), // read-only, required
  Status: OrderStatusSchema, // required, updateable
  StatusCode: OrderStatusCodeSchema, // required, updateable
  OrderNumber: z.string(), // auto-number, name field, read-only, required
  TotalAmount: z.number(), // currency, read-only, required

  // Core fields - Optional (nillable: true)
  ContractId: z.string().nullable(), // Reference to Contract, optional, updateable
  AccountId: z.string().nullable(), // Reference to Account, optional, updateable
  Pricebook2Id: z.string().nullable(), // Reference to Pricebook2, optional, updateable
  OriginalOrderId: z.string().nullable(), // Reference to Order (self-reference), read-only

  // Date fields - Optional (nillable: true)
  EndDate: z.string().nullable(), // date, optional, updateable
  PoDate: z.string().nullable(), // date, optional, updateable
  ActivatedDate: z.string().nullable(), // datetime, read-only
  Order_Date__c: z.string().nullable(), // date (custom), optional, updateable
  Ship_Date__c: z.string().nullable(), // date (custom), optional, updateable

  // Description and type - Optional (nillable: true)
  Description: z.string().nullable(), // textarea, optional, updateable
  Type: z.string().nullable(), // picklist, optional, updateable

  // Authorization fields - Optional (nillable: true)
  CustomerAuthorizedById: z.string().nullable(), // Reference to Contact, optional, updateable
  CustomerAuthorizedDate: z.string().nullable(), // date, optional, updateable
  CompanyAuthorizedById: z.string().nullable(), // Reference to User, optional, updateable
  CompanyAuthorizedDate: z.string().nullable(), // date, optional, updateable

  // Billing address fields - Optional (nillable: true)
  BillingStreet: z.string().nullable(), // textarea, optional, updateable
  BillingCity: z.string().nullable(), // optional, updateable
  BillingState: z.string().nullable(), // optional, updateable
  BillingPostalCode: z.string().nullable(), // optional, updateable
  BillingCountry: z.string().nullable(), // optional, updateable
  BillingLatitude: z.number().nullable(), // double, optional, updateable
  BillingLongitude: z.number().nullable(), // double, optional, updateable
  BillingGeocodeAccuracy: GeocodeAccuracySchema.nullable(), // optional, updateable
  BillingAddress: AddressSchema.nullable(), // compound field, read-only

  // Shipping address fields - Optional (nillable: true)
  ShippingStreet: z.string().nullable(), // textarea, optional, updateable
  ShippingCity: z.string().nullable(), // optional, updateable
  ShippingState: z.string().nullable(), // optional, updateable
  ShippingPostalCode: z.string().nullable(), // optional, updateable
  ShippingCountry: z.string().nullable(), // optional, updateable
  ShippingLatitude: z.number().nullable(), // double, optional, updateable
  ShippingLongitude: z.number().nullable(), // double, optional, updateable
  ShippingGeocodeAccuracy: GeocodeAccuracySchema.nullable(), // optional, updateable
  ShippingAddress: AddressSchema.nullable(), // compound field, read-only

  // Order details - Optional (nillable: true)
  Name: z.string().nullable(), // optional, updateable
  PoNumber: z.string().nullable(), // optional, updateable
  OrderReferenceNumber: z.string().nullable(), // unique, optional, updateable
  BillToContactId: z.string().nullable(), // Reference to Contact, optional, updateable
  ShipToContactId: z.string().nullable(), // Reference to Contact, optional, updateable
  ActivatedById: z.string().nullable(), // Reference to User, read-only

  // System fields - Required (nillable: false) and read-only
  CreatedDate: z.string(), // datetime, read-only, required
  CreatedById: z.string(), // Reference to User, read-only, required
  LastModifiedDate: z.string(), // datetime, read-only, required
  LastModifiedById: z.string(), // Reference to User, read-only, required
  IsDeleted: z.boolean(), // read-only, required
  SystemModstamp: z.string(), // datetime, read-only, required

  // System fields - Optional (nillable: true) and read-only
  LastViewedDate: z.string().nullable(), // datetime, read-only
  LastReferencedDate: z.string().nullable(), // datetime, read-only

  // Custom fields - Optional (nillable: true)
  Customer_Name__c: z.string().nullable(), // string, optional, updateable
  Customer_Email__c: z.string().email().nullable(), // email, optional, updateable
  Sales_Rep__c: z.string().nullable(), // Reference to SalesRep__c, optional, updateable
  Product_Id__c: z.string().nullable(), // string, optional, updateable
  Quantity__c: z.number().nullable(), // double, optional, updateable
  Unit_Price__c: z.number().nullable(), // currency, optional, updateable
  Total_Amount__c: z.number().nullable(), // currency, optional, updateable
  Payment__c: PaymentMethodSchema.nullable(), // picklist, optional, updateable
  External_Id__c: z.string().nullable(), // string, unique, optional, updateable
})

// Order query response schema
export const OrderQueryResponseSchema = z.object({
  success: z.boolean(),
  query: z.string(),
  totalSize: z.number(),
  records: z.array(OrderSchema),
  done: z.boolean(),
})

// Order creation request schema (excludes read-only fields)
export const OrderCreateRequestSchema = z.object({
  // Required fields (createable: true, nillable: false)
  OwnerId: z.string(), // Reference to User/Group, required
  EffectiveDate: z.string(), // date, required
  Status: OrderStatusSchema, // required
  AccountId: z.string(), // Reference to Account, required (custom validation rule)

  // Optional fields (createable: true, nillable: true)
  ContractId: z.string().nullish(),
  Pricebook2Id: z.string().nullish(),
  EndDate: z.string().nullish(),
  Description: z.string().nullish(),
  Type: z.string().nullish(),
  CustomerAuthorizedById: z.string().nullish(),
  CustomerAuthorizedDate: z.string().nullish(),
  CompanyAuthorizedById: z.string().nullish(),
  CompanyAuthorizedDate: z.string().nullish(),
  BillingStreet: z.string().nullish(),
  BillingCity: z.string().nullish(),
  BillingState: z.string().nullish(),
  BillingPostalCode: z.string().nullish(),
  BillingCountry: z.string().nullish(),
  BillingLatitude: z.number().nullish(),
  BillingLongitude: z.number().nullish(),
  BillingGeocodeAccuracy: GeocodeAccuracySchema.nullish(),
  ShippingStreet: z.string().nullish(),
  ShippingCity: z.string().nullish(),
  ShippingState: z.string().nullish(),
  ShippingPostalCode: z.string().nullish(),
  ShippingCountry: z.string().nullish(),
  ShippingLatitude: z.number().nullish(),
  ShippingLongitude: z.number().nullish(),
  ShippingGeocodeAccuracy: GeocodeAccuracySchema.nullish(),
  Name: z.string().nullish(),
  PoDate: z.string().nullish(),
  PoNumber: z.string().nullish(),
  OrderReferenceNumber: z.string().nullish(),
  BillToContactId: z.string().nullish(),
  ShipToContactId: z.string().nullish(),

  // Custom fields (createable: true, nillable: true)
  Customer_Name__c: z.string().nullish(),
  Customer_Email__c: z.string().email().nullish(),
  Sales_Rep__c: z.string().nullish(),
  Product_Id__c: z.string().nullish(),
  Quantity__c: z.number().nullish(),
  Unit_Price__c: z.number().nullish(),
  Total_Amount__c: z.number().nullish(),
  Order_Date__c: z.string().nullish(),
  Ship_Date__c: z.string().nullish(),
  Payment__c: PaymentMethodSchema.nullish(),
  External_Id__c: z.string().nullish(),
})

// Order update request schema
export const OrderUpdateRequestSchema = OrderCreateRequestSchema.partial()

// Inferred types from schemas
export type OrderStatus = z.infer<typeof OrderStatusSchema>
export type OrderStatusCode = z.infer<typeof OrderStatusCodeSchema>
export type PaymentMethod = z.infer<typeof PaymentMethodSchema>
export type GeocodeAccuracy = z.infer<typeof GeocodeAccuracySchema>
export type Address = z.infer<typeof AddressSchema>
export type OrderAttributes = z.infer<typeof OrderAttributesSchema>
export type Order = z.infer<typeof OrderSchema>
export type OrderQueryResponse = z.infer<typeof OrderQueryResponseSchema>
export type OrderCreateRequest = z.infer<typeof OrderCreateRequestSchema>
export type OrderUpdateRequest = z.infer<typeof OrderUpdateRequestSchema>

