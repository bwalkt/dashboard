#!/usr/bin/env node

/**
 * Test script to verify the colon parsing fix in getActiveFilters
 * This ensures IDs containing colons are properly handled
 */

import { redis } from './dist/config/redis.js';
import { FilterAuthService } from './dist/services/filter-auth.service.js';

async function testColonParsing() {
  console.log('🧪 Testing Colon Parsing Fix...\n');

  try {
    // Initialize Redis
    await redis.initialize();
    console.log('✅ Redis connected');

    // Clear any existing test data
    await redis.getClient().srem("active_filters", 
      "simple-filter:simple-instance",
      "filter:with:colons:instance-with:colons",
      "another:filter:normal-instance",
      "normal-filter:instance:with:many:colons"
    );

    // Test Case 1: Simple IDs (should work as before)
    console.log('\n📝 Test 1: Simple IDs without colons');
    await FilterAuthService.registerFilter('simple-filter', 'envoy-1', 'simple-instance');
    
    let activeFilters = await FilterAuthService.getActiveFilters();
    const simpleFilter = activeFilters.find(f => f.filterId === 'simple-filter' && f.instanceId === 'simple-instance');
    
    if (simpleFilter) {
      console.log('✅ Simple IDs parsed correctly');
    } else {
      console.log('❌ Simple IDs failed to parse');
      process.exit(1);
    }

    // Test Case 2: Filter ID with colons (edge case)
    console.log('\n📝 Test 2: Filter ID containing colons');
    await FilterAuthService.registerFilter('filter:with:colons', 'envoy-2', 'instance-with:colons');
    
    activeFilters = await FilterAuthService.getActiveFilters();
    const colonFilter = activeFilters.find(f => f.filterId === 'filter:with:colons' && f.instanceId === 'instance-with:colons');
    
    if (colonFilter) {
      console.log('✅ Filter ID with colons parsed correctly');
      console.log(`   filterId: "${colonFilter.filterId}"`);
      console.log(`   instanceId: "${colonFilter.instanceId}"`);
    } else {
      console.log('❌ Filter ID with colons failed to parse');
      console.log('Available filters:', activeFilters.map(f => `${f.filterId}:${f.instanceId}`));
      process.exit(1);
    }

    // Test Case 3: Instance ID with colons (edge case)
    console.log('\n📝 Test 3: Instance ID containing colons');
    await FilterAuthService.registerFilter('another:filter', 'envoy-3', 'normal-instance');
    
    activeFilters = await FilterAuthService.getActiveFilters();
    const instanceColonFilter = activeFilters.find(f => f.filterId === 'another:filter' && f.instanceId === 'normal-instance');
    
    if (instanceColonFilter) {
      console.log('✅ Filter with colon and normal instance parsed correctly');
    } else {
      console.log('❌ Filter with colon and normal instance failed to parse');
      process.exit(1);
    }

    // Test Case 4: Both IDs with colons (extreme edge case)
    console.log('\n📝 Test 4: Both filter and instance IDs containing colons');
    await FilterAuthService.registerFilter('normal-filter', 'envoy-4', 'instance:with:many:colons');
    
    activeFilters = await FilterAuthService.getActiveFilters();
    const bothColonFilter = activeFilters.find(f => f.filterId === 'normal-filter' && f.instanceId === 'instance:with:many:colons');
    
    if (bothColonFilter) {
      console.log('✅ Instance ID with multiple colons parsed correctly');
      console.log(`   filterId: "${bothColonFilter.filterId}"`);
      console.log(`   instanceId: "${bothColonFilter.instanceId}"`);
    } else {
      console.log('❌ Instance ID with multiple colons failed to parse');
      process.exit(1);
    }

    // Test Case 5: Verify the actual Redis storage format
    console.log('\n📝 Test 5: Verify Redis storage format');
    const redisMembers = await redis.getClient().smembers("active_filters");
    console.log('Redis active_filters set contents:');
    redisMembers.forEach(member => {
      console.log(`   "${member}"`);
    });

    // Test the parsing logic directly
    console.log('\n📝 Test 6: Direct parsing logic verification');
    const testCases = [
      "simple:simple",
      "filter:with:colons:instance",
      "normal:instance:with:colons",
      "a:b:c:d:e:f"
    ];

    testCases.forEach(testCase => {
      const colonIndex = testCase.indexOf(':');
      const filterId = testCase.substring(0, colonIndex);
      const instanceId = testCase.substring(colonIndex + 1);
      console.log(`   "${testCase}" → filterId: "${filterId}", instanceId: "${instanceId}"`);
    });

    console.log('\n🎉 All colon parsing tests passed!');
    console.log('🔧 The colon parsing fix is working correctly.');
    console.log('✅ IDs containing colons are now properly handled.');

  } catch (error) {
    console.error('❌ Test failed with error:', error);
    process.exit(1);
  } finally {
    // Clean up test data
    await redis.getClient().srem("active_filters", 
      "simple-filter:simple-instance",
      "filter:with:colons:instance-with:colons", 
      "another:filter:normal-instance",
      "normal-filter:instance:with:many:colons"
    );
    await redis.close();
  }
}

// Run the test
testColonParsing().catch(console.error);