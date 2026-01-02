# Redis Implementation Guide

## Overview
This document details the implementation of Redis-based session management and communication between the Envoy WASM filter and server components in the P-Zero application.

## Architecture

### System Components
1. **Envoy WASM Filter** - Intercepts login requests and manages sessions
2. **P-Zero Server** - Provides session management APIs and PostgreSQL integration  
3. **Redis** - Centralized session storage and filter communication
4. **PostgreSQL** - User data and authentication state

### Communication Flow
```text
┌─────────────────┐    HTTP/2     ┌─────────────────┐
│                 │◄─────────────►│                 │
│ Envoy WASM      │               │ P-Zero Server   │
│ Filter          │               │                 │
│                 │               │                 │
└─────────┬───────┘               └─────────┬───────┘
          │                                 │
          │                                 │
          │         ┌─────────────┐         │
          │         │             │         │
          └────────►│    Redis    │◄────────┘
                    │             │
                    └─────────────┘
                           │
                    ┌─────────────┐
                    │             │
                    │ PostgreSQL  │
                    │             │
                    └─────────────┘
```

## Session Management Implementation

### 1. Login Interception Process

#### WASM Filter (`login_interceptor.go`)
```go
// 1. Detect OAuth callback
func (li *LoginInterceptor) IsLoginPath(path string) bool {
    return strings.HasPrefix(path, "/auth/callback") ||
           strings.HasPrefix(path, "/auth/login") ||
           strings.HasPrefix(path, "/api/auth/callback")
}

// 2. Extract user email from response
func (li *LoginInterceptor) HandleLoginResponse(ctx *httpContext, statusCode uint32, bodySize int) error {
    // Parse login response JSON
    var loginData map[string]interface{}
    json.Unmarshal(body, &loginData)
    
    // Extract email from user object
    if user, ok := loginData["user"].(map[string]interface{}); ok {
        if emailVal, ok := user["email"].(string); ok {
            email = emailVal
        }
    }
    
    // 3. Generate UUID v7 session ID
    uuidV7, err := uuid.NewV7()
    sessionID := uuidV7.String()
    
    // 4. Update session via HTTP call to server with nested metadata
    const metadata = {
        data: {
            meta: {
                source: "wasm_filter",
                ip: getClientIP(),
                user_agent: getUserAgent()
            }
        }
    };
    li.updateSession(ctx, email, sessionID, metadata)
}
```

#### Server Session Update (`filter-session.ts`)
```typescript
// POST /filter/session/update endpoint
async function updateSession(request: { email: string, sid?: string, metadata?: any }) {
    // 1. Look up user by email in PostgreSQL
    const user = await userService.getUserByEmail(email);
    
    // 2. Get next_funcs from all_auth table
    const authResult = await db.query(
        `SELECT next_funcs FROM pzero.all_auth WHERE user_id = $1`,
        [userId]
    );
    
    // 3. Store session data in Redis with PostgreSQL field names
    const sessionData = {
        uid: userId,           // PostgreSQL user_id
        email: user.email,
        name: user.name,
        sid: finalSessionId,   // Session ID (UUID v7)
        c_at: Date.now(),      // Created at timestamp
        last_seen: Date.now(), // Last seen timestamp
        data: metadata?.data || {
            meta: {
                source: 'wasm_filter',
                ip: null,
                user_agent: null
            }
        }
    };
    
    // 4. Use Redis pipeline for atomic operations
    const pipeline = redis.getClient().pipeline();
    pipeline.hset(`filter:sessions:data:${finalSessionId}`, sessionDataEntries);
    pipeline.expire(`filter:sessions:data:${finalSessionId}`, sessionTTL);
    pipeline.sadd(`filter:sessions:user:${userId}`, finalSessionId);
    pipeline.hset('filter:sessions:active', finalSessionId, activeSessionData);
    await pipeline.exec();
    
    // 5. Update filter header info
    await filterRedisService.updateHeaderInfo('users', userInfo);
}
```

### 2. Redis Data Structure

