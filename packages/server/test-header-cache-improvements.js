#!/usr/bin/env node

/**
 * Test script to verify header-info-cache service improvements
 * This tests JSON.parse error handling and silent failure logging
 */

import { redis } from './dist/config/redis.js';
import { headerInfoCache } from './dist/services/header-info-cache.service.js';

async function testHeaderCacheImprovements() {
  console.log('🧪 Testing Header Info Cache Service Improvements...\n');

  try {
    await redis.initialize();
    console.log('✅ Redis connected');

    // Clear test data
    await headerInfoCache.clearAllData();

    console.log('\n📝 Test 1: JSON.parse error handling (malformed data)');
    
    // Manually insert malformed JSON data to test error handling
    const malformedJson = '{"uid":"test-user","is_act":true,"incomplete';
    await redis.getClient().hset('active_users', 'test-malformed', malformedJson);
    
    // This should handle the malformed JSON gracefully
    const malformedUser = await headerInfoCache.getActiveUser('test-malformed');
    if (malformedUser === null) {
      console.log('✅ Malformed JSON handled gracefully, returned null');
    } else {
      console.log('❌ Malformed JSON should have returned null');
      process.exit(1);
    }
    
    // Test getAllActiveUsers with malformed data
    const allUsers = await headerInfoCache.getAllActiveUsers();
    if (Object.keys(allUsers).length === 0) {
      console.log('✅ getAllActiveUsers skipped malformed entries correctly');
    } else {
      console.log('❌ getAllActiveUsers should have skipped malformed entry');
    }

    console.log('\n📝 Test 2: Silent failure logging');
    
    // Capture console output to verify logging
    const originalWarn = console.warn;
    let warnLogs = [];
    console.warn = (...args) => {
      warnLogs.push(args.join(' '));
      originalWarn(...args);
    };

    // Test operations on non-existent entities (should log warnings)
    await headerInfoCache.updateUserActivity('non-existent-user', true);
    await headerInfoCache.updateEndpointActivity('non-existent-endpoint', false);
    await headerInfoCache.setEndpointAnswer('non-existent-endpoint', 'test-answer');
    await headerInfoCache.setEndpointNextFunction('non-existent-endpoint', 'test-function');
    await headerInfoCache.addFunctionToNextFunction('non-existent-function', { id: 'test', answer: 'test' });

    // Restore console.warn
    console.warn = originalWarn;

    // Verify warnings were logged
    const expectedWarnings = [
      'updateUserActivity: User non-existent-user not found',
      'updateEndpointActivity: Endpoint non-existent-endpoint not found', 
      'setEndpointAnswer: Endpoint non-existent-endpoint not found',
      'setEndpointNextFunction: Endpoint non-existent-endpoint not found',
      'addFunctionToNextFunction: Function non-existent-function not found'
    ];

    let allWarningsFound = true;
    expectedWarnings.forEach(expectedWarning => {
      const found = warnLogs.some(log => log.includes(expectedWarning));
      if (found) {
        console.log(`✅ Warning logged: "${expectedWarning}"`);
      } else {
        console.log(`❌ Missing warning: "${expectedWarning}"`);
        allWarningsFound = false;
      }
    });

    if (allWarningsFound) {
      console.log('✅ All silent failures now properly logged');
    } else {
      console.log('❌ Some silent failures not logged properly');
      console.log('Actual logs:', warnLogs);
      process.exit(1);
    }

    console.log('\n📝 Test 3: Normal operations still work');
    
    // Test normal operations to ensure they still work
    await headerInfoCache.setActiveUser('test-user', { is_act: true, last_active: Date.now() });
    const user = await headerInfoCache.getActiveUser('test-user');
    
    if (user && user.uid === 'test-user') {
      console.log('✅ Normal user operations work correctly');
    } else {
      console.log('❌ Normal user operations broken');
      process.exit(1);
    }

    // Test update operations on existing data
    await headerInfoCache.updateUserActivity('test-user', false);
    const updatedUser = await headerInfoCache.getActiveUser('test-user');
    
    if (updatedUser && !updatedUser.is_act) {
      console.log('✅ User activity updates work correctly');
    } else {
      console.log('❌ User activity updates broken');
      process.exit(1);
    }

    console.log('\n🎉 All header info cache improvements working correctly!');
    console.log('🔧 JSON.parse errors handled gracefully');
    console.log('📝 Silent failures now logged for debugging');
    console.log('✅ Normal operations unchanged');

  } catch (error) {
    console.error('❌ Test failed with error:', error);
    process.exit(1);
  } finally {
    // Clean up
    await headerInfoCache.clearAllData();
    await redis.close();
  }
}

testHeaderCacheImprovements().catch(console.error);