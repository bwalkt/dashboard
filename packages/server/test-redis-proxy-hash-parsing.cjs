#!/usr/bin/env node

/**
 * Test script to verify enhanced Redis proxy hash operation parsing
 * Tests all three formats: field parameter, args array, and legacy colon parsing
 */

const http = require('http');

// Test configuration
const SERVER_HOST = 'localhost';
const SERVER_PORT = 3000;
const TEST_TOKEN = 'test-filter-token';

console.log('🧪 Testing Enhanced Redis Proxy Hash Parsing...\n');

// Test data with various scenarios
const testCases = [
  {
    name: 'Format 1: Field parameter (preferred)',
    command: 'HSET',
    key: 'user:profile',
    value: 'test-value-1',
    field: 'name',
    expectedSuccess: true,
    description: 'Uses separate field parameter - most robust'
  },
  {
    name: 'Format 2: Args array (robust for colon keys)',
    command: 'HSET',
    key: 'dummy', // Will be ignored when args present
    value: 'test-value-2',
    args: ['user:profile:complex:key', 'email'],
    expectedSuccess: true,
    description: 'Uses args array [hashKey, field] - handles colon-containing keys'
  },
  {
    name: 'Format 3: Legacy colon parsing',
    command: 'HSET',
    key: 'user:settings:theme',
    value: 'dark-mode',
    expectedSuccess: true,
    description: 'Uses key:field format - backward compatibility'
  },
  {
    name: 'HGET with field parameter',
    command: 'HGET',
    key: 'user:profile',
    field: 'name',
    expectedSuccess: true,
    description: 'Retrieve using field parameter'
  },
  {
    name: 'HGET with args array',
    command: 'HGET',
    key: 'dummy',
    args: ['user:profile:complex:key', 'email'],
    expectedSuccess: true,
    description: 'Retrieve using args array'
  },
  {
    name: 'HGET with legacy colon parsing',
    command: 'HGET',
    key: 'user:settings:theme',
    expectedSuccess: true,
    description: 'Retrieve using legacy format'
  },
  {
    name: 'Error case: HGET without field info',
    command: 'HGET',
    key: 'invalidkey',
    expectedSuccess: false,
    description: 'Should fail when no field information provided'
  },
  {
    name: 'Complex key with multiple colons - args array',
    command: 'HSET',
    key: 'dummy',
    value: 'complex-value',
    args: ['namespace:service:user:123:profile:settings', 'preference'],
    expectedSuccess: true,
    description: 'Very complex key with many colons - only args array handles this'
  },
  {
    name: 'Complex key retrieval',
    command: 'HGET',
    key: 'dummy',
    args: ['namespace:service:user:123:profile:settings', 'preference'],
    expectedSuccess: true,
    description: 'Retrieve complex key value'
  }
];

// Helper function to make HTTP request
function makeRequest(body) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(body);
    
    const options = {
      hostname: SERVER_HOST,
      port: SERVER_PORT,
      path: '/redis-proxy',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'x-filter-token': TEST_TOKEN
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          resolve({ status: res.statusCode, data: response });
        } catch (e) {
          resolve({ status: res.statusCode, data: data, parseError: true });
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

// Run tests
async function runTests() {
  console.log('📋 Test Cases:\n');
  
  let passed = 0;
  let failed = 0;
  
  for (let i = 0; i < testCases.length; i++) {
    const test = testCases[i];
    console.log(`${i + 1}. ${test.name}`);
    console.log(`   Description: ${test.description}`);
    
    try {
      const requestBody = {
        command: test.command,
        key: test.key,
        value: test.value,
        field: test.field,
        args: test.args
      };
      
      // Remove undefined fields
      Object.keys(requestBody).forEach(key => {
        if (requestBody[key] === undefined) {
          delete requestBody[key];
        }
      });
      
      console.log(`   Request: ${JSON.stringify(requestBody, null, 6).replace(/\n/g, '\n   ')}`);
      
      const response = await makeRequest(requestBody);
      
      console.log(`   Response Status: ${response.status}`);
      console.log(`   Response: ${JSON.stringify(response.data, null, 6).replace(/\n/g, '\n   ')}`);
      
      const isSuccess = response.status === 200 && response.data.success;
      const testResult = test.expectedSuccess ? isSuccess : !isSuccess;
      
      if (testResult) {
        console.log(`   Result: ✅ PASS`);
        passed++;
      } else {
        console.log(`   Result: ❌ FAIL`);
        console.log(`   Expected success: ${test.expectedSuccess}, Got success: ${isSuccess}`);
        failed++;
      }
      
    } catch (error) {
      console.log(`   Error: ${error.message}`);
      if (test.expectedSuccess) {
        console.log(`   Result: ❌ FAIL (unexpected error)`);
        failed++;
      } else {
        console.log(`   Result: ✅ PASS (expected error)`);
        passed++;
      }
    }
    
    console.log('');
  }
  
  // Summary
  console.log('📊 Test Results Summary:\n');
  console.log(`Total Tests: ${testCases.length}`);
  console.log(`Passed: ${passed} ✅`);
  console.log(`Failed: ${failed} ❌`);
  console.log(`Success Rate: ${Math.round((passed / testCases.length) * 100)}%`);
  
  if (failed === 0) {
    console.log('\n🎉 All tests passed! Enhanced hash parsing is working correctly.');
    console.log('\n✅ Verified Features:');
    console.log('  - Field parameter support (preferred method)');
    console.log('  - Args array support (robust for colon-containing keys)');
    console.log('  - Legacy colon parsing (backward compatibility)');
    console.log('  - Proper error handling for invalid requests');
    console.log('  - Complex key handling with multiple colons');
  } else {
    console.log(`\n⚠️  ${failed} test(s) failed. Check the implementation.`);
  }
}

// Check if server is running first
const checkServer = new Promise((resolve, reject) => {
  const req = http.request({
    hostname: SERVER_HOST,
    port: SERVER_PORT,
    path: '/health', // Try health endpoint first
    method: 'GET',
    timeout: 2000
  }, (res) => {
    resolve(true);
  });
  
  req.on('error', () => {
    reject(new Error(`Server not running on ${SERVER_HOST}:${SERVER_PORT}`));
  });
  
  req.on('timeout', () => {
    req.destroy();
    reject(new Error(`Server timeout on ${SERVER_HOST}:${SERVER_PORT}`));
  });
  
  req.end();
});

// Main execution
console.log(`🔍 Checking server availability on ${SERVER_HOST}:${SERVER_PORT}...`);

checkServer
  .then(() => {
    console.log('✅ Server is running, starting tests...\n');
    return runTests();
  })
  .catch((error) => {
    console.log(`❌ ${error.message}`);
    console.log('\n💡 To run these tests:');
    console.log('   1. Start the server: npm run dev');
    console.log('   2. Ensure Redis is running');
    console.log('   3. Run this test script again');
    process.exit(1);
  });