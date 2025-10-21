# Envoy Edge Proxy Setup

This project includes an Envoy proxy configured with JWT authentication to handle request validation and routing.

## Architecture

```
Client (Port 8080) → Envoy Proxy → Node.js Server (Port 8080)
```

## Services

- **Envoy Proxy**: Runs on port 8080 (external), forwards to server:8080
- **Node.js Server**: Runs on port 8080 (internal), also accessible on port 3000 for direct testing
- **Admin Interface**: Envoy admin on port 9901

## Quick Start

1. **Start the services:**

   ```bash
   docker-compose up -d
   ```

2. **Verify services are running:**

   ```bash
   docker-compose ps
   ```

3. **Check Envoy logs:**

   ```bash
   docker-compose logs envoy
   ```

4. **Access Envoy admin interface:**
   - Open http://localhost:9901 in your browser
   - Navigate to "Listeners" to see active listeners
   - Check "Clusters" to verify server connectivity

## Configuration Files

- `envoy.yaml`: Envoy proxy configuration
- `docker-compose.yml`: Docker services definition
- `packages/sfdc-server-vanilla/Dockerfile`: Node.js server container

## JWT Authentication (Enforced Mode)

The Envoy proxy is configured with **enforced JWT authentication**:

- **Requires valid JWT tokens**: All requests must include a valid JWT token
- **Supports multiple JWT sources**: JWT tokens can be provided via:
  - `Authorization: Bearer <token>` header
  - `accessToken=<token>` cookie
  - `refreshToken=<token>` cookie
- **Blocks invalid requests**: Requests without JWT tokens or with invalid tokens are blocked with 401
- **Forwards JWT payload**: Valid JWT payload is forwarded as `x-jwt-payload` header
- **Logs all requests**: Access logs include Authorization header, cookies, and JWT payload for debugging

### Access Log Format

```
[timestamp] METHOD /path RESPONSE_CODE user=Bearer_token cookies=cookie_string jwt_payload=decoded_payload
```

## Testing

### 1. Test Direct Server Access (Port 3000)

```bash
curl http://localhost:3000/auth/me
```

### 2. Test Through Envoy Proxy (Port 8080) - Should be blocked

```bash
curl http://localhost:8080/auth/me
# Expected: 401 Unauthorized - "Jwt is missing"
```

### 3. Test with Valid JWT Token (Header)

```bash
curl -H "Authorization: Bearer your_valid_jwt_token" http://localhost:8080/auth/me
# Expected: Request forwarded to backend server
```

### 4. Test with Valid JWT Token (Cookie)

```bash
# Using accessToken cookie
curl -H "Cookie: accessToken=your_valid_jwt_token" http://localhost:8080/auth/me

# Using refreshToken cookie
curl -H "Cookie: refreshToken=your_valid_jwt_token" http://localhost:8080/auth/me
# Expected: Request forwarded to backend server
```

### 5. Test with Invalid JWT Token - Should be blocked

```bash
curl -H "Authorization: Bearer invalid.jwt.token" http://localhost:8080/auth/me
# Expected: 401 Unauthorized - "Jwt header is an invalid JSON"
```

### 6. Test with Invalid Cookie Name - Should be blocked

```bash
curl -H "Cookie: access_token=your_jwt_token" http://localhost:8080/auth/me
# Expected: 401 Unauthorized - "Jwt is missing" (cookie name not recognized)
```

### 7. Verify Logs

```bash
# Check Envoy logs for request details
docker-compose logs envoy | grep "GET /auth/me"

# Check server logs
docker-compose logs server
```

## Client Configuration

Update your client environment to use Envoy:

```bash
# In packages/client/.env
VITE_BACKEND_URL=http://localhost:8080
```

## Troubleshooting

### Envoy Not Starting

- Check if port 8080 is already in use: `lsof -i :8080`
- Verify Envoy config syntax: `docker-compose logs envoy`

### Server Connection Issues

- Verify server is running: `docker-compose logs server`
- Check server health: `curl http://localhost:3000/health` (if endpoint exists)

### JWT Issues

- Check Envoy logs for JWT validation messages
- Verify JWT secret is correctly configured in envoy.yaml

## Next Steps

1. **Add TLS**: Configure TLS termination in Envoy
2. **Health Checks**: Enable upstream health checks for the server cluster
3. **Rate Limiting**: Add rate limiting for additional security
4. **JWT Secret Management**: Consider implementing proper JWT secret rotation

## Monitoring

- **Envoy Admin**: http://localhost:9901
- **Access Logs**: `docker-compose logs envoy`
- **Server Logs**: `docker-compose logs server`
- **Container Status**: `docker-compose ps`
