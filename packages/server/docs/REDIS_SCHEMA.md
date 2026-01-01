# Redis Schema Documentation

## Overview
This document describes the Redis data structures used in the P-Zero application. Redis is used for caching, session management, real-time data, and temporary storage.

## Data Structures

### 1. Active Sessions (`active_sessions`)
Tracks user session information and activity status.

#### Key Pattern
```text
active_sessions:<user_id>
```

#### Structure (Hash)

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `id` | string | User ID (same as key suffix) | `"user_001"` |
| `last_login` | ISO 8601 timestamp | When the user last logged in | `"2024-01-01T10:30:00.000Z"` |
| `last_seen` | ISO 8601 timestamp | Last activity timestamp | `"2024-01-01T10:45:00.000Z"` |
| `is_active` | boolean string | Whether session is currently active | `"true"` or `"false"` |

#### TTL Policy
- Active sessions: No expiry
- Inactive sessions: 24 hours (86400 seconds)

#### Example Commands
```bash
# Get a user's session
HGETALL active_sessions:user_001

# Check if user is active
HGET active_sessions:user_001 is_active

# Update last seen
HSET active_sessions:user_001 last_seen "2024-01-01T11:00:00.000Z"

# Get all active sessions (use SCAN in production)
SCAN 0 MATCH active_sessions:* COUNT 100
```

#### Index
- `active_sessions:index` (Set) - Contains all active user IDs for quick enumeration

---

### 2. Next Functions (`next_funcs`)
Manages sequential user tasks, functions, or workflow steps.

#### Key Pattern
```text
next_funcs:<user_id>:<sequence_number>
```

#### Structure (Hash)

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `uid` | string | User ID | `"user_001"` |
| `seq_no` | string | Sequence number | `"1"`, `"2"`, `"3"` |
| `func` | string | Function/task name | `"validateEmail"`, `"verifyPhone"` |
| `ans` | string | Answer or result | `"email@example.com"` |
| `solved` | boolean string | Whether task is completed | `"true"` or `"false"` |
| `solved_at` | ISO 8601 timestamp | When task was completed (optional) | `"2024-01-01T10:30:00.000Z"` |
| `status` | string | Current status | `"pending"`, `"in_progress"`, `"completed"` |
| `data` | JSON string | Additional metadata | `'{"attempts": 2, "score": 95}'` |

#### TTL Policy
- Completed tasks: 7 days (604800 seconds)
- Pending/in-progress tasks: No expiry

#### Example Commands
```bash
# Get specific function details
HGETALL next_funcs:user_001:1

# Get all fields for a function
HMGET next_funcs:user_001:2 func status solved

# Update function status
HMSET next_funcs:user_001:2 status "completed" solved "true" solved_at "2024-01-01T11:00:00.000Z"

# Check if function is solved
HGET next_funcs:user_001:1 solved
```

#### Indexes
- `next_funcs:user:<user_id>` (Set) - Contains all function keys for a specific user
  - Members format: `"<user_id>:<seq_no>"`
  - Example: `SMEMBERS next_funcs:user:user_001` returns `["user_001:1", "user_001:2"]`

---

### 3. Active Endpoints (`active_endpoints`)
Monitors API endpoint health and performance metrics.

#### Key Pattern
```text
active_endpoints:<endpoint_id>
```

#### Structure (Hash)

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `id` | string | Unique endpoint identifier | `"endpoint_001"` |
| `uid` | string | User ID who owns/monitors this endpoint | `"user_001"` |
| `last_seen` | ISO 8601 timestamp | Last time endpoint was accessed | `"2024-01-01T10:45:00.000Z"` |
| `status` | string | Health status | `"healthy"`, `"slow"`, `"down"` |
| `data` | JSON string | Endpoint metrics and metadata | See below |

#### Data Field Structure
```json
{
  "url": "/api/v1/users",
  "method": "GET",
  "response_time": 145,        // in milliseconds
  "requests_per_min": 12,
  "error": null                // or error message if status is "down"
}
```

#### TTL Policy
- Healthy endpoints: No expiry
- Slow endpoints: No expiry
- Down endpoints: 1 hour (3600 seconds)

#### Example Commands
```bash
# Get endpoint details
HGETALL active_endpoints:endpoint_001

# Get endpoint status
HGET active_endpoints:endpoint_001 status

# Update endpoint metrics
HSET active_endpoints:endpoint_001 data '{"url":"/api/v1/users","method":"GET","response_time":89}'

# Get all endpoints (use SCAN in production)
SCAN 0 MATCH active_endpoints:* COUNT 100
```

#### Indexes
- `active_endpoints:user:<user_id>` (Set) - Contains all endpoint IDs for a specific user
  - Example: `SMEMBERS active_endpoints:user:user_001` returns `["endpoint_001", "endpoint_002"]`

---

### 4. Proxy Targets (`proxy_targets`)
Stores proxy server configurations (existing structure).

#### Key Pattern
```text
proxy_targets:all
```

#### Structure (String - JSON Array)
```json
[
  {
    "id": "019b72dd-d3ae-7cea-955d-52a35dd123db",
    "name": "Salesforce Server",
    "url": "pzero-sfdc-server",
    "port": 3000
  },
  {
    "id": "019b72dd-f334-7fbe-b962-a23e0d62d708",
    "name": "Auth Server",
    "url": "pzero-server",
    "port": 8090
  }
]
```

#### TTL Policy
- Default: 1 hour (3600 seconds)

---

## Query Patterns

