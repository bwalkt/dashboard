# Envoy WASM Filter Configuration with Centrifugo

## Overview

This configuration shows how to set up the Envoy WASM filter to communicate with the server via Centrifugo instead of direct HTTP calls.

## Security Features

### 1. **Filter Authentication**
- Each filter instance must authenticate using HMAC-signed tokens
- Tokens include timestamp and nonce for replay protection
- Shared secret between filter and server prevents unauthorized access

### 2. **Message Signing** 
- All messages between filter and server are HMAC-signed
- Prevents message tampering and ensures integrity
- Nonce-based replay protection

### 3. **Channel Authorization**
- Dedicated channels for filter communication: `filter:*`
- Only authenticated filters can subscribe/publish to filter channels
- Server validates filter identity before allowing channel access

### 4. **Rate Limiting**
- Configurable rate limits per filter (default: 1000 requests/minute)
- Prevents filter abuse and DoS attacks

## Envoy Configuration

```yaml
admin:
  address:
    socket_address:
      address: 0.0.0.0
      port_value: 9901

static_resources:
  listeners:
  - name: listener_0
    address:
      socket_address:
        address: 0.0.0.0
        port_value: 10000
    filter_chains:
    - filters:
      - name: envoy.filters.network.http_connection_manager
        typed_config:
          "@type": type.googleapis.com/envoy.extensions.filters.network.http_connection_manager.v3.HttpConnectionManager
          stat_prefix: ingress_http
          route_config:
            name: local_route
            virtual_hosts:
            - name: local_service
              domains: ["*"]
              routes:
              - match:
                  prefix: "/"
                route:
                  cluster: backend_service
          http_filters:
          - name: envoy.filters.http.wasm
            typed_config:
              "@type": type.googleapis.com/envoy.extensions.filters.http.wasm.v3.Wasm
              config:
                name: "centrifugo_auth_filter"
                root_id: "centrifugo_auth_filter"
                vm_config:
                  vm_id: "centrifugo_auth_filter"
                  runtime: "envoy.wasm.runtime.v8"
                  code:
                    local:
                      inline_string: |
                        # WASM bytecode would go here
                        # Build with: tinygo build -o main.wasm -scheduler=none -target=wasi .
                configuration:
                  "@type": type.googleapis.com/google.protobuf.StringValue
                  value: |
                    {
                      "server_cluster": "server_cluster",
                      "centrifugo_secret": "your-secret-key-here",
                      "filter_id": "wasm-filter-1"
                    }
          - name: envoy.filters.http.router

  clusters:
  - name: backend_service
    connect_timeout: 30s
    type: LOGICAL_DNS
    dns_lookup_family: V4_ONLY
    lb_policy: ROUND_ROBIN
    load_assignment:
      cluster_name: backend_service
      endpoints:
      - lb_endpoints:
        - endpoint:
            address:
              socket_address:
                address: backend
                port_value: 8080

  - name: server_cluster
    connect_timeout: 30s
    type: LOGICAL_DNS
    dns_lookup_family: V4_ONLY
    lb_policy: ROUND_ROBIN
    load_assignment:
      cluster_name: server_cluster
      endpoints:
      - lb_endpoints:
        - endpoint:
            address:
              socket_address:
                address: server
                port_value: 8090

  - name: centrifugo_cluster
    connect_timeout: 30s
    type: LOGICAL_DNS
    dns_lookup_family: V4_ONLY
    lb_policy: ROUND_ROBIN
    load_assignment:
      cluster_name: centrifugo_cluster
      endpoints:
      - lb_endpoints:
        - endpoint:
            address:
              socket_address:
                address: centrifugo
                port_value: 8000
```

## Server Environment Variables

```bash
# Centrifugo Configuration
CENTRIFUGO_API_URL=http://centrifugo:8092
CENTRIFUGO_API_KEY=api-key-for-server

# Redis for Centrifugo
REDIS_URL=redis://redis:6379

# Filter Authentication Secret
# This should match the secret in the WASM filter
JWT_SECRET=your-jwt-secret-here
```

## Centrifugo Configuration

```json
{
  "api_key": "api-key-for-server",
  "admin": {
    "password": "admin-password",
    "secret": "admin-secret"
  },
  "redis": {
    "address": "redis:6379"
  },
  "proxy_connect_endpoint": "http://server:8090/centrifugo/connect",
  "proxy_refresh_endpoint": "http://server:8090/centrifugo/refresh",
  "proxy_subscribe_endpoint": "http://server:8090/centrifugo/subscribe",
  "proxy_publish_endpoint": "http://server:8090/centrifugo/publish",
  "proxy_connect_filter_endpoint": "http://server:8090/centrifugo/filter-connect",
  "allow_subscribe_for_client": false,
  "allow_publish_for_client": false,
  "allow_history_for_client": false,
  "allow_presence_for_client": false
}
```

## Communication Flow

### 1. **Filter Registration**
```
Filter -> Server: POST /centrifugo/filter-message
{
  "authToken": { "filterId": "...", "signature": "...", ... },
  "message": {
    "type": "filter_register",
    "payload": { "filterId": "...", "envoyNodeId": "..." }
  }
}
```

### 2. **Challenge Validation**
```
Filter -> Server: POST /centrifugo/filter-message
{
  "authToken": { ... },
  "message": {
    "type": "challenge_validation", 
    "payload": { "challengeId": "...", "challengeAnswer": "..." }
  }
}

Server -> Filter: Via Centrifugo channel "filter:responses:filterId:instanceId"
{
  "type": "challenge_validation",
  "payload": { "valid": true, "cacheTtl": 300 }
}
```

### 3. **Header Info Request**
```
Filter -> Server: POST /centrifugo/filter-message
{
  "authToken": { ... },
  "message": {
    "type": "header_info_request",
    "payload": { "dataTypes": ["active_users", "active_endpoints"] }
  }
}

Server -> Filter: Via Centrifugo
{
  "type": "header_info_request",
  "payload": {
    "data": {
      "active_users": { ... },
      "active_endpoints": { ... }
    }
  }
}
```

### 4. **Broadcast Updates**
```
Server -> All Filters: Via Centrifugo channel "filter:broadcast"
{
  "type": "header_info_update",
  "updateType": "user",
  "data": { "uid": "123", "is_act": true }
}
```

## Testing

### 1. **Start Services**
```bash
# Start Redis
docker run -d --name redis -p 6379:6379 redis:alpine

# Start Centrifugo
docker run -d --name centrifugo -p 8000:8000 -p 8092:8092 \
  -v $(pwd)/centrifugo.json:/centrifugo.json \
  centrifugo/centrifugo:latest centrifugo --config=/centrifugo.json

# Start your application server
npm run dev

# Start Envoy with WASM filter
envoy -c envoy.yaml
```

### 2. **Test Filter Communication**
```bash
# Check filter registration
curl http://localhost:8090/centrifugo/filter-stats

# Test header info management
curl -X POST http://localhost:8090/header-info/users/123/activate
curl -X GET http://localhost:8090/header-info/all
```

### 3. **Monitor Logs**
```bash
# Check Envoy logs for filter output
docker logs envoy

# Check Centrifugo logs
docker logs centrifugo

# Check application server logs
npm run dev
```

## Security Notes

1. **Secret Management**: Store `centrifugo_secret` securely, never in code
2. **Network Security**: Use TLS for production deployments
3. **Rate Limiting**: Monitor and adjust rate limits based on traffic
4. **Monitoring**: Set up alerts for filter authentication failures
5. **Rotation**: Regularly rotate authentication secrets