#### Session Storage Keys
```redis
# Individual session data
filter:sessions:data:<session_id>
├── uid: "user_001"                    # PostgreSQL user ID
├── email: "alice@example.com"         # User email
├── name: "Alice Johnson"              # Display name
├── sid: "<session_id>"               # Session ID (UUID v7)
├── c_at: 1704067800000              # Created timestamp
├── last_seen: 1704067920000         # Last activity
└── data: {"meta": {"source": "wasm_filter", "ip": "192.168.1.100", "user_agent": "Mozilla/5.0"}}  # Nested metadata

# User's session set (for multi-session support)
filter:sessions:user:<user_id>
└── {session_id_1, session_id_2, ...}

# Active sessions lookup
filter:sessions:active
├── <session_id_1>: {"uid": "...", "email": "...", "c_at": ...}
├── <session_id_2>: {"uid": "...", "email": "...", "c_at": ...}
└── ...

# Session-specific functions (if needed)
filter:sessions:next_funcs:<session_id>
├── validateEmail: {"status": "completed", "result": "valid"}
├── verifyPhone: {"status": "pending", "attempts": 2}
└── ...
```

### 3. Session Lifecycle Management

#### Session Creation
```typescript
// Atomic session creation using Redis pipeline
async function createSession(userId: string, sessionId: string, sessionData: SessionData) {
    const pipeline = redis.getClient().pipeline();
    
    // Store complete session data
    pipeline.hset(
        `filter:sessions:data:${sessionId}`,
        Object.entries(sessionData).map(([k, v]) => [k, JSON.stringify(v)]).flat()
    );
    pipeline.expire(`filter:sessions:data:${sessionId}`, sessionTTL);
    
    // Add to user's session set
    pipeline.sadd(`filter:sessions:user:${userId}`, sessionId);
    pipeline.expire(`filter:sessions:user:${userId}`, sessionTTL);
    
    // Add to active sessions
    pipeline.hset('filter:sessions:active', sessionId, JSON.stringify({
        uid: userId,
        email: sessionData.email,
        c_at: sessionData.c_at
    }));
    pipeline.expire('filter:sessions:active', sessionTTL);
    
    await pipeline.exec();
}
```

#### Session Validation
```typescript
// GET /filter/session/check/:sessionId
async function validateSession(sessionId: string) {
    // Check if session exists
    const sessionData = await redis.getClient().hgetall(`filter:sessions:data:${sessionId}`);
    
    if (!sessionData || Object.keys(sessionData).length === 0) {
        return { success: false, message: "Session not found" };
    }
    
    // Parse JSON values and update last_seen
    const parsedData = {};
    for (const [key, value] of Object.entries(sessionData)) {
        parsedData[key] = JSON.parse(value);
    }
    
    // Update last seen timestamp
    await redis.getClient().hset(
        `filter:sessions:data:${sessionId}`,
        'last_seen',
        JSON.stringify(Date.now())
    );
    
    return { success: true, session: parsedData };
}
```

#### Session Cleanup
```typescript
// DELETE /filter/session/:sessionId
async function removeSession(sessionId: string) {
    // Get user ID for cleanup
    const sessionData = await redis.getClient().hget(
        `filter:sessions:data:${sessionId}`,
        'uid'
    );
    
    const pipeline = redis.getClient().pipeline();
    let userId;
    
    if (sessionData) {
        userId = JSON.parse(sessionData);
        pipeline.srem(`filter:sessions:user:${userId}`, sessionId);
    }
    
    // Remove all session-related keys
    pipeline.del(
        `filter:sessions:data:${sessionId}`,
        `filter:sessions:next_funcs:${sessionId}`
    );
    pipeline.hdel('filter:sessions:active', sessionId);
    
    await pipeline.exec();
    
    // Clean up header info
    if (userId) {
        const headerInfo = await filterRedisService.getHeaderInfo();
        delete headerInfo.active_users[userId];
        delete headerInfo.next_functions[sessionId];
        await filterRedisService.updateHeaderInfo('users', headerInfo.active_users);
        await filterRedisService.updateHeaderInfo('functions', headerInfo.next_functions);
    }
}
```

### 4. Filter Registry and Health Management

