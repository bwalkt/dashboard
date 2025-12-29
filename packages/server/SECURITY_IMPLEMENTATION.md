# Security Implementation for Redis Communication

## 🔒 **Authentication & Authorization Overview**

All administrative and Redis communication endpoints are now protected with comprehensive authentication mechanisms to prevent unauthorized access to sensitive operations.

## 🛡️ **Authentication Layers**

### **1. Header-Info Administrative Routes**
**Endpoints Protected:**
- `/header-info/users/:uid/activate`
- `/header-info/users/:uid/deactivate` 
- `/header-info/endpoints/*`
- `/header-info/functions/*`
- `/header-info/all`
- All other header-info management endpoints

**Authentication Methods:**
```bash
# Method 1: API Key Header
curl -H "x-api-key: YOUR_API_KEY" \
  -X POST http://localhost:8090/header-info/users/123/activate

# Method 2: Bearer Token
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -X POST http://localhost:8090/header-info/users/123/activate
```

### **2. Redis Proxy Routes** 
**Endpoints Protected:**
- `/redis-proxy` - Direct Redis operations for filters
- `/redis-proxy/header-info` - Header info retrieval
- `/redis-proxy/challenge-result/:requestId` - Challenge results

**Authentication Methods:**
```bash
# Method 1: Filter Token (for envoy-wasm-filter)
curl -H "x-filter-token: FILTER_TOKEN" \
  -X POST http://localhost:8090/redis-proxy \
  -d '{"command":"GET","key":"test"}'

# Method 2: Admin Access
curl -H "x-api-key: YOUR_API_KEY" \
  -X GET http://localhost:8090/redis-proxy/header-info
```

## 🔑 **Token Types & Validation**

### **1. Filter Tokens**
**Purpose:** Authenticate envoy-wasm-filter requests  
**Format:** Base64-encoded JSON with HMAC signature  
**Structure:**
```json
{
  "filterId": "wasm-filter-1",
  "timestamp": 1703332800000,
  "nonce": "random-hex-string", 
  "signature": "hmac-sha256-signature"
}
```

**Validation Rules:**
- Maximum age: 5 minutes
- Nonce must be unique (replay protection)
- HMAC signature must be valid
- Filter must be registered in system

**Generation (Go):**
```go
func generateFilterToken() string {
    timestamp := time.Now().UnixMilli()
    nonce := generateRandomNonce()
    data := filterID + ":" + strconv.FormatInt(timestamp, 10) + ":" + nonce
    
    h := hmac.New(sha256.New, []byte(jwtSecret))
    h.Write([]byte(data))
    signature := hex.EncodeToString(h.Sum(nil))
    
    token := FilterToken{
        FilterID: filterID,
        Timestamp: timestamp,
        Nonce: nonce,
        Signature: signature,
    }
    
    tokenJSON, _ := json.Marshal(token)
    return base64.StdEncoding.EncodeToString(tokenJSON)
}
```

### **2. Admin Tokens (JWT)**
**Purpose:** Authenticate administrative operations  
**Source:** Existing authentication service  
**Validation:** Through `authService.validateToken()`

**Requirements:**
- Valid JWT token from authentication service
- Non-expired token
- Valid user associated with token

### **3. API Keys** 
**Purpose:** Alternative admin authentication  
**Format:** Custom API key format  
**Header:** `x-api-key: YOUR_KEY`

## 🚨 **Security Features**

### **Rate Limiting**
```typescript
// Redis-based rate limiting per filter
const rateLimitOk = await redis.getClient().eval(`
  local key = KEYS[1]
  local limit = tonumber(ARGV[1])
  local window = tonumber(ARGV[2])
  local current = redis.call('INCR', key)
  if current == 1 then
    redis.call('EXPIRE', key, window)
  end
  return current <= limit
`, 1, `filter:ratelimit:${filterId}`, "1000", "60");
```

**Limits:**
- **Filters:** 1000 requests per minute
- **Admin:** Unlimited (controlled by JWT expiration)

### **Request Validation**
- All tokens validated on every request
- Nonce tracking prevents replay attacks  
- Timestamp validation prevents stale token usage
- HMAC signatures ensure token integrity

