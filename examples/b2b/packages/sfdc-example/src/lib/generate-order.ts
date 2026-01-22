import { faker } from '@faker-js/faker'
import { fetchProducts } from '@/hooks/use-products'
import { OrderCreateRequest, PaymentMethod } from '@/types'
import { api } from './api'

/**
 * PricebookEntry record from Salesforce
 */
interface PricebookEntry {
  Id: string
  Pricebook2Id: string
  Product2Id: string
  UnitPrice: number
  IsActive: boolean
  Name: string
}

interface PricebookEntryResponse {
  success: boolean
  records: PricebookEntry[]
  totalSize: number
  done: boolean
  pagination: {
    currentPage: number
    totalPages: number
    limit: number
    hasNext: boolean
    hasPrevious: boolean
  }
}

/**
 * Fetch active PricebookEntry records from Salesforce
 */
async function fetchPricebookEntries(limit = 100): Promise<PricebookEntry[]> {
  try {
    const response: PricebookEntryResponse = await api.get(`/salesforce/PricebookEntry/query?limit=${limit}`)
    if (response.success && response.records) {
      // Filter to only active entries
      return response.records.filter(entry => entry.IsActive)
    }
    return []
  } catch (error) {
    console.error('Failed to fetch PricebookEntry records:', error)
    return []
  }
}

/**
 * Create an OrderItem to link an Order to a PricebookEntry
 */
async function createOrderItem(
  orderId: string,
  pricebookEntryId: string,
  quantity: number,
  unitPrice: number,
): Promise<{ success: boolean; id?: string; error?: any }> {
  try {
    const orderItem = {
      OrderId: orderId,
      PricebookEntryId: pricebookEntryId,
      Quantity: quantity,
      UnitPrice: unitPrice,
    }
    const response = await api.post('/salesforce/records/OrderItem', orderItem)
    if (response && response.success && response.id) {
      return { success: true, id: response.id }
    }
    return { success: false, error: response }
  } catch (error) {
    console.error('Failed to create OrderItem:', error)
    return { success: false, error }
  }
}

/**
 * Generate a date within the last 30 days with higher probability for the last day.
 * 80% chance of being in the last day, 20% chance of being in days 2-30.
 * Returns date formatted as YYYY-MM-DD.
 */
function generateRecentDate(): string {
  const now = Date.now()
  const oneDayAgo = now - 1 * 24 * 60 * 60 * 1000
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000

  // 80% chance of being in last day, 20% chance of being in days 2-30
  const useRecentDays = faker.datatype.boolean({ probability: 0.8 })

  let date: Date
  if (useRecentDays) {
    // Last day
    date = faker.date.between({
      from: new Date(oneDayAgo),
      to: new Date(now),
    })
  } else {
    // Days 2-30
    date = faker.date.between({
      from: new Date(thirtyDaysAgo),
      to: new Date(oneDayAgo),
    })
  }

  return date.toISOString().split('T')[0]
}

/**
 * Generate a random order using fakerjs with proper required and optional fields
 *
 * Required fields:
 * - OwnerId: Reference to User/Group
 * - EffectiveDate: Date (must be after yesterday)
 * - Status: Always "Draft" (Salesforce only allows Draft status for new orders)
 * - AccountId: Reference to Account (required by Salesforce validation)
 *
 * Optional fields are randomly included based on probability
 *
 * Note: Salesforce validation requires new orders to have "Draft" status.
 * Other statuses (Activated, Processing, Completed, Shipped) can only be set
 * after the order is created and activated through the Salesforce workflow.
 *
 * Reference fields (like Sales_Rep__c) must use valid Salesforce IDs,
 * not names or other text values.
 */