#### Filter Registration
```typescript
// Filter heartbeat and registration
async function registerFilter(filterId: string, envoyNodeId: string) {
    // Store filter info
    await redis.getClient().hset('filter:registry', filterId, JSON.stringify({
        filterId,
        envoyNodeId,
        registeredAt: Date.now(),
        lastHeartbeat: Date.now(),
        status: 'active'
    }));
    
    // Store heartbeat with TTL
    await redis.getClient().set(
        `filter:heartbeat:${filterId}`,
        JSON.stringify({
            timestamp: Date.now(),
            metrics: { requests_processed: 0, avg_response_time: 0 }
        }),
        'EX', 60  // 1 minute TTL
    );
}
```

#### Health Monitoring
```bash
# Monitor filter health
redis-cli --scan --pattern "filter:heartbeat:*" | while read key; do
    exists=$(redis-cli EXISTS $key)
    if [ "$exists" = "1" ]; then
        echo "Active: $key"
    else
        echo "Dead: $key"
    fi
done

# Check session counts
redis-cli HLEN filter:sessions:active
redis-cli --scan --pattern "filter:sessions:data:*" | wc -l
```

### 5. Configuration and Environment

#### Environment Variables
```bash
# Session Management
SESSION_TTL_DAYS=30                    # Session lifetime in days

# Redis Connection
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=optional_password
REDIS_URL=redis://localhost:6379      # Alternative format

# Server Configuration
SERVER_URL=localhost:8090              # For WASM filter HTTP calls
```

#### TTL Configuration
```typescript
// Configurable session TTL
function getSessionTTL(): number {
    const ttlDays = process.env.SESSION_TTL_DAYS 
        ? parseInt(process.env.SESSION_TTL_DAYS, 10) 
        : 30;
    return ttlDays * 24 * 60 * 60; // Convert days to seconds
}
```

### 6. Data Synchronization

#### Header Info Updates
```typescript
// Filter Redis service for header info management
class FilterRedisService {
    async updateHeaderInfo(field: 'users' | 'endpoints' | 'functions', data: any) {
        await redis.getClient().hset('filter:header:info', field, JSON.stringify(data));
    }
    
    async getHeaderInfo() {
        const info = await redis.getClient().hgetall('filter:header:info');
        return {
            active_users: JSON.parse(info.users || '{}'),
            active_endpoints: JSON.parse(info.endpoints || '{}'),
            next_functions: JSON.parse(info.functions || '{}')
        };
    }
}
```

## Error Handling and Resilience

### 1. Connection Resilience
```javascript
// Redis client configuration with retry strategy
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
    }
});
```

### 2. Graceful Degradation
```typescript
// Handle Redis failures gracefully
try {
    const sessionData = await redis.getClient().hgetall(`filter:sessions:data:${sessionId}`);
    // Process session data
} catch (error) {
    console.error('Redis error:', error);
    // Fall back to database lookup or return appropriate error
    return { success: false, message: "Session service unavailable" };
}
```

### 3. Data Consistency
```typescript
// Use transactions for multi-key operations
async function atomicSessionUpdate(sessionId: string, updates: SessionUpdate) {
    const pipeline = redis.getClient().pipeline();
    
    // Queue all operations
    for (const [key, value] of Object.entries(updates)) {
        pipeline.hset(`filter:sessions:data:${sessionId}`, key, JSON.stringify(value));
    }
    
    // Execute atomically
    const results = await pipeline.exec();
    
    // Check for failures
    for (const [error, result] of results) {
        if (error) {
            throw new Error(`Session update failed: ${error.message}`);
        }
    }
}
```

## Performance Optimization

### 1. Connection Pooling
```typescript
// Redis client with connection pooling
const redis = new Redis({
    // ... connection config
    maxRetriesPerRequest: 3,
    lazyConnect: true,
    family: 4,
    keepAlive: true
});
```

### 2. Batch Operations
```typescript
// Batch session lookups
async function getMultipleSessions(sessionIds: string[]) {
    const pipeline = redis.getClient().pipeline();
    
    for (const sessionId of sessionIds) {
        pipeline.hgetall(`filter:sessions:data:${sessionId}`);
    }
    
    const results = await pipeline.exec();
    return results.map(([error, data]) => error ? null : data);
}
```

### 3. Memory Management
```bash
# Monitor Redis memory usage
redis-cli INFO memory | grep used_memory_human

# Check key expiration
redis-cli --scan | while read key; do
    ttl=$(redis-cli TTL $key)
    if [ "$ttl" = "-1" ]; then
        echo "No TTL: $key"
    fi
done
```

