#!/usr/bin/env node

/**
 * Test script for Redis communication between server and envoy-wasm-filter
 * Run this to verify the Redis data structures are working correctly
 */

import { redis } from './dist/config/redis.js';
import { filterRedisService } from './dist/services/filter-redis.service.js';
import { headerInfoCache } from './dist/services/header-info-cache.service.js';

async function testRedisComms() {
  console.log('🧪 Testing Redis Communication System...\n');
  let exitCode = 0;

  try {
    // Initialize Redis
    await redis.initialize();
    console.log('✅ Redis connected successfully');

    // Test 1: Register a filter
    console.log('\n📝 Test 1: Filter Registration');
    await filterRedisService.registerFilter('test-filter-1', 'envoy-node-123');
    const stats = await filterRedisService.getFilterStats();
    console.log('✅ Filter registered:', stats);

    // Test 2: Set header info
    console.log('\n📝 Test 2: Header Info Management');
    
    // Add some test users
    await headerInfoCache.setActiveUser('user123', {
      is_act: true,
      last_active: Date.now()
    });
    
    await headerInfoCache.setActiveUser('user456', {
      is_act: false,
      last_active: Date.now() - 60000 // 1 minute ago
    });

    // Add test endpoints
    const endpointId1 = 'user123-endpoint-' + Date.now();
    await headerInfoCache.setActiveEndpoint(endpointId1, {
      uid: 'user123',
      is_act: true,
      last_active: Date.now(),
      answer: 'test-answer'
    });

    // Sync to Redis
    await filterRedisService.syncHeaderInfoFromCache();
    console.log('✅ Header info synced to Redis');

    // Test 3: Verify Redis data structure
    console.log('\n📝 Test 3: Redis Data Verification');
    const headerInfo = await filterRedisService.getHeaderInfo();
    
    console.log('Active Users:', Object.keys(headerInfo.active_users).length);
    console.log('Active Endpoints:', Object.keys(headerInfo.active_endpoints).length);
    console.log('Next Functions:', Object.keys(headerInfo.next_functions).length);

    // Test 4: Challenge validation queue
    console.log('\n📝 Test 4: Challenge Validation');
    const requestId = 'test-request-' + Date.now();
    await filterRedisService.queueChallengeValidation(
      requestId,
      'test-filter-1',
      'challenge123',
      'answer123'
    );
    
    // Wait a bit and check result
    await new Promise(resolve => setTimeout(resolve, 1000));
    const result = await filterRedisService.getChallengeResult(requestId);
    console.log('✅ Challenge validation result:', result);

    // Test 5: Rate limiting
    console.log('\n📝 Test 5: Rate Limiting');
    let rateLimitTests = [];
    for (let i = 0; i < 5; i++) {
      rateLimitTests.push(filterRedisService.checkRateLimit('test-filter-1'));
    }
    const rateLimitResults = await Promise.all(rateLimitTests);
    console.log('✅ Rate limit results (first 5):', rateLimitResults);

    // Test 6: Heartbeat
    console.log('\n📝 Test 6: Heartbeat');
    await filterRedisService.updateHeartbeat('test-filter-1', {
      requestsProcessed: 100,
      errorRate: 0.01,
      avgResponseTime: 50
    });
    console.log('✅ Heartbeat sent');

    // Test 7: Verify data can be read by filter format
    console.log('\n📝 Test 7: Filter Data Access Simulation');
    
    // Simulate what the filter would read
    const usersData = await redis.getClient().hget('filter:header:info', 'users');
    const endpointsData = await redis.getClient().hget('filter:header:info', 'endpoints');
    const functionsData = await redis.getClient().hget('filter:header:info', 'functions');

    console.log('✅ Filter readable data:');
    console.log('  Users JSON length:', usersData ? usersData.length : 0);
    console.log('  Endpoints JSON length:', endpointsData ? endpointsData.length : 0);
    console.log('  Functions JSON length:', functionsData ? functionsData.length : 0);

    // Test 8: Cleanup test data
    console.log('\n📝 Test 8: Cleanup');
    // Remove test filter from registry
    await redis.getClient().hdel('filter:registry', 'test-filter-1');
    await headerInfoCache.clearAllData();
    await redis.getClient().del('filter:header:info');
    console.log('✅ Test data cleaned up');

    console.log('\n🎉 All Redis communication tests passed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    exitCode = 1;
  } finally {
    await redis.close();
    process.exit(exitCode);
  }
}

// Run tests
testRedisComms().catch(console.error);