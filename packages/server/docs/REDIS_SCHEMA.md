# Redis Schema Documentation

## Overview
This document describes the Redis data structures used in the P-Zero application. Redis is used for session management, filter data, and real-time communication between the Envoy WASM filter and server components.

## Data Structures

### 1. Filter Sessions (`filter:sessions:*`)
Manages user sessions created by the WASM filter during login interception.

#### Key Patterns
```text
filter:sessions:data:<session_id>     # Individual session data
filter:sessions:user:<user_id>        # User's session set
filter:sessions:active                # All active sessions hash
filter:sessions:next_funcs:<session_id> # Session-specific functions
```

#### Session Data Structure (`filter:sessions:data:<session_id>`)
**Type**: Hash

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `uid` | JSON string | User ID from PostgreSQL | `"019c1e23-4567-7def-8901-234567890123"` |
| `email` | JSON string | User email address | `"alice@example.com"` |
| `name` | JSON string | User display name | `"Alice Johnson"` |
| `sid` | JSON string | Session ID (UUID v7) | `"019c1e23-4567-7def-8901-234567890123"` |
| `c_at` | JSON number | Created timestamp (milliseconds) | `1704067800000` |
| `last_seen` | JSON number | Last activity timestamp | `1704067920000` |
| `data` | JSON object | Session metadata with nested structure | `{"meta": {"source": "wasm_filter", "ip": "192.168.1.100", "user_agent": "Mozilla/5.0"}}` |

#### User Sessions Set (`filter:sessions:user:<user_id>`)
**Type**: Set
- **Members**: Session IDs for the user
- **Purpose**: Quick lookup of all sessions for a specific user

#### Active Sessions Hash (`filter:sessions:active`)
**Type**: Hash
- **Keys**: Session IDs
- **Values**: JSON objects containing core session info
```json
{
  "uid": "user_id",
  "email": "user@example.com", 
  "c_at": 1704067800000
}
```

#### Next Functions (`filter:sessions:next_funcs:<session_id>`)
**Type**: Hash
- **Keys**: Function names
- **Values**: JSON objects with function state
```json
{
  "validateEmail": {
    "status": "completed",
    "result": "valid",
    "completedAt": 1704067850000
  },
  "verifyPhone": {
    "status": "pending",
    "attempts": 2,
    "lastAttempt": 1704067920000
  }
}
```

#### TTL Policy
- **Default**: Configurable via `SESSION_TTL_DAYS` environment variable (default: 30 days)
- **All session keys**: Same TTL to maintain data consistency

#### Example Commands
```bash
# Get session data
HGETALL filter:sessions:data:019c1e23-4567-7def-8901-234567890123

# Get all sessions for a user
SMEMBERS filter:sessions:user:user_001

# Get all active sessions
HGETALL filter:sessions:active

# Get session functions
HGETALL filter:sessions:next_funcs:019c1e23-4567-7def-8901-234567890123

# Find all session data keys
SCAN 0 MATCH filter:sessions:data:* COUNT 100

# Find all user session keys  
SCAN 0 MATCH filter:sessions:user:* COUNT 100
```

---

### 2. Filter Header Info (`filter:header:info`)
Central header information for WASM filter communication.

#### Structure (Hash)

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `users` | JSON string | Active users information | See below |
| `endpoints` | JSON string | Available API endpoints | See below |
| `functions` | JSON string | Session functions by session ID | See below |

#### Users Field Structure
```json
{
  "user_001": {
    "email": "alice@example.com",
    "name": "Alice Johnson", 
    "sid": "019c1e23-4567-7def-8901-234567890123",
    "last_seen": 1704067920000
  },
  "user_002": {
    "email": "bob@example.com",
    "name": "Bob Smith",
    "sid": "019c1e23-4567-7def-8901-234567890124", 
    "last_seen": 1704067800000
  }
}
```

#### Endpoints Field Structure
```json
{
  "/api/v1/users": { "status": "active", "method": "GET" },
  "/api/v1/auth/login": { "status": "active", "method": "POST" },
  "/api/v1/products": { "status": "active", "method": "GET,POST" }
}
```

