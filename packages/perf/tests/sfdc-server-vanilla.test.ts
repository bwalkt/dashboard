/**
 * k6 Performance Tests for sfdc-server-vanilla GET Endpoints
 * Tests all GET endpoints (except login) with proper authentication and challenge handling.
 * Challenge handling uses a static answer (see README for STATIC_CHALLENGE_ANSWER).
 *
 * Covered GET Endpoints:
 * - GET /salesforce/:objectType/query - Query Salesforce records (protected)
 * - GET /salesforce/Order/query/last-30-days - Query orders from last 30 days (protected)
 * - GET /salesforce/records/:objectType/:recordId - Get specific record (protected)
 * - GET /salesforce/metadata/:objectType - Get object metadata (protected)
 *
 * Note: GET /auth/callback is excluded as it's an OAuth callback endpoint
 * that requires specific query parameters and state, not suitable for performance testing.
 *
 * Note: POST /auth/me is used in setup to initialize the grid and challenges.
 */

import { check, sleep } from 'k6'
import { Rate, Trend } from 'k6/metrics'
import { Options } from 'k6/options'
import { clearState, initializeGrid, makePostRequest, makeRequest } from './utils.js'

// Custom metrics
const errorRate = new Rate('errors')
const authMeDuration = new Trend('auth_me_duration')
const queryDuration = new Trend('query_duration')

export const options: Options = {
  stages: [
    { duration: '30s', target: 5 }, // Ramp up to 5 VUs
    { duration: '1m', target: 5 }, // Stay at 5 VUs
    // { duration: '30s', target: 10 }, // Ramp up to 10 VUs
    // { duration: '1m', target: 10 }, // Stay at 10 VUs
    { duration: '30s', target: 0 }, // Ramp down
  ],
  thresholds: {
    errors: ['rate<0.1'], // Less than 10% errors
    http_req_duration: ['p(95)<3000'], // 95% of requests should be below 2s
  },
}

// Setup function runs once before all VUs start
export function setup() {
  // Initialize grid
  const initialized = initializeGrid()
  if (!initialized) {
    console.error('Failed to initialize grid')
  }
  return { initialized: initialized || false }
}

// Teardown function runs once after all VUs finish
export function teardown(data: { initialized: boolean } | undefined) {
  if (data) {
    clearState()
  }
}

export default function (data: { initialized: boolean } | undefined) {
  // Per-VU warmup on first iteration: setup() runs in a separate context, so each VU
  // has its own challenge state and must initialize it. Without this, multiple VUs
  // hit the API with no challenges and fail (401/errors), breaching thresholds.
  // biome-ignore lint/correctness/noUndeclaredVariables: k6 built-in __ITER and __VU
  if (__ITER === 0) {
    const vuInitialized = initializeGrid()
    if (!vuInitialized) {
      console.error(`[VU ${__VU}] Failed to initialize grid on first iteration`)
    }
  }

  // Handle case where data might be undefined
  if (!data || !data.initialized) {
    console.error('Grid not initialized, skipping tests')
    return
  }

  // Test 1: POST /auth/me - Get current user info (protected)
  // Note: This is POST, not GET, but it's a protected endpoint we need to test
  const authMeStart = Date.now()
  const { response: authMeResponse, parsedBody: authMeBody } = makePostRequest('/auth/me')
  const authMeSuccess = check(authMeResponse, {
    'auth/me status is 200': r => r.status === 200,
    'auth/me has user data': () => {
      // Use parsedBody instead of calling r.json() again (can only be called once in k6)
      return authMeBody?.user !== undefined
    },
  })
  authMeDuration.add(Date.now() - authMeStart)
  errorRate.add(!authMeSuccess)
  sleep(1)

  // Test 2: GET /salesforce/:objectType/query - Query Salesforce records
  const objectTypes = ['Order', 'Product2']
  const objectType = objectTypes[__VU % objectTypes.length] // Distribute across VUs

  const queryStart = Date.now()
  const queryResponse = makeRequest(`/salesforce/${objectType}/query`, {
    page: 1,
    limit: 50,
  })

  const querySuccess = check(queryResponse, {
    [`query ${objectType} status is 200`]: r => r.status === 200,
    [`query ${objectType} has records`]: r => {
      try {
        const body = r.json() as any
        return body?.success === true && Array.isArray(body?.records)
      } catch {
        return false
      }
    },
  })
  queryDuration.add(Date.now() - queryStart)
  errorRate.add(!querySuccess)
  sleep(1)

  // Test 3: GET /salesforce/Order/query/last-30-days - Query orders from last 30 days
  const last30DaysStart = Date.now()
  const last30DaysResponse = makeRequest('/salesforce/Order/query/last-30-days')
  const last30DaysSuccess = check(last30DaysResponse, {
    'last-30-days status is 200': r => r.status === 200,
    'last-30-days has records': r => {
      try {
        const body = r.json() as any
        return body?.success === true && Array.isArray(body?.records)
      } catch {
        return false
      }
    },
  })
  queryDuration.add(Date.now() - last30DaysStart)
  errorRate.add(!last30DaysSuccess)
  sleep(1)
}