export function generateRandomOrder(productIds: string[], pricebook2Id?: string): OrderCreateRequest {
  // Generate effective date within last 30 days (higher probability for last 2 days)
  const effectiveDate = generateRecentDate()

  // Required fields
  const order: OrderCreateRequest = {
    OwnerId: faker.helpers.arrayElement([
      '005ak00000LOPNlAAP', // Default owner from form
    ]),
    EffectiveDate: effectiveDate,
    Status: 'Draft', // Salesforce only allows "Draft" status for new orders
    AccountId: faker.helpers.arrayElement([
      '001ak00001NjbGzAAJ', // Default account from form
    ]),
    // Pricebook2Id is required for adding OrderItems
    ...(pricebook2Id && { Pricebook2Id: pricebook2Id }),
  }

  // Optional fields - randomly include based on probability
  if (faker.datatype.boolean({ probability: 0.8 })) {
    order.Name = faker.commerce.productName() + ' Order'
  }

  if (faker.datatype.boolean({ probability: 0.7 })) {
    order.Description = faker.commerce.productDescription()
  }

  if (faker.datatype.boolean({ probability: 1 })) {
    order.Customer_Name__c = faker.person.fullName()
  }

  if (faker.datatype.boolean({ probability: 1 })) {
    order.Customer_Email__c = faker.internet.email()
  }

  if (faker.datatype.boolean({ probability: 0.5 })) {
    order.Payment__c = faker.helpers.arrayElement<PaymentMethod>(['Credit Card', 'Wire Transfer', 'Purchase Order'])
  }

  if (faker.datatype.boolean({ probability: 0.4 })) {
    order.Quantity__c = faker.number.int({ min: 1, max: 100 })
  }

  // Always include unit price and total amount
  order.Unit_Price__c = parseFloat(faker.commerce.price({ min: 10, max: 1000, dec: 2 }))
  order.Total_Amount__c = parseFloat(faker.commerce.price({ min: 50, max: 5000, dec: 2 }))
  order.Total_Amount__c = order.Total_Amount__c

  if (faker.datatype.boolean({ probability: 0.2 })) {
    // Sales_Rep__c expects a Salesforce ID, not a name
    // Using a valid Salesforce user ID format
    order.Sales_Rep__c = faker.helpers.arrayElement([
      'a00ak00001Gc1MLAAZ',
      'a00ak00001Gc1MMAAZ',
      'a00ak00001Gc1MNAAZ',
      'a00ak00001Gc1MOAAZ',
      'a00ak00001Gc1MPAAZ',
      'a00ak00001Gc1MQAAZ',
      'a00ak00001Gc1MRAAZ',
      'a00ak00001Gc1MSAAZ',
      'a00ak00001Gc1MTAAZ',
      'a00ak00001Gc1MUAAZ',
    ])
  }

  if (faker.datatype.boolean({ probability: 0.2 })) {
    order.PoNumber = faker.string.alphanumeric(8).toUpperCase()
  }

  if (faker.datatype.boolean({ probability: 0.2 })) {
    order.OrderReferenceNumber = faker.string.alphanumeric(12).toUpperCase()
  }

  if (faker.datatype.boolean({ probability: 0.1 })) {
    order.Type = faker.helpers.arrayElement(['New', 'Renewal', 'Upgrade', 'Downgrade', 'Cancellation'])
  }

  // Address fields - include billing address if customer name is present
  if (order.Customer_Name__c && faker.datatype.boolean({ probability: 0.4 })) {
    order.BillingStreet = faker.location.streetAddress()
    order.BillingCity = faker.location.city()
    order.BillingState = faker.location.state()
    order.BillingPostalCode = faker.location.zipCode()
    order.BillingCountry = faker.location.country()
  }

  // Shipping address - sometimes different from billing
  if (order.Customer_Name__c && faker.datatype.boolean({ probability: 0.3 })) {
    order.ShippingStreet = faker.location.streetAddress()
    order.ShippingCity = faker.location.city()
    order.ShippingState = faker.location.state()
    order.ShippingPostalCode = faker.location.zipCode()
    order.ShippingCountry = faker.location.country()
  }

  // EndDate should be after EffectiveDate
  if (faker.datatype.boolean({ probability: 0.2 })) {
    // Parse EffectiveDate as a Date
    const parsedEffectiveDate = new Date(order.EffectiveDate)
    // Pick EndDate 1-30 days after EffectiveDate, but not in the past
    const endDate = faker.date.between({
      from: new Date(parsedEffectiveDate.getTime() + 1 * 24 * 60 * 60 * 1000),
      to: new Date(parsedEffectiveDate.getTime() + 30 * 24 * 60 * 60 * 1000),
    })
    order.EndDate = endDate.toISOString().split('T')[0]
  }

  if (faker.datatype.boolean({ probability: 0.1 })) {
    // PoDate should be on or before EffectiveDate
    const effectiveDateObj = new Date(order.EffectiveDate)
    const fiveDaysBefore = new Date(effectiveDateObj.getTime() - 5 * 24 * 60 * 60 * 1000)
    order.PoDate = faker.date
      .between({
        from: fiveDaysBefore,
        to: effectiveDateObj,
      })
      .toISOString()
      .split('T')[0]
  }

  if (faker.datatype.boolean({ probability: 0.1 })) {
    // Order_Date__c should be on or after EffectiveDate
    const effectiveDateObj = new Date(order.EffectiveDate)
    const fiveDaysAfter = new Date(effectiveDateObj.getTime() + 5 * 24 * 60 * 60 * 1000)
    order.Order_Date__c = faker.date
      .between({
        from: effectiveDateObj,
        to: fiveDaysAfter,
      })
      .toISOString()
      .split('T')[0]
  }

  if (faker.datatype.boolean({ probability: 0.1 })) {
    // Ship_Date__c should be after Order_Date__c if it exists, otherwise after EffectiveDate
    const baseDate = order.Order_Date__c ? new Date(order.Order_Date__c) : new Date(order.EffectiveDate)
    const twoDaysAfter = new Date(baseDate.getTime() + 2 * 24 * 60 * 60 * 1000)
    order.Ship_Date__c = faker.date
      .between({
        from: baseDate,
        to: twoDaysAfter,
      })
      .toISOString()
      .split('T')[0]
  }

  // Set Product_Id__c with guard against empty productIds array
  if (productIds.length > 0) {
    order.Product_Id__c = faker.helpers.arrayElement<string>(productIds)
  } else {
    // Fallback to synthetic product id if no products available
    order.Product_Id__c = faker.string.alphanumeric(10)
  }

  return order
}