## Security Considerations

### 1. Data Protection
- All session data stored as JSON strings to prevent type confusion
- Sensitive data in PostgreSQL, only session metadata in Redis
- TTL ensures automatic cleanup of abandoned sessions

### 2. Access Control
- Redis should be accessible only to authorized services
- Use Redis AUTH if available
- Network-level security with firewalls

### 3. Session Security
- UUID v7 provides time-ordered, unpredictable session IDs
- Session validation includes timestamp checks
- Automatic cleanup prevents session accumulation

## Monitoring and Maintenance

### 1. Key Metrics
```bash
# Session metrics
echo "Active sessions: $(redis-cli HLEN filter:sessions:active)"
echo "Total session keys: $(redis-cli --scan --pattern 'filter:sessions:data:*' | wc -l)"
echo "Registered filters: $(redis-cli HLEN filter:registry)"

# Performance metrics
redis-cli INFO commandstats
redis-cli SLOWLOG GET 10
```

### 2. Health Checks
```bash
#!/bin/bash
# Redis health check script

# Test connectivity
redis-cli ping || exit 1

# Check critical keys exist
redis-cli EXISTS filter:sessions:active || echo "Warning: No active sessions"
redis-cli EXISTS filter:header:info || echo "Warning: No header info"

# Check for expired heartbeats
expired_filters=0
for filter in $(redis-cli --scan --pattern "filter:registry:*"); do
    heartbeat_key="filter:heartbeat:$(echo $filter | cut -d: -f3)"
    if ! redis-cli EXISTS $heartbeat_key; then
        echo "Dead filter: $filter"
        ((expired_filters++))
    fi
done

echo "Health check complete. $expired_filters dead filters found."
```

### 3. Backup and Recovery
```bash
# Backup session data
redis-cli --scan --pattern "filter:sessions:*" | \
    xargs redis-cli DUMP | \
    gzip > sessions_backup_$(date +%Y%m%d).gz

# Restore from backup
zcat sessions_backup_20250101.gz | \
    while IFS= read -r line; do
        echo "$line" | redis-cli
    done
```

## Development and Testing

### 1. Local Development Setup
```bash
# Start Redis
redis-server

# Initialize test data
cd packages/server
node scripts/init-redis.js

# Start server
npm run dev

# Build and test WASM filter
cd packages/envoy-wasm-filter
make build
```

### 2. Integration Testing
```typescript
// Test session flow
describe('Session Management', () => {
    it('should create session on login', async () => {
        // Mock login response
        const response = await request(app)
            .post('/filter/session/update')
            .send({ email: 'test@example.com' });
            
        expect(response.body.success).toBe(true);
        expect(response.body.sid).toBeDefined();
        
        // Verify Redis storage
        const sessionData = await redis.hgetall(`filter:sessions:data:${response.body.sid}`);
        expect(JSON.parse(sessionData.email)).toBe('test@example.com');
    });
});
```

### 3. Load Testing
```bash
# Generate test sessions
for i in {1..1000}; do
    curl -X POST http://localhost:8090/filter/session/update \
        -H "Content-Type: application/json" \
        -d "{\"email\":\"test${i}@example.com\"}" &
done
wait

# Check memory usage
redis-cli INFO memory
```

## Migration Guide

### 1. From HTTP/2 Direct Communication
```text
Old Flow:
WASM Filter → HTTP/2 → Server → PostgreSQL

New Flow:
WASM Filter → HTTP/2 → Server → PostgreSQL + Redis
WASM Filter ← Redis ← Server
```

### 2. Backwards Compatibility
- Existing endpoints remain functional
- Session data available via both HTTP API and Redis
- Gradual rollout possible with feature flags

### 3. Deployment Steps
```bash
# 1. Deploy Redis infrastructure
docker run -d --name redis -p 6379:6379 redis:7

# 2. Update server with Redis support
cd packages/server
npm install ioredis
npm run build
npm run deploy

# 3. Update WASM filter
cd packages/envoy-wasm-filter
make build
# Deploy new filter binary

# 4. Initialize Redis data
node packages/server/scripts/init-redis.js
```

---

*Last Updated: January 2025*  
*Version: 2.0.0 - Session Management Implementation*