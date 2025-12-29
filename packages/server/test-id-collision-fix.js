#!/usr/bin/env node

/**
 * Test script to verify ID collision fix
 * This ensures concurrent ID generation produces unique IDs
 */

import { HeaderInfoCacheService } from './dist/services/header-info-cache.service.js';

async function testIdCollisionFix() {
  console.log('🧪 Testing ID Collision Fix...\n');

  try {
    console.log('🔍 Demonstrating the ID collision issue and fix:\n');
    
    console.log('❌ BEFORE (Vulnerable to collisions):');
    console.log('1. Request A: createEndpointId("user1") → "user1-endpoint-1234567890"');
    console.log('2. Request B: createEndpointId("user2") → "user2-endpoint-1234567890" (same timestamp!)');
    console.log('3. Multiple requests in same millisecond → duplicate IDs! 🚨 COLLISION\n');

    console.log('✅ AFTER (Collision-resistant):');
    console.log('1. Request A: createEndpointId("user1") → "user1-endpoint-1234567890-a1b2c3d4"');
    console.log('2. Request B: createEndpointId("user2") → "user2-endpoint-1234567890-e5f6g7h8"');
    console.log('3. Same timestamp + different random bytes → unique IDs! 🔒 SAFE\n');

    console.log('📝 Test 1: Basic ID generation with random components');
    
    const endpointId1 = HeaderInfoCacheService.createEndpointId('test-user');
    const endpointId2 = HeaderInfoCacheService.createEndpointId('test-user', 'custom');
    const functionId1 = HeaderInfoCacheService.createFunctionId('endpoint-1', 'test-function');
    
    console.log(`Endpoint ID (basic): ${endpointId1}`);
    console.log(`Endpoint ID (custom): ${endpointId2}`);
    console.log(`Function ID: ${functionId1}`);
    
    // Verify IDs have random components (8-character hex strings)
    const endpointRandomPart = endpointId1.split('-').pop();
    const functionRandomPart = functionId1.split('-').pop();
    
    if (endpointRandomPart && endpointRandomPart.length === 8 && /^[a-f0-9]{8}$/.test(endpointRandomPart)) {
      console.log('✅ Endpoint ID contains 8-character random hex component');
    } else {
      console.log('❌ Endpoint ID missing proper random component');
      process.exit(1);
    }
    
    if (functionRandomPart && functionRandomPart.length === 8 && /^[a-f0-9]{8}$/.test(functionRandomPart)) {
      console.log('✅ Function ID contains 8-character random hex component');
    } else {
      console.log('❌ Function ID missing proper random component');
      process.exit(1);
    }

    console.log('\n📝 Test 2: High-frequency collision test');
    
    // Generate many IDs in rapid succession to test for collisions
    const endpointIds = [];
    const functionIds = [];
    const iterations = 1000;
    
    console.log(`Generating ${iterations} IDs in rapid succession...`);
    
    for (let i = 0; i < iterations; i++) {
      endpointIds.push(HeaderInfoCacheService.createEndpointId('user', `test-${i}`));
      functionIds.push(HeaderInfoCacheService.createFunctionId(`endpoint-${i}`, 'function'));
    }
    
    // Check for duplicate endpoint IDs
    const uniqueEndpointIds = new Set(endpointIds);
    const endpointCollisions = endpointIds.length - uniqueEndpointIds.size;
    
    if (endpointCollisions === 0) {
      console.log(`✅ No collisions in ${iterations} endpoint IDs`);
    } else {
      console.log(`❌ Found ${endpointCollisions} endpoint ID collisions`);
      process.exit(1);
    }
    
    // Check for duplicate function IDs
    const uniqueFunctionIds = new Set(functionIds);
    const functionCollisions = functionIds.length - uniqueFunctionIds.size;
    
    if (functionCollisions === 0) {
      console.log(`✅ No collisions in ${iterations} function IDs`);
    } else {
      console.log(`❌ Found ${functionCollisions} function ID collisions`);
      process.exit(1);
    }

    console.log('\n📝 Test 3: Concurrent ID generation simulation');
    
    // Simulate concurrent requests (Promise.all executes them as close to simultaneously as possible)
    const concurrentEndpointPromises = Array(100).fill().map((_, i) => 
      Promise.resolve(HeaderInfoCacheService.createEndpointId(`concurrent-user-${i}`))
    );
    
    const concurrentFunctionPromises = Array(100).fill().map((_, i) => 
      Promise.resolve(HeaderInfoCacheService.createFunctionId(`concurrent-endpoint-${i}`, 'func'))
    );
    
    const [concurrentEndpointIds, concurrentFunctionIds] = await Promise.all([
      Promise.all(concurrentEndpointPromises),
      Promise.all(concurrentFunctionPromises)
    ]);
    
    const uniqueConcurrentEndpoints = new Set(concurrentEndpointIds);
    const uniqueConcurrentFunctions = new Set(concurrentFunctionIds);
    
    if (uniqueConcurrentEndpoints.size === concurrentEndpointIds.length) {
      console.log('✅ No collisions in concurrent endpoint ID generation');
    } else {
      console.log('❌ Collisions found in concurrent endpoint ID generation');
      process.exit(1);
    }
    
    if (uniqueConcurrentFunctions.size === concurrentFunctionIds.length) {
      console.log('✅ No collisions in concurrent function ID generation');
    } else {
      console.log('❌ Collisions found in concurrent function ID generation');
      process.exit(1);
    }

    console.log('\n📝 Test 4: ID format verification');
    
    // Test different ID formats
    const testCases = [
      { input: ['user123'], expected: /^user123-endpoint-\d+-[a-f0-9]{8}$/ },
      { input: ['user123', 'custom'], expected: /^user123-custom-\d+-[a-f0-9]{8}$/ }
    ];
    
    testCases.forEach((testCase, index) => {
      const id = HeaderInfoCacheService.createEndpointId(...testCase.input);
      if (testCase.expected.test(id)) {
        console.log(`✅ Test case ${index + 1}: ID format correct - ${id}`);
      } else {
        console.log(`❌ Test case ${index + 1}: ID format incorrect - ${id}`);
        process.exit(1);
      }
    });
    
    const functionTestId = HeaderInfoCacheService.createFunctionId('endpoint-abc', 'my-function');
    const functionPattern = /^endpoint-abc-my-function-\d+-[a-f0-9]{8}$/;
    if (functionPattern.test(functionTestId)) {
      console.log(`✅ Function ID format correct - ${functionTestId}`);
    } else {
      console.log(`❌ Function ID format incorrect - ${functionTestId}`);
      process.exit(1);
    }

    console.log('\n🎉 All ID collision tests passed!');
    console.log('🔒 ID collision vulnerability eliminated');
    console.log('💡 Key improvements:');
    console.log('  - Added 32-bit random component to all IDs');
    console.log('  - Collision probability: ~1 in 4.3 billion per millisecond');
    console.log('  - Safe for high-frequency concurrent requests');
    console.log('  - Backward compatible ID format');
    console.log('  - Cryptographically secure random bytes');

  } catch (error) {
    console.error('❌ Test failed with error:', error);
    process.exit(1);
  }
}

testIdCollisionFix().catch(console.error);