#!/usr/bin/env node

import { uuid } from '@pzero/shared/uuid';
import Redis from 'ioredis';

// Redis connection configuration
const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = process.env.REDIS_PORT || 6379;

// Extract password from REDIS_URL if present, or use REDIS_PASSWORD env var
let REDIS_PASSWORD = process.env.REDIS_PASSWORD;
if (!REDIS_PASSWORD && process.env.REDIS_URL) {
  // Extract password from redis://:password@host:port or redis://username:password@host:port
  const match = process.env.REDIS_URL.match(/redis:\/\/(?:[^:]*:)?([^@]*)@/);
  if (match && match[1]) {
    REDIS_PASSWORD = match[1];
  }
}

// Create Redis client with lazy connection
const redis = new Redis({
  host: REDIS_HOST,
  port: REDIS_PORT,
  password: REDIS_PASSWORD,
  lazyConnect: true,
  retryStrategy: (times) => {
    if (times > 3) {
      console.error('Redis connection failed after 3 retries');
      return null;
    }
    return Math.min(times * 200, 2000);
  },
});

// Handle Redis connection errors
redis.on('error', (err) => {
  console.error('Redis connection error:', err.message);
  process.exit(1);
});

// Connect to Redis
try {
  await redis.connect();
  console.log('Connected to Redis');
} catch (error) {
  console.error('Failed to connect to Redis:', error.message);
  process.exit(1);
}

// Helper function to generate timestamps
const now = () => Date.now();
const minutesAgo = (min) => Date.now() - min * 60000;


// Get session TTL from environment (in days), default to 30 days
const SESSION_TTL = (process.env.SESSION_TTL_DAYS ? parseInt(process.env.SESSION_TTL_DAYS, 10) : 30) * 24 * 60 * 60;

// Get filter registry TTL from environment (in hours), default to 24 hours
const FILTER_REGISTRY_TTL = (process.env.FILTER_REGISTRY_TTL_HOURS ? parseInt(process.env.FILTER_REGISTRY_TTL_HOURS, 10) : 24) * 60 * 60;

