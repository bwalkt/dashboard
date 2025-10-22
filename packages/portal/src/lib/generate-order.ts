import { faker } from '@faker-js/faker'
import { type OrderCreateRequest, PaymentMethod } from '@pzero/shared'
import { api } from './api'

/**
 * Build and return a synthetic OrderCreateRequest populated with required Salesforce fields and a set of optional fields chosen randomly.
 *
 * The returned object always includes required Salesforce fields such as OwnerId, EffectiveDate (within the last 30 days), Status set to "Draft", and AccountId; other fields (name, description, customer info, payment, quantities, dates, addresses, product and sales-rep references, and pricing) are included probabilistically to simulate realistic variation.
 *
 * @returns A fully formed OrderCreateRequest suitable for creating a new Order record, with required fields present and additional fields optionally populated.
export function generateRandomOrder(): OrderCreateRequest {
  // Get yesterday's date
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  // Generate effective date between today and last 30 days
  const effectiveDate = faker.date
    .between({
      from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      to: new Date(), // today
    })
    .toISOString()
    .split("T")[0]; // Format as YYYY-MM-DD

  // Required fields
  const order: OrderCreateRequest = {
    OwnerId: faker.helpers.arrayElement([
      "005ak00000LOPNlAAP", // Default owner from form
    ]),
    EffectiveDate: effectiveDate,
    Status: "Draft", // Salesforce only allows "Draft" status for new orders
    AccountId: faker.helpers.arrayElement([
      "001ak00001NjbGzAAJ", // Default account from form
    ]),
  };

  // Optional fields - randomly include based on probability
  if (faker.datatype.boolean({ probability: 0.8 })) {
    order.Name = faker.commerce.productName() + " Order";
  }

  if (faker.datatype.boolean({ probability: 0.7 })) {
    order.Description = faker.commerce.productDescription();
  }

  if (faker.datatype.boolean({ probability: 0.6 })) {
    order.Customer_Name__c = faker.person.fullName();
  }

  if (faker.datatype.boolean({ probability: 0.6 })) {
    order.Customer_Email__c = faker.internet.email();
  }

  if (faker.datatype.boolean({ probability: 0.5 })) {
    order.Payment__c = faker.helpers.arrayElement<PaymentMethod>(["Credit Card", "Wire Transfer", "Purchase Order"]);
  }

  if (faker.datatype.boolean({ probability: 0.4 })) {
    order.Quantity__c = faker.number.int({ min: 1, max: 100 });
  }

  // Always include unit price and total amount
  order.Unit_Price__c = parseFloat(faker.commerce.price({ min: 10, max: 1000, dec: 2 }));
  order.Total_Amount__c = parseFloat(faker.commerce.price({ min: 50, max: 5000, dec: 2 }));
  order.Total_Amount__c = order.Total_Amount__c;

  if (faker.datatype.boolean({ probability: 0.3 })) {
    order.Product_Id__c = faker.string.alphanumeric(10);
  }

  if (faker.datatype.boolean({ probability: 0.2 })) {
    // Sales_Rep__c expects a Salesforce ID, not a name
    // Using a valid Salesforce user ID format
    order.Sales_Rep__c = faker.helpers.arrayElement([
      "a00ak00001Gc1MLAAZ",
      "a00ak00001Gc1MMAAZ",
      "a00ak00001Gc1MNAAZ",
      "a00ak00001Gc1MOAAZ",
      "a00ak00001Gc1MPAAZ",
      "a00ak00001Gc1MQAAZ",
      "a00ak00001Gc1MRAAZ",
      "a00ak00001Gc1MSAAZ",
      "a00ak00001Gc1MTAAZ",
      "a00ak00001Gc1MUAAZ",
      "a00ak00001Gc1MLAAZ",
      "a00ak00001Gc1MMAAZ",
      "a00ak00001Gc1MNAAZ",
      "a00ak00001Gc1MOAAZ",
      "a00ak00001Gc1MPAAZ",
      "a00ak00001Gc1MQAAZ",
      "a00ak00001Gc1MRAAZ",
      "a00ak00001Gc1MSAAZ",
      "a00ak00001Gc1MTAAZ",
      "a00ak00001Gc1MUAAZ",
    ]);
  }

  if (faker.datatype.boolean({ probability: 0.2 })) {
    order.PoNumber = faker.string.alphanumeric(8).toUpperCase();
  }

  if (faker.datatype.boolean({ probability: 0.2 })) {
    order.OrderReferenceNumber = faker.string.alphanumeric(12).toUpperCase();
  }

  if (faker.datatype.boolean({ probability: 0.1 })) {
    order.Type = faker.helpers.arrayElement(["New", "Renewal", "Upgrade", "Downgrade", "Cancellation"]);
  }

  // Address fields - include billing address if customer name is present
  if (order.Customer_Name__c && faker.datatype.boolean({ probability: 0.4 })) {
    order.BillingStreet = faker.location.streetAddress();
    order.BillingCity = faker.location.city();
    order.BillingState = faker.location.state();
    order.BillingPostalCode = faker.location.zipCode();
    order.BillingCountry = faker.location.country();
  }

  // Shipping address - sometimes different from billing
  if (order.Customer_Name__c && faker.datatype.boolean({ probability: 0.3 })) {
    order.ShippingStreet = faker.location.streetAddress();
    order.ShippingCity = faker.location.city();
    order.ShippingState = faker.location.state();
    order.ShippingPostalCode = faker.location.zipCode();
    order.ShippingCountry = faker.location.country();
  }

  // Date fields - all between today and last 30 days
  if (faker.datatype.boolean({ probability: 0.2 })) {
    order.EndDate = faker.date
      .between({
        from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
        to: new Date(), // today
      })
      .toISOString()
      .split("T")[0];
  }

  if (faker.datatype.boolean({ probability: 0.1 })) {
    order.PoDate = faker.date
      .between({
        from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
        to: new Date(), // today
      })
      .toISOString()
      .split("T")[0];
  }

  if (faker.datatype.boolean({ probability: 0.1 })) {
    order.Order_Date__c = faker.date
      .between({
        from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
        to: new Date(), // today
      })
      .toISOString()
      .split("T")[0];
  }

  if (faker.datatype.boolean({ probability: 0.1 })) {
    order.Ship_Date__c = faker.date
      .between({
        from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
        to: new Date(), // today
      })
      .toISOString()
      .split("T")[0];
  }

  const productId = faker.helpers.arrayElement([
    "01tak00000Jh4BtAAJ",
    "01tak00000Jh4BuAAJ",
    "01tak00000Jh4BvAAJ",
    "01tak00000Jh4BwAAJ",
    "01tak00000Jh4BxAAJ",
    "01tak00000Jh4ByAAJ",
    "01tak00000Jh4BzAAJ",
    "01tak00000Jh4C0AAJ",
    "01tak00000Jh4C1AAJ",
    "01tak00000Jh4C2AAJ",
    "01tak00000JnktBAAR",
    "01tak00000Jnl1FAAR",
    "01tak00000JqDO1AAN",
    "01tak00000JqDSrAAN",
    "01tak00000JqDXhAAN",
  ]);

  order.Product_Id__c = productId;

  return order;
}

/**
 * Creates an array of random OrderCreateRequest objects.
 *
 * @param count - Number of orders to generate
 * @returns An array containing `count` randomly generated orders
 */