/**
 * Generate multiple random orders
 */
export function generateRandomOrders(count: number, productIds: string[], pricebook2Id?: string): OrderCreateRequest[] {
  return Array.from({ length: count }, () => generateRandomOrder(productIds, pricebook2Id))
}

/**
 * Send a generated order to the backend API
 * This includes creating an OrderItem before changing the order status.
 */
export async function createRandomOrder(): Promise<any> {
  // Fetch products and pricebook entries
  const [productResponse, pricebookEntries] = await Promise.all([
    fetchProducts({ limit: 100 }),
    fetchPricebookEntries(100),
  ])

  // Select a random pricebook entry (if available)
  const pricebookEntry = pricebookEntries.length > 0 ? faker.helpers.arrayElement(pricebookEntries) : null

  const order = generateRandomOrder(
    productResponse.records.map(product => product.Id as string),
    pricebookEntry?.Pricebook2Id,
  )

  try {
    // Step 1: Create the order in Draft status
    const response = await api.post('/salesforce/records/Order', order)
    if (response && response.id) {
      // Step 2: Create an OrderItem (required before changing status)
      if (pricebookEntry) {
        const quantity = order.Quantity__c ?? faker.number.int({ min: 1, max: 10 })
        const unitPrice = pricebookEntry.UnitPrice ?? order.Unit_Price__c ?? 100
        const orderItemResult = await createOrderItem(response.id, pricebookEntry.Id, quantity, unitPrice)
        if (!orderItemResult.success) {
          console.warn('Failed to create OrderItem, skipping status update:', orderItemResult.error)
          return {
            success: true,
            order,
            response,
            orderItemError: orderItemResult.error,
          }
        }
      } else {
        console.warn('No PricebookEntry available, skipping OrderItem creation and status update')
        return {
          success: true,
          order,
          response,
          warning: 'No PricebookEntry available',
        }
      }

      // Step 3: Update order status (now that we have an OrderItem)
      const random = Math.random()
      if (random < 0.6) order.Status = 'Completed'
      else if (random < 0.8) order.Status = 'Processing'
      else if (random < 0.9) order.Status = 'Shipped'
      else order.Status = 'Activated'
      const result = await api.put(`/salesforce/records/Order/${response.id}`, order)
      return {
        success: true,
        order,
        response: result,
      }
    } else {
      return {
        success: false,
        order,
        response,
      }
    }
  } catch (error) {
    console.error('Failed to create random order:', error)
    return {
      success: false,
      order,
      error,
    }
  }
}