### **Access Control**
```typescript
// Middleware applies to all routes in plugin
fastify.addHook('preHandler', authenticateAdmin);

// Different validation for filter vs admin requests
if (filterToken) {
  // Validate filter token
  const validation = await FilterRedisService.validateFilterToken(filterToken);
} else {
  // Validate admin token  
  const authResult = await authService.validateToken(token);
}
```

## 📋 **Error Responses**

### **401 Unauthorized**
```json
{
  "error": "Authentication failed: Invalid authentication token"
}
```

**Common Causes:**
- Missing authentication header
- Invalid token format
- Expired token
- Invalid signature
- User not found

### **429 Too Many Requests**
```json
{
  "error": "Rate limit exceeded"
}
```

### **403 Forbidden**
```json
{
  "error": "Insufficient permissions"
}
```

## 🔧 **Implementation Details**

### **Authentication Middleware**
```typescript
async function authenticateAdmin(request: FastifyRequest, reply: FastifyReply) {
  try {
    const apiKey = request.headers['x-api-key'] as string;
    const authHeader = request.headers['authorization'] as string;
    
    let token = apiKey;
    if (!token && authHeader?.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
    
    if (!token) {
      reply.code(401);
      throw new Error('Authentication required');
    }
    
    const authResult = await authService.validateToken(token);
    if (!authResult.valid || !authResult.user) {
      reply.code(401);
      throw new Error('Invalid authentication token');
    }
    
    // Store user for later use
    (request as any).user = authResult.user;
  } catch (error) {
    reply.code(401);
    throw new Error(`Authentication failed: ${error.message}`);
  }
}
```

### **Filter Authentication**  
```typescript
// Dual authentication for Redis proxy
if (filterToken) {
  // Filter authentication path
  const validation = await FilterRedisService.validateFilterToken(filterToken);
  if (!validation.valid) {
    throw new Error('Invalid filter token');
  }
  (request as any).filterId = validation.filterId;
} else {
  // Admin authentication path  
  // ... standard JWT validation
}
```

## ⚙️ **Configuration**

### **Environment Variables**
```bash
# JWT secret for filter token generation
JWT_SECRET=your-secret-key

# Redis configuration 
REDIS_URL=redis://localhost:6379
```

### **Rate Limit Configuration**
```typescript
// Configurable in FilterRedisService
private static readonly RATE_LIMIT_WINDOW = 60; // 1 minute
private static readonly MAX_REQUESTS_PER_FILTER = 1000;
```

## 🧪 **Testing Authentication**

### **Generate Test Tokens**
```bash
# Get JWT token via login
curl -X POST http://localhost:8090/auth/login \
  -d '{"email":"admin@example.com","password":"password"}' \
  | jq -r '.token'

# Use token for authenticated requests
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8090/header-info/users
```

### **Test Filter Authentication**
```bash
# Test with invalid token
curl -H "x-filter-token: invalid" \
  http://localhost:8090/redis-proxy/header-info
# Expected: 401 Unauthorized

# Test without token  
curl http://localhost:8090/header-info/users/123/activate
# Expected: 401 Unauthorized
```

### **Test Rate Limiting**
```bash
# Rapid requests to test rate limiting
for i in {1..1005}; do
  curl -H "x-filter-token: $FILTER_TOKEN" \
    -X POST http://localhost:8090/redis-proxy \
    -d '{"command":"GET","key":"test"}'
done
# Expected: 429 after 1000 requests
```

## 🎯 **Security Best Practices**

### **Implemented**
✅ Authentication on all administrative endpoints  
✅ Rate limiting to prevent abuse  
✅ Token validation with replay protection  
✅ HMAC signatures for integrity  
✅ Proper error handling without information leakage

### **Recommended for Production**
🔄 **Role-based access control (RBAC)**
- Add user roles (admin, operator, readonly)
- Restrict operations based on roles

🔄 **API key management**  
- Key rotation mechanisms
- Per-key rate limits
- Key usage auditing

🔄 **Enhanced monitoring**
- Authentication failure alerting  
- Unusual activity detection
- Rate limit monitoring

🔄 **Network security**
- TLS encryption for all endpoints
- IP whitelisting for admin endpoints
- VPN/private network restrictions

---

**🔐 All Redis communication endpoints are now secured with multi-layered authentication, protecting your infrastructure from unauthorized access while maintaining efficient operation for legitimate filters and administrators.**