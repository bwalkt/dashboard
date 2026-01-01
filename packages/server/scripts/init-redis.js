#!/usr/bin/env node

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
const now = () => new Date().toISOString();
const minutesAgo = (min) => new Date(Date.now() - min * 60000).toISOString();

try {
  // 1. ACTIVE_SESSIONS - Hash structure with user_id as key
  // Pattern: active_sessions:<user_id>
  console.log('\n1. Creating active_sessions...');
  
  const sessions = [
    {
      id: 'user_001',
      data: {
        last_login: minutesAgo(30),
        last_seen: minutesAgo(2),
        is_active: true,
      },
    },
    {
      id: 'user_002',
      data: {
        last_login: minutesAgo(120),
        last_seen: minutesAgo(45),
        is_active: false,
      },
    },
    {
      id: 'user_003',
      data: {
        last_login: minutesAgo(5),
        last_seen: now(),
        is_active: true,
      },
    },
  ];

  for (const session of sessions) {
    const key = `active_sessions:${session.id}`;
    await redis.hset(key,
      'id', session.id,
      'last_login', session.data.last_login,
      'last_seen', session.data.last_seen,
      'is_active', session.data.is_active.toString(),
    );
    // Set expiry for inactive sessions (24 hours)
    if (!session.data.is_active) {
      await redis.expire(key, 86400);
    }
    console.log(`  Created: ${key}`);
  }

  // 2. NEXT_FUNCS - Hash structure with uid+seq_no as composite key
  // Pattern: next_funcs:<uid>:<seq_no>
  console.log('\n2. Creating next_funcs...');
  
  const funcs = [
    {
      uid: 'user_001',
      seq_no: 1,
      func: 'validateEmail',
      ans: 'email@example.com',
      solved: true,
      solved_at: minutesAgo(25),
      status: 'completed',
      data: JSON.stringify({ attempts: 1, score: 100 }),
    },
    {
      uid: 'user_001',
      seq_no: 2,
      func: 'verifyPhone',
      ans: '+1234567890',
      solved: false,
      solved_at: null,
      status: 'pending',
      data: JSON.stringify({ attempts: 2, lastAttempt: minutesAgo(5) }),
    },
    {
      uid: 'user_002',
      seq_no: 1,
      func: 'completeProfile',
      ans: 'profile_data',
      solved: true,
      solved_at: minutesAgo(100),
      status: 'completed',
      data: JSON.stringify({ fields: ['name', 'bio', 'avatar'] }),
    },
    {
      uid: 'user_003',
      seq_no: 1,
      func: 'setupMFA',
      ans: 'TOTP_SECRET',
      solved: false,
      solved_at: null,
      status: 'in_progress',
      data: JSON.stringify({ method: 'authenticator', backupCodes: 5 }),
    },
  ];

  for (const func of funcs) {
    const key = `next_funcs:${func.uid}:${func.seq_no}`;
    const data = {
      uid: func.uid,
      seq_no: func.seq_no.toString(),
      func: func.func,
      ans: func.ans,
      solved: func.solved.toString(),
      status: func.status,
      data: func.data,
    };
    
    if (func.solved_at) {
      data.solved_at = func.solved_at;
    }
    
    await redis.hset(key, data);
    // Set TTL for completed items (7 days)
    if (func.solved) {
      await redis.expire(key, 604800);
    }
    console.log(`  Created: ${key}`);
  }

  // 3. ACTIVE_ENDPOINTS - Hash structure with endpoint id as key
  // Pattern: active_endpoints:<id>
  console.log('\n3. Creating active_endpoints...');
  
  const endpoints = [
    {
      id: 'endpoint_001',
      uid: 'user_001',
      last_seen: minutesAgo(1),
      status: 'healthy',
      data: JSON.stringify({
        url: '/api/v1/users',
        method: 'GET',
        response_time: 145,
        requests_per_min: 12,
      }),
    },
    {
      id: 'endpoint_002',
      uid: 'user_001',
      last_seen: minutesAgo(3),
      status: 'slow',
      data: JSON.stringify({
        url: '/api/v1/products',
        method: 'POST',
        response_time: 2500,
        requests_per_min: 3,
      }),
    },
    {
      id: 'endpoint_003',
      uid: 'user_002',
      last_seen: minutesAgo(60),
      status: 'down',
      data: JSON.stringify({
        url: '/api/v1/orders',
        method: 'GET',
        response_time: null,
        error: 'Connection timeout',
        requests_per_min: 0,
      }),
    },
    {
      id: 'endpoint_004',
      uid: 'user_003',
      last_seen: now(),
      status: 'healthy',
      data: JSON.stringify({
        url: '/api/v1/auth/login',
        method: 'POST',
        response_time: 89,
        requests_per_min: 45,
      }),
    },
  ];

  for (const endpoint of endpoints) {
    const key = `active_endpoints:${endpoint.id}`;
    await redis.hset(key,
      'id', endpoint.id,
      'uid', endpoint.uid,
      'last_seen', endpoint.last_seen,
      'status', endpoint.status,
      'data', endpoint.data,
    );
    // Set shorter TTL for down endpoints (1 hour)
    if (endpoint.status === 'down') {
      await redis.expire(key, 3600);
    }
    console.log(`  Created: ${key}`);
  }

  // Create indexes for faster lookups
  console.log('\n4. Creating indexes...');
  
  // Index for user sessions
  for (const session of sessions) {
    await redis.sadd('active_sessions:index', session.id);
  }
  console.log('  Created: active_sessions:index');

  // Index for user functions
  for (const func of funcs) {
    await redis.sadd(`next_funcs:user:${func.uid}`, `${func.uid}:${func.seq_no}`);
  }
  console.log('  Created: next_funcs:user:<uid> indexes');

  // Index for user endpoints
  for (const endpoint of endpoints) {
    await redis.sadd(`active_endpoints:user:${endpoint.uid}`, endpoint.id);
  }
  console.log('  Created: active_endpoints:user:<uid> indexes');

  // Display summary
  console.log('\n=== Redis Initialization Complete ===');
  console.log(`Active Sessions: ${sessions.length}`);
  console.log(`Next Functions: ${funcs.length}`);
  console.log(`Active Endpoints: ${endpoints.length}`);
  
  // Show sample queries
  console.log('\n=== Sample Redis Commands ===');
  console.log('Get a session: HGETALL active_sessions:user_001');
  console.log('Get all sessions: KEYS active_sessions:*');
  console.log('Get user functions: SMEMBERS next_funcs:user:user_001');
  console.log('Get function details: HGETALL next_funcs:user_001:1');
  console.log('Get user endpoints: SMEMBERS active_endpoints:user:user_001');
  console.log('Get endpoint details: HGETALL active_endpoints:endpoint_001');

} catch (error) {
  console.error('Error initializing Redis:', error);
  process.exit(1);
} finally {
  await redis.quit();
  console.log('\nDisconnected from Redis');
}