#### Functions Field Structure
```json
{
  "019c1e23-4567-7def-8901-234567890123": {
    "validateEmail": {
      "status": "completed",
      "result": "valid"
    },
    "verifyPhone": {
      "status": "pending"
    }
  }
}
```

#### Example Commands
```bash
# Get all header info
HGETALL filter:header:info

# Get only users info
HGET filter:header:info users

# Get only functions info
HGET filter:header:info functions
```

---

### 3. Filter Registry (`filter:registry`)
Tracks registered WASM filters and their status.

#### Structure (Hash)
- **Keys**: Filter IDs
- **Values**: JSON objects with filter information
- **TTL**: Configurable via `FILTER_REGISTRY_TTL_HOURS` (default: 24 hours)

#### Filter Information Structure
```json
{
  "filterId": "filter_001",
  "envoyNodeId": "envoy_node_1",
  "registeredAt": 1704067200000,
  "lastHeartbeat": 1704067920000,
  "status": "active"
}
```

#### Example Commands
```bash
# Get all registered filters
HGETALL filter:registry

# Get specific filter info
HGET filter:registry filter_001
```

---

### 4. Filter Heartbeats (`filter:heartbeat:<filter_id>`)
Individual filter heartbeat data with metrics.

#### Structure (String - JSON)
**TTL**: 60 seconds

```json
{
  "timestamp": 1704067920000,
  "metrics": {
    "requests_processed": 847,
    "avg_response_time": 245
  }
}
```

#### Example Commands
```bash
# Get filter heartbeat
GET filter:heartbeat:filter_001

# Check if filter is alive
EXISTS filter:heartbeat:filter_001
```

---

### 5. Proxy Targets (`proxy_targets:all`)
Stores proxy server configurations (existing structure).

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

## Session Management Flow

### 1. Login Interception
```text
1. User logs in via OAuth
2. WASM filter intercepts login response  
3. Filter extracts email from response
4. Filter generates UUID v7 session ID
5. Filter calls POST /filter/session/update with email + session ID
6. Server looks up user by email in PostgreSQL
7. Server stores session data in Redis with PostgreSQL field names
8. Server updates filter header info
```

### 2. Session Data Storage
```bash
# Session created with these Redis operations:
HSET filter:sessions:data:<sid> uid <user_id> email <email> name <name> sid <sid> c_at <timestamp> last_seen <timestamp> source "wasm_filter" ip <ip> user_agent <ua>
EXPIRE filter:sessions:data:<sid> <ttl_seconds>

SADD filter:sessions:user:<uid> <sid>
EXPIRE filter:sessions:user:<uid> <ttl_seconds>

HSET filter:sessions:active <sid> '{"uid":"<uid>","email":"<email>","c_at":<timestamp>}'
EXPIRE filter:sessions:active <ttl_seconds>
```

### 3. Session Cleanup
```bash
# On logout, these keys are removed:
DEL filter:sessions:data:<sid>
DEL filter:sessions:next_funcs:<sid>
SREM filter:sessions:user:<uid> <sid>
HDEL filter:sessions:active <sid>
```

---

## Query Patterns

### 1. User Session Queries
```bash
# Get all data for a specific session
session_id="019c1e23-4567-7def-8901-234567890123"
HGETALL filter:sessions:data:${session_id}
HGETALL filter:sessions:next_funcs:${session_id}

# Get all sessions for a user
user_id="user_001"
SMEMBERS filter:sessions:user:${user_id}

# Check if session exists and is active
EXISTS filter:sessions:data:${session_id}
HEXISTS filter:sessions:active ${session_id}
```

### 2. Filter Management
```bash
# Get all active filters
HGETALL filter:registry

# Check filter health
redis-cli --scan --pattern "filter:heartbeat:*" | while read key; do
  exists=$(redis-cli EXISTS $key)
  if [ "$exists" = "1" ]; then
    echo "Active: $key"
  else
    echo "Dead: $key"
  fi
done

# Get filter metrics
filter_id="filter_001"
GET filter:heartbeat:${filter_id}
```

