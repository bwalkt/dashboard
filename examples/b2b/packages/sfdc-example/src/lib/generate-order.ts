import { faker } from "@faker-js/faker";
import { fetchProducts } from "@/hooks/use-products";
import { OrderCreateRequest, PaymentMethod } from "@/types";
import { api } from "./api";

/**
 * Generate a date within the last 30 days with higher probability for the last 2 days.
 * 70% chance of being in the last 2 days, 30% chance of being in days 3-30.
 * Returns date formatted as YYYY-MM-DD.
 */
function generateRecentDate(): string {
  const now = Date.now();
  const oneDayAgo = now - 1 * 24 * 60 * 60 * 1000;
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

  // 80% chance of being in last 2 days, 20% chance of being in days 3-30
  const useRecentDays = faker.datatype.boolean({ probability: 0.8 });

  let date: Date;
  if (useRecentDays) {
    // Last 2 days
    date = faker.date.between({
      from: new Date(oneDayAgo),
      to: new Date(now),
    });
  } else {
    // Days 3-30
    date = faker.date.between({
      from: new Date(thirtyDaysAgo),
      to: new Date(oneDayAgo),
    });
  }

  return date.toISOString().split("T")[0];
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
export function generateRandomOrder(productIds: string[]): OrderCreateRequest {
  // Generate effective date within last 30 days (higher probability for last 2 days)
  const effectiveDate = generateRecentDate();

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

  if (faker.datatype.boolean({ probability: 1 })) {
    order.Customer_Name__c = faker.person.fullName();
  }

  if (faker.datatype.boolean({ probability: 1 })) {
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

  // EndDate should be after EffectiveDate
  if (faker.datatype.boolean({ probability: 0.2 })) {
    // Parse EffectiveDate as a Date
    const effectiveDate = new Date(order.EffectiveDate);
    // Pick EndDate 1-30 days after EffectiveDate, but not in the past
    const endDate = faker.date.between({
      from: new Date(effectiveDate.getTime() + 1 * 24 * 60 * 60 * 1000),
      to: new Date(effectiveDate.getTime() + 30 * 24 * 60 * 60 * 1000),
    });
    order.EndDate = endDate.toISOString().split("T")[0];
  }

  if (faker.datatype.boolean({ probability: 0.1 })) {
    // PoDate should be on or before EffectiveDate
    const effectiveDateObj = new Date(order.EffectiveDate);
    const fiveDayBefore = new Date(effectiveDateObj.getTime() - 5 * 24 * 60 * 60 * 1000);
    order.PoDate = faker.date
      .between({
        from: fiveDayBefore,
        to: effectiveDateObj,
      })
      .toISOString()
      .split("T")[0];
  }

  if (faker.datatype.boolean({ probability: 0.1 })) {
    // Order_Date__c should be on or after EffectiveDate
    const effectiveDateObj = new Date(order.EffectiveDate);
    const fiveDaysAfter = new Date(effectiveDateObj.getTime() + 5 * 24 * 60 * 60 * 1000);
    order.Order_Date__c = faker.date
      .between({
        from: effectiveDateObj,
        to: fiveDaysAfter,
      })
      .toISOString()
      .split("T")[0];
  }

  if (faker.datatype.boolean({ probability: 0.1 })) {
    // Ship_Date__c should be after Order_Date__c if it exists, otherwise after EffectiveDate
    const baseDate = order.Order_Date__c ? new Date(order.Order_Date__c) : new Date(order.EffectiveDate);
    const twoDaysAfter = new Date(baseDate.getTime() + 2 * 24 * 60 * 60 * 1000);
    order.Ship_Date__c = faker.date
      .between({
        from: baseDate,
        to: twoDaysAfter,
      })
      .toISOString()
      .split("T")[0];
  }

  // Set Product_Id__c with guard against empty productIds array
  if (productIds.length > 0) {
    order.Product_Id__c = faker.helpers.arrayElement<string>(productIds);
  } else {
    // Fallback to synthetic product id if no products available
    order.Product_Id__c = faker.string.alphanumeric(10);
  }

  return order;
}

/**
 * Generate multiple random orders
 */
export function generateRandomOrders(count: number, productIds: string[]): OrderCreateRequest[] {
  return Array.from({ length: count }, () => generateRandomOrder(productIds));
}

/**
 * Send a generated order to the backend API
 */
export async function createRandomOrder(): Promise<any> {
  const productIds = await fetchProducts({
    limit: 100,
  });
  const order = generateRandomOrder(productIds.records.map((product) => product.Id as string));

  try {
    const response = await api.post("/salesforce/records/Order", order);
    if (response && response.id) {
      const random = Math.random();
      if (random < 0.6) order.Status = "Completed";
      else if (random < 0.8) order.Status = "Processing";
      else if (random < 0.9) order.Status = "Shipped";
      else order.Status = "Activated";
      const result = await api.put(`/salesforce/records/Order/${response.id}`, order);
      return {
        success: true,
        order,
        response: result,
      };
    } else {
      return {
        success: false,
        order,
        response,
      };
    }
  } catch (error) {
    console.error("Failed to create random order:", error);
    return {
      success: false,
      order,
      error,
    };
  }
}

/**
 * Send multiple generated orders to the backend API
 */
export async function createRandomOrders(count: number): Promise<any[]> {
  const productIds = await fetchProducts({
    limit: 100,
  });

  const orders = generateRandomOrders(
    count,
    productIds.records.map((product) => product.Id as string)
  );
  const results = [];

  for (const order of orders) {
    try {
      const response = await api.post("/salesforce/records/Order", order);

      if (response && response.success && response.id) {
        const random = Math.random();
        if (random < 0.6) order.Status = "Completed";
        else if (random < 0.8) order.Status = "Processing";
        else if (random < 0.9) order.Status = "Shipped";
        else order.Status = "Activated";

        try {
          const updateResult = await api.put(`/salesforce/records/Order/${response.id}`, order);
          results.push({
            success: true,
            order,
            response: updateResult,
          });
        } catch (updateError) {
          console.error("Failed to update order status:", updateError);
          results.push({
            success: true, // Order was created successfully, just status update failed
            order,
            response,
            updateError,
          });
        }
      } else {
        results.push({
          success: false,
          order,
          response,
        });
      }
    } catch (error) {
      console.error("Failed to create random order:", error);
      results.push({
        success: false,
        order,
        error,
      });
    }
  }

  return results;
}

/**
 * Utility function to generate and create a single random order
 * This is the main function to use from components
 */
export async function generateAndCreateOrder(): Promise<{
  success: boolean;
  order?: OrderCreateRequest;
  response?: any;
  error?: any;
}> {
  return await createRandomOrder();
}

/**
 * Utility function to generate and create multiple random orders
 * This is useful for bulk testing
 */
export async function generateAndCreateOrders(count: number): Promise<{
  success: boolean;
  results: any[];
  summary: {
    total: number;
    successful: number;
    failed: number;
  };
}> {
  const results = await createRandomOrders(count);
  const successful = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;

  return {
    success: failed === 0,
    results,
    summary: {
      total: count,
      successful,
      failed,
    },
  };
}