try {
  // Clear existing test data first
  console.log('\n0. Clearing existing test data...');
  
  // Use SCAN instead of KEYS for production safety
  const keysToDelete = [];
  let cursor = '0';
  do {
    const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', 'filter:sessions:*', 'COUNT', 100);
    cursor = nextCursor;
    keysToDelete.push(...keys);
  } while (cursor !== '0');
  
  if (keysToDelete.length > 0) {
    // Delete in batches to avoid blocking Redis
    const batchSize = 100;
    for (let i = 0; i < keysToDelete.length; i += batchSize) {
      const batch = keysToDelete.slice(i, i + batchSize);
      await redis.del(...batch);
    }
    console.log(`  Cleared ${keysToDelete.length} existing keys`);
  } else {
    console.log(`  No existing keys found to clear`);
  }

  // 1. FILTER SESSIONS - New session management structure
  console.log('\n1. Creating filter sessions...');
  
  const sessions = [
    {
      sid: uuid(),
      uid: 'user_001',
      email: 'alice@example.com',
      name: 'Alice Johnson',
      c_at: minutesAgo(30),
      last_seen: minutesAgo(2),
      data: {
        meta: {
          source: 'wasm_filter',
          ip: '192.168.1.100',
          user_agent: 'Mozilla/5.0'
        }
      }
    },
    {
      sid: uuid(),
      uid: 'user_002',
      email: 'bob@example.com',
      name: 'Bob Smith',
      c_at: minutesAgo(120),
      last_seen: minutesAgo(45),
      data: {
        meta: {
          source: 'wasm_filter',
          ip: '192.168.1.101',
          user_agent: 'Chrome/120.0'
        }
      }
    },
    {
      sid: uuid(),
      uid: 'user_003',
      email: 'charlie@example.com',
      name: 'Charlie Davis',
      c_at: minutesAgo(5),
      last_seen: now(),
      data: {
        meta: {
          source: 'wasm_filter',
          ip: '192.168.1.102',
          user_agent: 'Safari/17.0'
        }
      }
    },
  ];

  // Store session data
  for (const session of sessions) {
    const sessionKey = `filter:sessions:data:${session.sid}`;
    
    // Store session data (only stringify complex objects, not primitives)
    await redis.hset(sessionKey,
      'uid', session.uid,
      'email', session.email,
      'name', session.name,
      'sid', session.sid,
      'c_at', session.c_at.toString(),
      'last_seen', session.last_seen.toString(),
      'data', JSON.stringify(session.data)  // Complex object needs JSON serialization
    );
    await redis.expire(sessionKey, SESSION_TTL);
    
    // Add to user's session set
    const userSessionKey = `filter:sessions:user:${session.uid}`;
    await redis.sadd(userSessionKey, session.sid);
    await redis.expire(userSessionKey, SESSION_TTL);
    
    console.log(`  Created session: ${session.sid} for user: ${session.uid}`);
  }

  // 2. ACTIVE SESSIONS HASH
  console.log('\n2. Creating active sessions hash...');
  
  const activeSessions = {};
  for (const session of sessions) {
    activeSessions[session.sid] = JSON.stringify({
      uid: session.uid,
      email: session.email,
      c_at: session.c_at
    });
  }
  
  await redis.hset('filter:sessions:active', activeSessions);
  await redis.expire('filter:sessions:active', SESSION_TTL);
  console.log(`  Created active sessions hash with ${sessions.length} entries`);

  // 3. NEXT_FUNCS for sessions
  console.log('\n3. Creating next_funcs for sessions...');
  
  const sessionFuncs = [
    {
      sid: sessions[0].sid,
      funcs: {
        validateEmail: {
          status: 'completed',
          result: 'valid',
          completedAt: minutesAgo(25)
        },
        verifyPhone: {
          status: 'pending',
          attempts: 2,
          lastAttempt: minutesAgo(5)
        }
      }
    },
    {
      sid: sessions[1].sid,
      funcs: {
        completeProfile: {
          status: 'completed',
          fields: ['name', 'bio', 'avatar'],
          completedAt: minutesAgo(100)
        }
      }
    },
    {
      sid: sessions[2].sid,
      funcs: {
        setupMFA: {
          status: 'in_progress',
          method: 'authenticator',
          backupCodes: 5
        },
        acceptTerms: {
          status: 'pending'
        }
      }
    }
  ];

  for (const sf of sessionFuncs) {
    const funcsKey = `filter:sessions:next_funcs:${sf.sid}`;
    const funcsData = {};
    
    for (const [funcName, funcData] of Object.entries(sf.funcs)) {
      funcsData[funcName] = JSON.stringify(funcData);
    }
    
    await redis.hset(funcsKey, funcsData);
    await redis.expire(funcsKey, SESSION_TTL);
    console.log(`  Created next_funcs for session: ${sf.sid}`);
  }

  // 4. FILTER HEADER INFO - Central header information
  console.log('\n4. Creating filter header info...');
  
  const headerInfo = {
    users: JSON.stringify({
      'user_001': {
        email: 'alice@example.com',
        name: 'Alice Johnson',
        sid: sessions[0].sid,
        last_seen: minutesAgo(2)
      },
      'user_002': {
        email: 'bob@example.com',
        name: 'Bob Smith',
        sid: sessions[1].sid,
        last_seen: minutesAgo(45)
      },
      'user_003': {
        email: 'charlie@example.com',
        name: 'Charlie Davis',
        sid: sessions[2].sid,
        last_seen: now()
      }
    }),
    endpoints: JSON.stringify({
      '/api/v1/users': { status: 'active', method: 'GET' },
      '/api/v1/auth/login': { status: 'active', method: 'POST' },
      '/api/v1/products': { status: 'active', method: 'GET,POST' }
    }),
    functions: JSON.stringify({
      [sessions[0].sid]: sessionFuncs[0].funcs,
      [sessions[1].sid]: sessionFuncs[1].funcs,
      [sessions[2].sid]: sessionFuncs[2].funcs
    })
  };
  
  await redis.hset('filter:header:info', headerInfo);
  console.log('  Created filter header info');

  // 5. FILTER REGISTRY - Registered WASM filters
  console.log('\n5. Creating filter registry...');
  
  const filters = [
    {
      filterId: 'filter_001',
      envoyNodeId: 'envoy_node_1',
      registeredAt: minutesAgo(60),
      lastHeartbeat: minutesAgo(1),
      status: 'active'
    },
    {
      filterId: 'filter_002',
      envoyNodeId: 'envoy_node_2',
      registeredAt: minutesAgo(30),
      lastHeartbeat: now(),
      status: 'active'
    }
  ];
  
  const filterRegistry = {};
  for (const filter of filters) {
    filterRegistry[filter.filterId] = JSON.stringify(filter);
    
    // Add heartbeat
    const heartbeatKey = `filter:heartbeat:${filter.filterId}`;
    await redis.set(heartbeatKey, JSON.stringify({
      timestamp: filter.lastHeartbeat,
      metrics: {
        requests_processed: Math.floor(Math.random() * 1000),
        avg_response_time: Math.floor(Math.random() * 500)
      }
    }), 'EX', 60); // 1 minute TTL
  }
  
  await redis.hset('filter:registry', filterRegistry);
  await redis.expire('filter:registry', FILTER_REGISTRY_TTL);
  console.log(`  Created filter registry with ${filters.length} filters (TTL: ${FILTER_REGISTRY_TTL / 3600}h)`);

  // 6. USER STATUS - Required for WASM filter validation
  console.log('\n6. Creating user status keys...');
  
  const userStatuses = [
    { userId: 'user_001', status: 'ACTIVE' },
    { userId: 'user_002', status: 'ACTIVE' }, 
    { userId: 'user_003', status: 'INACTIVE' },
    { userId: '1', status: 'ACTIVE' }, // Common user ID from JWT tokens
  ];
  
  for (const user of userStatuses) {
    const statusKey = `status:${user.userId}`;
    await redis.set(statusKey, user.status);
    // Set TTL to match session TTL
    await redis.expire(statusKey, SESSION_TTL);
    console.log(`  Set user status: ${user.userId} = ${user.status}`);
  }
  
  // 7. SAMPLE CHALLENGE DATA - For WASM filter testing
  console.log('\n7. Creating sample challenge data...');
  
  const challenges = [
    { id: '1', answer: '1' },
    { id: 'test123', answer: 'answer123' },
    { id: 'challenge_001', answer: 'correct_answer_1' },
    { id: 'challenge_002', answer: 'correct_answer_2' },
  ];
  
  for (const challenge of challenges) {
    const challengeKey = `challenge:${challenge.id}`;
    await redis.set(challengeKey, challenge.answer);
    // No TTL - challenges persist indefinitely for testing
    // await redis.expire(challengeKey, 300);  // Commented out - was 5 minutes
    console.log(`  Set challenge: ${challenge.id} = ${challenge.answer} (no expiry)`);
  }

  // Display summary
  console.log('\n=== Redis Initialization Complete ===');
  console.log(`Sessions Created: ${sessions.length}`);
  console.log(`Next Functions: ${sessionFuncs.length}`);
  console.log(`Registered Filters: ${filters.length}`);
  console.log(`User Statuses: ${userStatuses.length}`);
  console.log(`Challenge Data: ${challenges.length}`);
  console.log(`Session TTL: ${SESSION_TTL} seconds (${SESSION_TTL / 86400} days)`);
  console.log(`Filter Registry TTL: ${FILTER_REGISTRY_TTL} seconds (${FILTER_REGISTRY_TTL / 3600} hours)`);
  
  // Show sample queries
  console.log('\n=== Sample Redis Commands ===');
  console.log('\n-- Session Management --');
  console.log(`Get session data: HGETALL filter:sessions:data:${sessions[0].sid}`);
  console.log(`Get user sessions: SMEMBERS filter:sessions:user:user_001`);
  console.log(`Get active sessions: HGETALL filter:sessions:active`);
  console.log(`Get session functions: HGETALL filter:sessions:next_funcs:${sessions[0].sid}`);
  
  console.log('\n-- Filter Management --');
  console.log('Get header info: HGETALL filter:header:info');
  console.log('Get filter registry: HGETALL filter:registry');
  console.log('Get filter heartbeat: GET filter:heartbeat:filter_001');
  
  console.log('\n-- WASM Filter Data --');
  console.log('Get user status: GET status:user_001');
  console.log('Get challenge answer: GET challenge:1');
  console.log('Check if user is active: GET status:1');
  
  console.log('\n-- Pattern Searches --');
  console.log('Find all sessions: SCAN 0 MATCH filter:sessions:data:* COUNT 100');
  console.log('Find user sessions: SCAN 0 MATCH filter:sessions:user:* COUNT 100');
  console.log('Find user statuses: SCAN 0 MATCH status:* COUNT 100');
  console.log('Find challenges: SCAN 0 MATCH challenge:* COUNT 100');

} catch (error) {
  console.error('Error initializing Redis:', error);
  process.exit(1);
} finally {
  await redis.quit();
  console.log('\nDisconnected from Redis');
}