### 3. Cleanup and Maintenance
```bash
# Remove expired sessions (manual cleanup if needed)
redis-cli --scan --pattern "filter:sessions:data:*" | while read key; do
  ttl=$(redis-cli TTL $key)
  if [ "$ttl" = "-2" ]; then
    echo "Expired key found: $key"
  fi
done

# Clean orphaned user session sets
redis-cli --scan --pattern "filter:sessions:user:*" | while read key; do
  members=$(redis-cli SCARD $key)
  if [ "$members" = "0" ]; then
    redis-cli DEL $key
  fi
done
```

---

## Performance Considerations

### Memory Usage Estimation
- **Session Data**: ~400 bytes per session
- **User Session Set**: ~50 bytes per member + overhead
- **Active Sessions Entry**: ~150 bytes per session
- **Next Functions**: ~200-500 bytes depending on complexity
- **Header Info**: ~10-50 KB depending on active user count

### Example Capacity Planning
For 10,000 active sessions:
- Session data: 10,000 × 400 bytes = 4 MB
- User session sets: ~1 MB
- Active sessions hash: 10,000 × 150 bytes = 1.5 MB
- Next functions (50% have): 5,000 × 300 bytes = 1.5 MB
- Header info: ~50 KB
- **Total**: ~8 MB

### Optimization Tips
1. Use consistent TTL across session-related keys
2. Pipeline operations when updating multiple session keys
3. Use SCAN instead of KEYS for pattern matching in production
4. Monitor memory usage and adjust TTL based on usage patterns
5. Consider Redis Cluster for scaling beyond single instance limits

---

## Security Considerations

1. **Session ID Security**: Use UUID v7 for time-ordered, unpredictable session IDs
2. **Data Encryption**: All values stored as JSON strings to prevent data type confusion
3. **TTL Management**: Consistent expiry prevents abandoned session data
4. **Network Security**: Redis should only be accessible to authorized services
5. **Key Patterns**: Use prefixed patterns to avoid collisions with other applications

---

## Monitoring and Health Checks

### Session Health
```bash
# Count active sessions
HLEN filter:sessions:active

# Count session data keys
redis-cli --scan --pattern "filter:sessions:data:*" | wc -l

# Check for orphaned sessions
redis-cli --scan --pattern "filter:sessions:data:*" | while read key; do
  sid=$(echo $key | cut -d: -f4)
  active=$(redis-cli HEXISTS filter:sessions:active $sid)
  if [ "$active" = "0" ]; then
    echo "Orphaned session: $key"
  fi
done
```

### Filter Health
```bash
# Count registered filters
HLEN filter:registry

# Count active heartbeats
redis-cli --scan --pattern "filter:heartbeat:*" | wc -l

# Check filter response times
redis-cli --scan --pattern "filter:heartbeat:*" | while read key; do
  data=$(redis-cli GET $key)
  response_time=$(echo $data | jq '.metrics.avg_response_time // 0')
  if [ "$response_time" -gt 1000 ]; then
    echo "Slow filter: $key ($response_time ms)"
  fi
done
```

---

## Migration and Development

### Initialize Test Data
```bash
# Run initialization script
node packages/server/scripts/init-redis.js
```

### Clear Session Data (Development)
```bash
# Clear all filter session data
redis-cli --scan --pattern "filter:sessions:*" | xargs -r redis-cli DEL
redis-cli DEL filter:header:info
redis-cli DEL filter:registry
redis-cli --scan --pattern "filter:heartbeat:*" | xargs -r redis-cli DEL
```

### Environment Configuration
```bash
# Session TTL (days)
export SESSION_TTL_DAYS=30

# Filter registry TTL (hours)
export FILTER_REGISTRY_TTL_HOURS=24

# Redis connection
export REDIS_HOST=localhost
export REDIS_PORT=6379
export REDIS_PASSWORD=your_password  # Optional
```

---

*Last Updated: January 2025*  
*Version: 2.0.0 - Updated for new session management schema*