#!/usr/bin/env tsx
// @ts-nocheck TODO: Fix types
import type { OrderCreateRequest } from '@pzero/shared'
import { salesforceConfig } from '../config/salesforce.js'
import { SalesforceClient } from '../services/salesforce-client.service.js'

/**
 * Script to seed Salesforce with sample orders
 * Generates orders with a higher proportion of "Completed" status
 */

// Sample customer data
const sampleCustomers = [
  { name: 'Acme Corporation', email: 'orders@acme.com' },
  { name: 'Global Industries', email: 'purchasing@global.com' },
  { name: 'TechStart Solutions', email: 'orders@techstart.com' },
  { name: 'Premier Services', email: 'orders@premier.com' },
  { name: 'Innovation Labs', email: 'procurement@innovation.com' },
  { name: 'Enterprise Systems', email: 'orders@enterprise.com' },
  { name: 'Digital Dynamics', email: 'purchasing@digital.com' },
  { name: 'Future Tech', email: 'orders@futuretech.com' },
  { name: 'Alpha Solutions', email: 'orders@alpha.com' },
  { name: 'Beta Systems', email: 'purchasing@beta.com' },
]

// Sample products
const sampleProducts = [
  { id: 'PROD-001', name: 'Premium Software License', unitPrice: 299.99 },
  { id: 'PROD-002', name: 'Professional Services Package', unitPrice: 1500.0 },
  { id: 'PROD-003', name: 'Cloud Storage Plan', unitPrice: 99.99 },
  { id: 'PROD-004', name: 'Security Suite', unitPrice: 599.99 },
  { id: 'PROD-005', name: 'Analytics Dashboard', unitPrice: 899.99 },
  { id: 'PROD-006', name: 'Mobile App License', unitPrice: 199.99 },
  { id: 'PROD-007', name: 'Integration Package', unitPrice: 2499.99 },
  { id: 'PROD-008', name: 'Support Plan', unitPrice: 399.99 },
]

type OrderStatus = 'Draft' | 'Activated' | 'Processing' | 'Completed' | 'Shipped'

// Order statuses with weighted distribution (favoring completed orders)
const statusDistribution: ReadonlyArray<{ status: OrderStatus; weight: number }> = [
  { status: 'Completed', weight: 60 }, // 60% completed
  { status: 'Processing', weight: 20 }, // 20% processing
  { status: 'Shipped', weight: 10 }, // 10% shipped
  { status: 'Draft', weight: 3 }, // 3% draft
  { status: 'Activated', weight: 7 }, // 7% activated
]

/**
 * Selects an order status according to the configured weighted distribution.
 *
 * @returns OrderStatus — the chosen status based on the weights in `statusDistribution`; returns 'Completed' as a fallback.
 */
function getRandomStatus(): OrderStatus {
  const totalWeight = statusDistribution.reduce((sum, item) => sum + item.weight, 0)
  const target = Math.random() * totalWeight // [0, totalWeight)
  let cumulative = 0

  for (const { status, weight } of statusDistribution) {
    cumulative += weight
    if (target < cumulative) {
      return status
    }
  }

  return 'Completed' // Fallback
}

/**
 * Selects a random customer from the sampleCustomers array.
 *
 * @returns A customer object from `sampleCustomers` chosen at random.
 */
function getRandomCustomer() {
  return sampleCustomers[Math.floor(Math.random() * sampleCustomers.length)]
}

/**
 * Selects a random product from the sampleProducts array.
 *
 * @returns A product object from `sampleProducts` chosen uniformly at random.
 */
function getRandomProduct() {
  return sampleProducts[Math.floor(Math.random() * sampleProducts.length)]
}

/**
 * Selects a random integer quantity between 1 and 10 inclusive.
 *
 * @returns A number between 1 and 10 inclusive representing the item quantity.
 */
function getRandomQuantity() {
  return Math.floor(Math.random() * 10) + 1 // 1-10 items
}

/**
 * Generates a random date within the past N days formatted as YYYY-MM-DD.
 *
 * @param daysBack - Maximum number of days in the past to select the date (default: 90)
 * @returns A date string in `YYYY-MM-DD` format representing a random date within the past `daysBack` days
 */
function getRandomDate(daysBack: number = 90) {
  const now = new Date()
  const past = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000)
  const randomTime = past.getTime() + Math.random() * (now.getTime() - past.getTime())
  return new Date(randomTime).toISOString().split('T')[0] // YYYY-MM-DD format
}