/**
 * Send multiple generated orders to the backend API
 */
export async function createRandomOrders(count: number): Promise<any[]> {
  // Fetch products and pricebook entries once for all orders
  const [productResponse, pricebookEntries] = await Promise.all([
    fetchProducts({ limit: 100 }),
    fetchPricebookEntries(100),
  ])

  const productIds = productResponse.records.map(product => product.Id as string)

  // Get a pricebook ID if entries exist
  const pricebook2Id = pricebookEntries.length > 0 ? pricebookEntries[0].Pricebook2Id : undefined

  // Filter entries to only those matching the selected pricebook
  const matchingPricebookEntries = pricebook2Id
    ? pricebookEntries.filter(entry => entry.Pricebook2Id === pricebook2Id)
    : []

  const orders = generateRandomOrders(count, productIds, pricebook2Id)
  const results = []

  for (const order of orders) {
    try {
      // Step 1: Create the order in Draft status
      const response = await api.post('/salesforce/records/Order', order)

      if (response && response.success && response.id) {
        // Step 2: Create an OrderItem (required before changing status)
        // Use only entries from the same pricebook as the Order to satisfy Salesforce constraint
        if (matchingPricebookEntries.length > 0) {
          const pricebookEntry = faker.helpers.arrayElement(matchingPricebookEntries)
          const quantity = order.Quantity__c ?? faker.number.int({ min: 1, max: 10 })
          const unitPrice = pricebookEntry.UnitPrice ?? order.Unit_Price__c ?? 100
          const orderItemResult = await createOrderItem(response.id, pricebookEntry.Id, quantity, unitPrice)
          if (!orderItemResult.success) {
            console.warn('Failed to create OrderItem, skipping status update:', orderItemResult.error)
            results.push({
              success: true,
              order,
              response,
              orderItemError: orderItemResult.error,
            })
            continue
          }
        } else {
          console.warn('No PricebookEntry available, skipping OrderItem creation and status update')
          results.push({
            success: true,
            order,
            response,
            warning: 'No PricebookEntry available',
          })
          continue
        }

        // Step 3: Update order status (now that we have an OrderItem)
        const random = Math.random()
        if (random < 0.6) order.Status = 'Completed'
        else if (random < 0.8) order.Status = 'Processing'
        else if (random < 0.9) order.Status = 'Shipped'
        else order.Status = 'Activated'

        try {
          const updateResult = await api.put(`/salesforce/records/Order/${response.id}`, order)
          results.push({
            success: true,
            order,
            response: updateResult,
          })
        } catch (updateError) {
          console.error('Failed to update order status:', updateError)
          results.push({
            success: true, // Order was created successfully, just status update failed
            order,
            response,
            updateError,
          })
        }
      } else {
        results.push({
          success: false,
          order,
          response,
        })
      }
    } catch (error) {
      console.error('Failed to create random order:', error)
      results.push({
        success: false,
        order,
        error,
      })
    }
  }

  return results
}

/**
 * Utility function to generate and create a single random order
 * This is the main function to use from components
 */
export async function generateAndCreateOrder(): Promise<{
  success: boolean
  order?: OrderCreateRequest
  response?: any
  error?: any
}> {
  return await createRandomOrder()
}

/**
 * Utility function to generate and create multiple random orders
 * This is useful for bulk testing
 */
export async function generateAndCreateOrders(count: number): Promise<{
  success: boolean
  results: any[]
  summary: {
    total: number
    successful: number
    failed: number
  }
}> {
  const results = await createRandomOrders(count)
  const successful = results.filter(r => r.success).length
  const failed = results.filter(r => !r.success).length

  return {
    success: failed === 0,
    results,
    summary: {
      total: count,
      successful,
      failed,
    },
  }
}
