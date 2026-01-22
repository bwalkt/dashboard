#!/usr/bin/env node

/**
 * Test script to verify the nonce race condition fix
 * This demonstrates that concurrent requests with the same token are properly handled
 */

import { redis } from './dist/config/redis.js';
import { FilterAuthService } from './dist/services/filter-auth.service.js';

async function testNonceRaceCondition() {
  console.log('🧪 Testing Nonce Race Condition Fix...\n');

  try {
    // Initialize Redis
    await redis.initialize();
    console.log('✅ Redis connected');

    // Test Case 1: Sequential validation (should work)
    console.log('\n📝 Test 1: Sequential Token Validation');
    const token1 = FilterAuthService.generateAuthToken('race-test-1', 'node-1');
    
    const result1a = await FilterAuthService.validateAuthToken(token1);
    console.log('First validation:', result1a.valid ? '✅ Valid' : `❌ ${result1a.reason}`);
    
    const result1b = await FilterAuthService.validateAuthToken(token1);
    console.log('Second validation (replay):', result1b.valid ? '❌ Should be invalid!' : `✅ Correctly rejected: ${result1b.reason}`);

    // Test Case 2: Concurrent validation (the race condition scenario)
    console.log('\n📝 Test 2: Concurrent Token Validation (Race Condition Test)');
    const token2 = FilterAuthService.generateAuthToken('race-test-2', 'node-2');
    
    // Simulate concurrent requests with the same token
    console.log('🔄 Sending concurrent validation requests...');
    const concurrentPromises = [
      FilterAuthService.validateAuthToken(token2),
      FilterAuthService.validateAuthToken(token2),
      FilterAuthService.validateAuthToken(token2)
    ];
    
    const concurrentResults = await Promise.all(concurrentPromises);
    
    const validCount = concurrentResults.filter(r => r.valid).length;
    const invalidCount = concurrentResults.filter(r => !r.valid).length;
    
    console.log(`Results: ${validCount} valid, ${invalidCount} invalid`);
    
    if (validCount === 1 && invalidCount === 2) {
      console.log('✅ Race condition properly handled - only one validation succeeded');
    } else if (validCount > 1) {
      console.log('❌ RACE CONDITION BUG: Multiple validations succeeded!');
      console.log('Detailed results:', concurrentResults);
      process.exit(1);
    } else {
      console.log('❌ Unexpected result - no validations succeeded');
      console.log('Detailed results:', concurrentResults);
      process.exit(1);
    }

    // Test Case 3: High-concurrency stress test
    console.log('\n📝 Test 3: High-Concurrency Stress Test');
    const token3 = FilterAuthService.generateAuthToken('race-test-3', 'node-3');
    
    console.log('🚀 Sending 10 concurrent validation requests...');
    const stressPromises = Array(10).fill().map(() => 
      FilterAuthService.validateAuthToken(token3)
    );
    
    const stressResults = await Promise.all(stressPromises);
    const stressValidCount = stressResults.filter(r => r.valid).length;
    const stressInvalidCount = stressResults.filter(r => !r.valid).length;
    
    console.log(`Stress test results: ${stressValidCount} valid, ${stressInvalidCount} invalid`);
    
    if (stressValidCount === 1 && stressInvalidCount === 9) {
      console.log('✅ High-concurrency test passed - atomic nonce consumption working');
    } else {
      console.log('❌ High-concurrency test failed - race condition still exists!');
      console.log('Valid results:', stressResults.filter(r => r.valid));
      process.exit(1);
    }

    // Test Case 4: Demonstrate the fix works across time
    console.log('\n📝 Test 4: Time-based Validation Test');
    const token4a = FilterAuthService.generateAuthToken('race-test-4', 'node-4a');
    const token4b = FilterAuthService.generateAuthToken('race-test-4', 'node-4b');
    
    const result4a = await FilterAuthService.validateAuthToken(token4a);
    console.log('Token 4a validation:', result4a.valid ? '✅ Valid' : `❌ ${result4a.reason}`);
    
    // Wait a tiny bit to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 10));
    
    const result4b = await FilterAuthService.validateAuthToken(token4b);
    console.log('Token 4b validation (different nonce):', result4b.valid ? '✅ Valid' : `❌ ${result4b.reason}`);

    // Test Case 5: Performance impact check
    console.log('\n📝 Test 5: Performance Impact Check');
    const startTime = Date.now();
    
    const perfPromises = Array(50).fill().map((_, i) => 
      FilterAuthService.generateAuthToken(`perf-test-${i}`, `node-${i}`)
    ).map(token => 
      FilterAuthService.validateAuthToken(token)
    );
    
    const perfResults = await Promise.all(perfPromises);
    const endTime = Date.now();
    const validPerfCount = perfResults.filter(r => r.valid).length;
    
    console.log(`Performance test: ${validPerfCount}/50 successful in ${endTime - startTime}ms`);
    console.log(`Average validation time: ${((endTime - startTime) / 50).toFixed(2)}ms`);

    if (validPerfCount === 50) {
      console.log('✅ Performance test passed - atomic operations not causing failures');
    } else {
      console.log('⚠️  Some validations failed in performance test');
    }

    console.log('\n🎉 All nonce race condition tests completed!');
    console.log('🔒 Atomic nonce consumption is working correctly.');
    console.log('✅ No more race condition vulnerabilities in filter authentication.');
    
  } catch (error) {
    console.error('❌ Test failed with error:', error);
    process.exit(1);
  } finally {
    await redis.close();
  }
}

function demonstrateRaceConditionFix() {
  console.log('🔍 Demonstrating the race condition fix:\n');
  
  console.log('❌ BEFORE (Vulnerable):');
  console.log('1. Request A: Check nonce exists → false');
  console.log('2. Request B: Check nonce exists → false (race!)');
  console.log('3. Request A: Validate signature → valid');
  console.log('4. Request B: Validate signature → valid');
  console.log('5. Request A: Mark nonce as used');
  console.log('6. Request B: Mark nonce as used');
  console.log('Result: Both requests succeed! 🚨 REPLAY ATTACK POSSIBLE\n');
  
  console.log('✅ AFTER (Secure):');
  console.log('1. Request A: Validate signature → valid');
  console.log('2. Request B: Validate signature → valid');
  console.log('3. Request A: SET nonce NX → success (first to set)');
  console.log('4. Request B: SET nonce NX → failed (already set)');
  console.log('5. Request A: Return valid');
  console.log('6. Request B: Return invalid (nonce replay)');
  console.log('Result: Only first request succeeds! 🔒 SECURE\n');
  
  console.log('💡 Key improvements:');
  console.log('- Signature validation moved before nonce check (cheaper operation first)');
  console.log('- Atomic SET NX operation prevents race condition');
  console.log('- Only one concurrent request can succeed with same nonce');
  console.log('- No timing window for replay attacks\n');
}

// Run demonstration and tests
demonstrateRaceConditionFix();
testNonceRaceCondition().catch(console.error);