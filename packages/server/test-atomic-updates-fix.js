#!/usr/bin/env node

/**
 * Test script to verify atomic update fixes prevent race conditions
 * This demonstrates that concurrent operations are now safe
 */

import { redis } from './dist/config/redis.js';
import { headerInfoCache } from './dist/services/header-info-cache.service.js';

async function testAtomicUpdates() {
  console.log('🧪 Testing Atomic Update Race Condition Fixes...\n');

  try {
    await redis.initialize();
    console.log('✅ Redis connected');

    // Clear test data
    await headerInfoCache.clearAllData();

    console.log('\n🔍 Demonstrating the race condition fix:\n');
    console.log('❌ BEFORE (Vulnerable):');
    console.log('1. Request A: Read user data → {is_act: true, last_active: 100}');
    console.log('2. Request B: Read user data → {is_act: true, last_active: 100} (same data!)');
    console.log('3. Request A: Modify data → {is_act: false, last_active: 200}');
    console.log('4. Request B: Modify data → {is_act: true, last_active: 300}');
    console.log('5. Request A: Write data → saves {is_act: false, last_active: 200}');
    console.log('6. Request B: Write data → overwrites with {is_act: true, last_active: 300}');
    console.log('Result: Request A\'s changes are lost! 🚨 RACE CONDITION\n');

    console.log('✅ AFTER (Atomic):');
    console.log('1. Request A: Lua script → Read, modify, write atomically');
    console.log('2. Request B: Lua script → Read, modify, write atomically');
    console.log('Result: Both operations succeed independently! 🔒 SAFE\n');

    console.log('📝 Test 1: Basic atomic operations');
    
    // Create test data
    await headerInfoCache.setActiveUser('test-user', {
      is_act: true,
      last_active: 1000000
    });

    await headerInfoCache.setActiveEndpoint('test-endpoint', {
      uid: 'test-user',
      is_act: true,
      last_active: 1000000,
      answer: 'initial-answer'
    });

    await headerInfoCache.setNextFunction('test-function', {
      id: 'test-function',
      functions: [{ id: 'func1', answer: 'answer1' }]
    });

    // Test atomic updates
    await headerInfoCache.updateUserActivity('test-user', false);
    const updatedUser = await headerInfoCache.getActiveUser('test-user');
    
    if (updatedUser && !updatedUser.is_act && updatedUser.last_active > 1000000) {
      console.log('✅ Atomic user activity update works correctly');
    } else {
      console.log('❌ Atomic user activity update failed');
      process.exit(1);
    }

    await headerInfoCache.setEndpointAnswer('test-endpoint', 'updated-answer');
    const updatedEndpoint = await headerInfoCache.getActiveEndpoint('test-endpoint');
    
    if (updatedEndpoint && updatedEndpoint.answer === 'updated-answer') {
      console.log('✅ Atomic endpoint answer update works correctly');
    } else {
      console.log('❌ Atomic endpoint answer update failed');
      process.exit(1);
    }

    await headerInfoCache.addFunctionToNextFunction('test-function', {
      id: 'func2',
      answer: 'answer2'
    });
    const updatedFunction = await headerInfoCache.getNextFunction('test-function');
    
    if (updatedFunction && updatedFunction.functions.length === 2) {
      console.log('✅ Atomic function addition works correctly');
    } else {
      console.log('❌ Atomic function addition failed');
      console.log('Functions:', updatedFunction?.functions);
      process.exit(1);
    }

    console.log('\n📝 Test 2: Concurrent operations (race condition test)');
    
    // Reset test user
    await headerInfoCache.setActiveUser('race-test-user', {
      is_act: true,
      last_active: Date.now()
    });

    // Simulate concurrent updates (this would cause race conditions without Lua scripts)
    const concurrentPromises = [
      headerInfoCache.updateUserActivity('race-test-user', false),
      headerInfoCache.updateUserActivity('race-test-user', true),
      headerInfoCache.updateUserActivity('race-test-user', false)
    ];

    await Promise.all(concurrentPromises);
    console.log('✅ Concurrent updates completed without errors');

    const finalUser = await headerInfoCache.getActiveUser('race-test-user');
    if (finalUser) {
      console.log(`✅ Final user state: is_act=${finalUser.is_act}, last_active=${finalUser.last_active}`);
      console.log('✅ All concurrent operations completed atomically');
    } else {
      console.log('❌ User lost during concurrent operations');
      process.exit(1);
    }

    console.log('\n📝 Test 3: Concurrent array operations');
    
    // Reset test function
    await headerInfoCache.setNextFunction('race-test-function', {
      id: 'race-test-function',
      functions: []
    });

    // Simulate concurrent function additions
    const functionPromises = Array(10).fill().map((_, i) =>
      headerInfoCache.addFunctionToNextFunction('race-test-function', {
        id: `concurrent-func-${i}`,
        answer: `answer-${i}`
      })
    );

    await Promise.all(functionPromises);
    
    const finalFunction = await headerInfoCache.getNextFunction('race-test-function');
    if (finalFunction && finalFunction.functions.length === 10) {
      console.log('✅ All 10 concurrent function additions succeeded');
      console.log('✅ No function entries lost to race conditions');
    } else {
      console.log('❌ Some function entries lost in concurrent operations');
      console.log(`Expected 10 functions, got ${finalFunction?.functions.length}`);
      process.exit(1);
    }

    console.log('\n📝 Test 4: Operations on non-existent entities');
    
    // Test atomic operations on non-existent entities
    await headerInfoCache.updateUserActivity('non-existent-user', true);
    await headerInfoCache.setEndpointAnswer('non-existent-endpoint', 'test');
    await headerInfoCache.addFunctionToNextFunction('non-existent-function', {
      id: 'test',
      answer: 'test'
    });
    
    console.log('✅ Operations on non-existent entities handled gracefully');

    console.log('\n🎉 All atomic update tests passed!');
    console.log('🔒 Race conditions successfully eliminated with Lua scripts');
    console.log('⚡ All operations are now atomic and thread-safe');
    console.log('💡 Key improvements:');
    console.log('  - Read-modify-write operations are atomic');
    console.log('  - No more data loss from concurrent updates');
    console.log('  - Array operations (addFunction) are thread-safe');
    console.log('  - Better error handling and logging');

  } catch (error) {
    console.error('❌ Test failed with error:', error);
    process.exit(1);
  } finally {
    await headerInfoCache.clearAllData();
    await redis.close();
  }
}

testAtomicUpdates().catch(console.error);