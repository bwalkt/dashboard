#!/usr/bin/env tsx
// @ts-nocheck TODO: Fix types
import { salesforceConfig } from '../config/salesforce.js'
import { SalesforceClient } from '../services/salesforce-client.service.js'

/**
 * Script to cleanup old Salesforce orders
 * Deletes orders created before a specified date
 */

interface OrderRecord {
  Id: string
  Name?: string
  CreatedDate: string
  Status: string
}

interface OrderItemRecord {
  Id: string
  OrderId: string
}

/**
 * Delete OrderItems associated with given order IDs
 * Must be deleted before orders due to parent-child relationship
 * Batches queries to avoid URI too long errors
 */
async function deleteOrderItems(
  client: SalesforceClient,
  orderIds: string[],
): Promise<{ deleted: number; failed: number }> {
  if (orderIds.length === 0) {
    return { deleted: 0, failed: 0 }
  }

  let deleted = 0
  let failed = 0
  const batchSize = 100 // Process 100 order IDs at a time to avoid URI too long

  console.log(`Querying OrderItems in batches of ${batchSize}...`)

  for (let i = 0; i < orderIds.length; i += batchSize) {
    const batch = orderIds.slice(i, i + batchSize)
    const orderIdList = batch.map(id => `'${id}'`).join(',')
    const query = `SELECT Id, OrderId FROM OrderItem WHERE OrderId IN (${orderIdList})`

    try {
      const result = await client.queryAll(query)
      const orderItems = result.records as OrderItemRecord[]

      if (orderItems.length > 0) {
        console.log(`  Batch ${Math.floor(i / batchSize) + 1}: Found ${orderItems.length} OrderItems`)

        for (const item of orderItems) {
          try {
            await client.deleteRecord('OrderItem', item.Id)
            deleted++
            // Small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 30))
          } catch (error) {
            console.error(`  Failed to delete OrderItem ${item.Id}:`, (error as Error).message)
            failed++
          }
        }
      }
    } catch (error) {
      console.error(`  Failed to query OrderItems for batch:`, (error as Error).message)
    }
  }

  console.log(`OrderItems - Total deleted: ${deleted}, Total failed: ${failed}`)
  return { deleted, failed }
}

/**
 * Delete orders created before a specified date
 * @param beforeDate - ISO date string (YYYY-MM-DD) - orders created before this date will be deleted
 */
async function cleanupOrders(beforeDate: string) {
  try {
    console.log(`\n========================================`)
    console.log(`  Salesforce Order Cleanup Script`)
    console.log(`========================================\n`)
    console.log(`Deleting orders created before: ${beforeDate}\n`)

    // Initialize Salesforce client
    const config = salesforceConfig.getConfig()
    const salesforceClient = new SalesforceClient(config)

    // Authenticate
    console.log('Authenticating with Salesforce...')
    await salesforceClient.authenticate()
    console.log('Authentication successful!\n')

    // Query orders before the specified date
    const soqlDate = `${beforeDate}T00:00:00Z`
    const query = `SELECT Id, Name, CreatedDate, Status FROM Order WHERE CreatedDate < ${soqlDate}`

    console.log('Querying orders to delete...')
    const result = await salesforceClient.queryAll(query)
    const orders = result.records as OrderRecord[]

    console.log(`Found ${orders.length} orders to delete\n`)

    if (orders.length === 0) {
      console.log('No orders to delete. Exiting.')
      return
    }

    // Show sample of orders to be deleted
    console.log('Sample orders to be deleted:')
    orders.slice(0, 5).forEach(order => {
      console.log(`  - ${order.Id} | ${order.Name || 'N/A'} | Created: ${order.CreatedDate} | Status: ${order.Status}`)
    })
    if (orders.length > 5) {
      console.log(`  ... and ${orders.length - 5} more\n`)
    }

    const orderIds = orders.map(o => o.Id)

    // Step 1: Delete OrderItems first (required due to parent-child relationship)
    console.log('\n--- Step 1: Deleting OrderItems ---')
    const orderItemsResult = await deleteOrderItems(salesforceClient, orderIds)
    console.log(`OrderItems - Deleted: ${orderItemsResult.deleted}, Failed: ${orderItemsResult.failed}\n`)

    // Step 2: Delete Orders
    console.log('--- Step 2: Deleting Orders ---')
    let ordersDeleted = 0
    let ordersFailed = 0

    for (const order of orders) {
      try {
        await salesforceClient.deleteRecord('Order', order.Id)
        ordersDeleted++
        if (ordersDeleted % 10 === 0) {
          console.log(`  Deleted ${ordersDeleted}/${orders.length} Orders...`)
        }
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 50))
      } catch (error) {
        console.error(`  Failed to delete Order ${order.Id}:`, (error as Error).message)
        ordersFailed++
      }
    }

    console.log(`\nOrders - Deleted: ${ordersDeleted}, Failed: ${ordersFailed}`)

    // Summary
    console.log(`\n========================================`)
    console.log(`  Cleanup Summary`)
    console.log(`========================================`)
    console.log(`OrderItems deleted: ${orderItemsResult.deleted}`)
    console.log(`OrderItems failed:  ${orderItemsResult.failed}`)
    console.log(`Orders deleted:     ${ordersDeleted}`)
    console.log(`Orders failed:      ${ordersFailed}`)
    console.log(`========================================\n`)

    if (ordersFailed > 0 || orderItemsResult.failed > 0) {
      console.log('Some records failed to delete. Check the errors above.')
    } else {
      console.log('Cleanup completed successfully!')
    }
  } catch (error) {
    console.error('Error during cleanup:', error)
    process.exit(1)
  }
}

// Run the script if called directly
if (process.argv[1] === new URL(import.meta.url).pathname) {
  // Get date from command line argument, default to Dec 12, 2024
  const beforeDate = process.argv[2] || '2024-12-12'

  // Validate date format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(beforeDate)) {
    console.error('Invalid date format. Please use YYYY-MM-DD format.')
    console.error('Usage: tsx cleanup-orders.ts [YYYY-MM-DD]')
    console.error('Example: tsx cleanup-orders.ts 2024-12-12')
    process.exit(1)
  }

  cleanupOrders(beforeDate).then(() => process.exit(0))
}

export { cleanupOrders }