### 1. User-centric Queries
```bash
# Get all data for a specific user
user_id="user_001"

# Session info
HGETALL active_sessions:${user_id}

# All user functions
SMEMBERS next_funcs:user:${user_id}

# All user endpoints
SMEMBERS active_endpoints:user:${user_id}
```

### 2. Status Checks
```bash
# All active users
SMEMBERS active_sessions:index

# All healthy endpoints
redis-cli --scan --pattern "active_endpoints:*" | while read key; do
  status=$(redis-cli HGET $key status)
  if [ "$status" = "healthy" ]; then
    echo $key
  fi
done
```

### 3. Cleanup Patterns
```bash
# Remove expired sessions
redis-cli --scan --pattern "active_sessions:*" | while read key; do
  is_active=$(redis-cli HGET $key is_active)
  if [ "$is_active" = "false" ]; then
    redis-cli EXPIRE $key 86400
  fi
done

# Remove completed functions older than 7 days
redis-cli --scan --pattern "next_funcs:*" | while read key; do
  solved=$(redis-cli HGET $key solved)
  if [ "$solved" = "true" ]; then
    redis-cli EXPIRE $key 604800
  fi
done
```

---

## Performance Considerations

### Memory Usage Estimation
- **Active Session**: ~200 bytes per session
- **Next Function**: ~300-500 bytes per function (depending on data field)
- **Active Endpoint**: ~400-600 bytes per endpoint
- **Indexes**: ~50 bytes per member

### Example Capacity Planning
For 10,000 active users:
- Sessions: 10,000 × 200 bytes = 2 MB
- Functions (avg 3 per user): 30,000 × 400 bytes = 12 MB
- Endpoints (avg 5 per user): 50,000 × 500 bytes = 25 MB
- Indexes: ~2 MB
- **Total**: ~41 MB

### Optimization Tips
1. Use TTL aggressively for temporary data
2. Consider using Redis Streams for time-series endpoint metrics
3. Implement batch operations for bulk updates
4. Use pipelining for multiple operations
5. Consider Redis Cluster for horizontal scaling beyond 100GB

---

## Monitoring Queries

### Health Check
```bash
# Count of each data type
echo "Active Sessions: $(redis-cli --scan --pattern 'active_sessions:*' | wc -l)"
echo "Functions: $(redis-cli --scan --pattern 'next_funcs:*' | wc -l)"
echo "Endpoints: $(redis-cli --scan --pattern 'active_endpoints:*' | wc -l)"

# Memory usage
redis-cli INFO memory | grep used_memory_human

# Keys with no TTL (potential memory leaks)
redis-cli --scan | while read key; do
  ttl=$(redis-cli TTL $key)
  if [ "$ttl" = "-1" ]; then
    echo "No TTL: $key"
  fi
done
```

### Performance Metrics
```bash
# Slow queries
redis-cli SLOWLOG GET 10

# Command statistics
redis-cli INFO commandstats

# Connected clients
redis-cli CLIENT LIST
```

---

## Backup and Recovery

### Backup Commands
```bash
# Manual backup (synchronous)
redis-cli BGSAVE

# Check last save
redis-cli LASTSAVE

# Export specific patterns
redis-cli --scan --pattern "active_sessions:*" | while read key; do
  type=$(redis-cli TYPE $key)
  if [ "$type" = "hash" ]; then
    redis-cli HGETALL $key
  fi
done > sessions_backup.txt
```

### Recovery
```bash
# Restore from RDB file
redis-server --dbfilename backup.rdb

# Import from script
redis-cli < redis_commands.txt
```

---

## Security Considerations

1. **No PII in Keys**: Use user IDs, not emails or names
2. **Encryption**: Sensitive data in `data` fields should be encrypted
3. **Access Control**: Use Redis ACL for production
4. **Network Security**: Always use TLS in production
5. **Key Namespacing**: Use prefixes to avoid collisions

---

## Migration Scripts

### Clear All Data (Development Only)
```bash
# WARNING: Deletes everything
redis-cli FLUSHDB
```

### Selective Clear
```bash
# Clear only sessions
redis-cli --scan --pattern "active_sessions:*" | xargs redis-cli DEL

# Clear only functions
redis-cli --scan --pattern "next_funcs:*" | xargs redis-cli DEL

# Clear only endpoints
redis-cli --scan --pattern "active_endpoints:*" | xargs redis-cli DEL
```

---

## Integration with Application

### Node.js/ioredis Examples
```javascript
// Get user session
const session = await redis.hgetall(`active_sessions:${userId}`);

// Update last seen
await redis.hset(`active_sessions:${userId}`, 'last_seen', new Date().toISOString());

// Get user's pending functions
const functionKeys = await redis.smembers(`next_funcs:user:${userId}`);
const pendingFuncs = [];
for (const key of functionKeys) {
  const func = await redis.hgetall(`next_funcs:${key}`);
  if (func.solved === 'false') {
    pendingFuncs.push(func);
  }
}

// Check endpoint health
const endpoint = await redis.hgetall(`active_endpoints:${endpointId}`);
const data = JSON.parse(endpoint.data);
if (data.response_time > 1000) {
  await redis.hset(`active_endpoints:${endpointId}`, 'status', 'slow');
}
```

---

## Appendix: Redis Data Types Used

| Data Type | Use Case | Commands |
|-----------|----------|----------|
| **Hash** | Structured objects (sessions, functions, endpoints) | HSET, HGET, HGETALL, HMSET |
| **Set** | Indexes and unique collections | SADD, SMEMBERS, SREM |
| **String** | Simple values and JSON (proxy_targets) | SET, GET |
| **Key Expiry** | TTL management | EXPIRE, TTL, PERSIST |

---

*Last Updated: January 2025*
*Version: 1.0.0*