/**
 * Builds a synthetic OrderCreateRequest populated with randomized customer, product, quantity, status, dates, payment method, and an external identifier.
 *
 * @param accountId - Salesforce Account Id to associate with the order
 * @param ownerId - Salesforce User Id to set as the order owner
 * @returns An OrderCreateRequest object with fields including AccountId, OwnerId, Status, Description, customer and product custom fields, Quantity__c, Unit_Price__c, Total_Amount__c, Order_Date__c, conditional Ship_Date__c, Payment__c, and External_Id__c
 */
function generateSampleOrder(accountId: string, ownerId: string): OrderCreateRequest {
  const customer = getRandomCustomer()
  const product = getRandomProduct()
  const quantity = getRandomQuantity()
  const totalAmount = product.unitPrice * quantity
  const status = getRandomStatus()

  return {
    AccountId: accountId,
    OwnerId: ownerId,
    EffectiveDate: getRandomDate(30), // Orders from last 30 days
    Status: status,
    Description: `Order for ${quantity}x ${product.name}`,
    Customer_Name__c: customer.name,
    Customer_Email__c: customer.email,
    Product_Id__c: product.id,
    Quantity__c: quantity,
    Unit_Price__c: product.unitPrice,
    Total_Amount__c: totalAmount,
    Order_Date__c: getRandomDate(30),
    Ship_Date__c: status === 'Shipped' || status === 'Completed' ? getRandomDate(10) : null,
    Payment__c: Math.random() > 0.5 ? 'Credit Card' : 'Purchase Order',
    External_Id__c: `EXT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  }
}

/**
 * Create a default Salesforce Account used for seeded orders.
 *
 * @returns The Id of the created Account
 * @throws The underlying error if account creation fails
 */
async function createDefaultAccount(client: SalesforceClient): Promise<string> {
  try {
    const accountData = {
      Name: 'Sample Orders Account',
      Type: 'Customer',
      Industry: 'Technology',
      Description: 'Default account for seeded orders',
    }

    const result = await client.createRecord('Account', accountData)
    return result.id
  } catch (error) {
    console.error('Failed to create default account:', error)
    throw error
  }
}

/**
 * Retrieve the Id of a single active Salesforce user.
 *
 * @param client - Salesforce client used to execute the SOQL query
 * @returns The Id of the first active user found
 * @throws Error if no active users are found or if the query fails
 */
async function getDefaultUserId(client: SalesforceClient): Promise<string> {
  try {
    const query = 'SELECT Id, Name FROM User WHERE IsActive = true LIMIT 1'
    const result = await client.query(query)

    if (result.records.length === 0) {
      throw new Error('No active users found')
    }

    const userId = result.records[0].Id
    return userId
  } catch (error) {
    console.error('Failed to get default user ID:', error)
    throw error
  }
}

/**
 * Seeds Salesforce with a set of synthetic Order records using sample customers and products.
 *
 * Authenticates a Salesforce client, creates a default Account and determines a default Owner, then generates and inserts `numberOfOrders` sample Order records (with varied statuses, dates, payment methods, and totals), logging per-order failures and collecting status counts. The function exits the process with code 1 on an unrecoverable top-level error.
 *
 * @param numberOfOrders - The number of sample orders to create (defaults to 50)
 */
async function seedOrders(numberOfOrders: number = 50) {
  try {
    // Initialize Salesforce client
    const config = salesforceConfig.getConfig()
    const salesforceClient = new SalesforceClient(config)

    // Authenticate
    await salesforceClient.authenticate()

    // Get default user ID
    const ownerId = await getDefaultUserId(salesforceClient)

    // Create default account
    const accountId = await createDefaultAccount(salesforceClient)

    // Generate and create orders

    const statusCounts: Record<OrderStatus, number> = {
      Draft: 0,
      Activated: 0,
      Processing: 0,
      Completed: 0,
      Shipped: 0,
    }

    const createdOrders = []

    for (let i = 0; i < numberOfOrders; i++) {
      try {
        const orderData = generateSampleOrder(accountId, ownerId)
        const result = await salesforceClient.createRecord('Order', orderData)
        createdOrders.push({
          id: result.id,
          status: orderData.Status,
          customerName: orderData.Customer_Name__c,
          totalAmount: orderData.Total_Amount__c,
        })

        statusCounts[orderData.Status]++

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100))
      } catch (error) {
        console.error(`   Failed to create order ${i + 1}:`, error)
      }
    }

    Object.entries(statusCounts).forEach(([status, count]) => {
      const percentage = ((count / numberOfOrders) * 100).toFixed(1)
    })
  } catch (error) {
    console.error('❌ Error during order seeding:', error)
    process.exit(1)
  }
}

// Run the script if called directly
if (process.argv[1] === new URL(import.meta.url).pathname) {
  const numberOfOrders = parseInt(process.argv[2]) || 50
  seedOrders(numberOfOrders).then(() => process.exit(0))
}

export { seedOrders }