export function generateRandomOrders(count: number): OrderCreateRequest[] {
  return Array.from({ length: count }, () => generateRandomOrder())
}

/**
 * Creates a generated order via the backend API and, if created, updates its Status to a randomly chosen final state.
 *
 * The function posts a newly generated order to /salesforce/records/Order. If the creation response contains an `id`,
 * it assigns a final Status chosen randomly among `Completed` (60%), `Processing` (20%), `Shipped` (10%), and `Activated` (10%),
 * then performs a PUT to update the created order.
 *
 * @returns An object describing the outcome:
 * - When creation and update succeed: `{ success: true, order, response }` where `response` is the update response.
 * - When creation returns no `id`: `{ success: false, order, response }` where `response` is the creation response.
 * - On error: `{ success: false, order, error }` with the caught `error`.
 */
export async function createRandomOrder(): Promise<any> {
  const order = generateRandomOrder()

  try {
    const response = await api.post('/salesforce/records/Order', order)
    if (response && response.id) {
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
 * Create multiple random orders, post each to the backend, and attempt to update its final status.
 *
 * @param count - Number of orders to generate and create
 * @returns An array of per-order result objects. Each result includes `success` (boolean), the original `order`, and either API responses (`response` and optionally `updateError`) for created orders or an `error` for failed creations
 */
export async function createRandomOrders(count: number): Promise<any[]> {
  const orders = generateRandomOrders(count)
  const results = []

  for (const order of orders) {
    try {
      const response = await api.post('/salesforce/records/Order', order)

      if (response && response.id) {
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
 * Generate a random order and persist it through the backend API, optionally updating its final status.
 *
 * @returns An object with `success` set to `true` when the order was created (and updated) successfully; `order` containing the created OrderCreateRequest when available; `response` with the API response(s); and `error` populated if the operation failed.
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
 * Generate and create multiple random orders, returning per-order results and a summary.
 *
 * @param count - The number of orders to generate and create
 * @returns An object with:
 *  - `success`: `true` if all orders succeeded, `false` otherwise.
 *  - `results`: an array of per-order result objects produced during creation/update.
 *  - `summary`: counts for `total`, `successful`, and `failed` orders.
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
