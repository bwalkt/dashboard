# Centrifuge Integration Setup Guide

## Architecture Overview

```
┌─────────────┐    gRPC     ┌──────────────────┐    WebSocket    ┌─────────┐
│ Envoy Proxy │◄──────────► │ Centrifuge       │◄──────────────► │ Client  │
│ ext_proc    │  ext_proc   │ Server           │  Real-time      └─────────┘
└─────────────┘             │ Port 8091        │
                           └──────────────────┘
                                     │ HTTP API
                                     ▼
                           ┌──────────────────┐
                           │ Fastify Server   │
                           │ Port 8090        │
                           │ (Existing - Keep)│
                           └──────────────────┘
```

## Phase 1: Dependencies Installation

```bash
# Core Centrifuge dependencies
npm install centrifuge

# gRPC dependencies for Envoy ext_proc communication
npm install @grpc/grpc-js @grpc/proto-loader

# Development dependencies for proto compilation
npm install --save-dev @grpc/grpc-tools
```

## Phase 2: Directory Structure

```
src/
├── centrifuge/
│   ├── server.ts              # Main Centrifuge server
│   ├── config.ts              # Centrifuge configuration
│   ├── auth-proxy.ts          # Bridge to Fastify auth
│   └── grpc/
│       ├── proto/
│       │   └── ext_proc.proto # Envoy external processing definitions
│       ├── handlers/
│       │   └── header-validation.ts # gRPC service implementation
│       └── services/
│           └── ext-proc-service.ts # Main gRPC service
├── fastify/                   # Existing Fastify code (keep as-is)
│   ├── routes/
│   ├── services/
│   └── middleware/
```

## Phase 3: Proto Definitions for Envoy ext_proc

### src/centrifuge/grpc/proto/ext_proc.proto

```protobuf
syntax = "proto3";

package envoy.extensions.filters.http.ext_proc.v3;

// External Processing Service
service ExternalProcessor {
  // Process request headers
  rpc Process(ProcessingRequest) returns (ProcessingResponse);
}

message ProcessingRequest {
  oneof request {
    HttpHeaders request_headers = 1;
    HttpBody request_body = 2;
    HttpHeaders response_headers = 3;
    HttpBody response_body = 4;
  }
}

message ProcessingResponse {
  oneof response {
    HeadersResponse request_headers = 1;
    BodyResponse request_body = 2;
    HeadersResponse response_headers = 3;
    BodyResponse response_body = 4;
  }
}

message HttpHeaders {
  map<string, string> headers = 1;
  bool end_of_stream = 2;
}

message HttpBody {
  bytes body = 1;
  bool end_of_stream = 2;
}

message HeadersResponse {
  CommonResponse response = 1;
}

message BodyResponse {
  CommonResponse response = 1;
}

message CommonResponse {
  enum ResponseStatus {
    CONTINUE = 0;
    CONTINUE_AND_REPLACE = 1;
  }
  ResponseStatus status = 1;
  HeaderMutation header_mutation = 2;
}

message HeaderMutation {
  repeated HeaderValueOption set_headers = 1;
  repeated string remove_headers = 2;
}

message HeaderValueOption {
  string header = 1;
  string value = 2;
  bool append = 3;
}
```

## Phase 4: Centrifuge Server Configuration

### src/centrifuge/config.ts

```typescript
export const centrifugeConfig = {
  // Centrifuge server settings
  port: 8091,
  host: "0.0.0.0",

  // gRPC settings for Envoy ext_proc
  grpc: {
    port: 9091,
    host: "0.0.0.0",
  },

  // Auth proxy settings (connects to Fastify)
  authProxy: {
    fastifyUrl: "http://localhost:8090",
    endpoints: {
      connect: "/centrifuge/connect",
      refresh: "/centrifuge/refresh",
    },
  },

  // Real-time settings
  engine: "memory", // Use Redis in production

  // Logging
  log_level: "info",
  log_handler: "json",
};
```

## Phase 5: Main Centrifuge Server

### src/centrifuge/server.ts

```typescript
import { Centrifuge } from "centrifuge";
import * as grpc from "@grpc/grpc-js";
import { centrifugeConfig } from "./config";
import { createExtProcService } from "./grpc/services/ext-proc-service";
import { createAuthProxy } from "./auth-proxy";

export class CentrifugeServer {
  private centrifuge: Centrifuge;
  private grpcServer: grpc.Server;

  constructor() {
    // Initialize Centrifuge with auth proxy
    this.centrifuge = new Centrifuge({
      ...centrifugeConfig,
      proxy_connect: createAuthProxy().connect,
      proxy_refresh: createAuthProxy().refresh,
    });

    // Initialize gRPC server for Envoy ext_proc
    this.grpcServer = new grpc.Server();
    this.setupGrpcServices();
  }

  private setupGrpcServices() {
    const extProcService = createExtProcService();
    this.grpcServer.addService(
      extProcService.service,
      extProcService.implementation,
    );
  }

  async start() {
    // Start Centrifuge WebSocket server
    await this.centrifuge.listen();
    console.log(`🔄 Centrifuge server running on :${centrifugeConfig.port}`);

    // Start gRPC server for Envoy
    const grpcAddress = `${centrifugeConfig.grpc.host}:${centrifugeConfig.grpc.port}`;
    this.grpcServer.bindAsync(
      grpcAddress,
      grpc.ServerCredentials.createInsecure(),
      (err, port) => {
        if (err) {
          console.error("❌ Failed to start gRPC server:", err);
          return;
        }
        console.log(`🔄 gRPC server running on :${port}`);
        this.grpcServer.start();
      },
    );
  }

  async stop() {
    await this.centrifuge.shutdown();
    this.grpcServer.forceShutdown();
  }
}
```

## Phase 6: Auth Bridge to Fastify

### src/centrifuge/auth-proxy.ts

```typescript
import fetch from "node-fetch";
import { centrifugeConfig } from "./config";

export function createAuthProxy() {
  const fastifyBaseUrl = centrifugeConfig.authProxy.fastifyUrl;

  return {
    // Proxy authentication to existing Fastify auth system
    connect: async (client: string, data: any) => {
      try {
        const response = await fetch(`${fastifyBaseUrl}/centrifuge/connect`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: data.token || "",
          },
          body: JSON.stringify({ client, data }),
        });

        return await response.json();
      } catch (error) {
        console.error("Auth proxy connect error:", error);
        return { error: { code: 1000, message: "Authentication failed" } };
      }
    },

    // Proxy token refresh to Fastify
    refresh: async (client: string, data: any) => {
      try {
        const response = await fetch(`${fastifyBaseUrl}/centrifuge/refresh`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: data.token || "",
          },
          body: JSON.stringify({ client, data }),
        });

        return await response.json();
      } catch (error) {
        console.error("Auth proxy refresh error:", error);
        return { error: { code: 1001, message: "Token refresh failed" } };
      }
    },
  };
}
```

## Phase 7: Fastify Integration (Add to existing server)

### Add to existing src/routes/auth.ts

```typescript
// Add these endpoints to your existing Fastify auth routes

/**
 * POST /centrifuge/connect
 * Centrifuge authentication proxy endpoint
 */
fastify.post(
  "/centrifuge/connect",
  async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // Extract token from Authorization header
      const token = authService.extractTokenFromHeader(
        request.headers.authorization,
      );

      if (!token) {
        return reply.status(401).send({
          error: { code: 1000, message: "No token provided" },
        });
      }

      // Verify token using existing auth service
      const payload = authService.verifyAccessToken(token);
      if (!payload) {
        return reply.status(401).send({
          error: { code: 1000, message: "Invalid token" },
        });
      }

      // Return Centrifuge connection credentials
      return reply.send({
        result: {
          user: payload.userId.toString(),
          channels: [`user:${payload.userId}`],
          info: {
            email: payload.email,
            name: payload.githubId || "User",
          },
        },
      });
    } catch (error) {
      console.error("Centrifuge connect error:", error);
      return reply.status(500).send({
        error: { code: 1000, message: "Authentication failed" },
      });
    }
  },
);

/**
 * POST /centrifuge/refresh
 * Centrifuge token refresh proxy endpoint
 */
fastify.post(
  "/centrifuge/refresh",
  async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // Handle token refresh logic (similar to existing /auth/refresh)
      const refreshToken = authService.extractRefreshTokenFromCookies(
        request.cookies,
      );

      if (!refreshToken) {
        return reply.status(401).send({
          error: { code: 1001, message: "No refresh token" },
        });
      }

      const payload = authService.verifyRefreshToken(refreshToken);
      if (!payload) {
        return reply.status(401).send({
          error: { code: 1001, message: "Invalid refresh token" },
        });
      }

      // Generate new access token
      const user = await userService.getUserById(payload.userId);
      if (!user) {
        return reply.status(401).send({
          error: { code: 1001, message: "User not found" },
        });
      }

      return reply.send({
        result: {
          user: user.id.toString(),
          channels: [`user:${user.id}`],
        },
      });
    } catch (error) {
      console.error("Centrifuge refresh error:", error);
      return reply.status(500).send({
        error: { code: 1001, message: "Token refresh failed" },
      });
    }
  },
);
```

## Phase 8: Package.json Scripts

### Add to package.json

```json
{
  "scripts": {
    "dev:fastify": "tsx watch src/server.ts",
    "dev:centrifuge": "tsx watch src/centrifuge/server.ts",
    "dev:both": "concurrently \"npm run dev:fastify\" \"npm run dev:centrifuge\"",
    "build:proto": "grpc_tools_node_protoc --js_out=import_style=commonjs,binary:./src/centrifuge/grpc/generated --grpc_out=grpc_js:./src/centrifuge/grpc/generated --plugin=protoc-gen-grpc=`which grpc_tools_node_protoc_plugin` -I ./src/centrifuge/grpc/proto ./src/centrifuge/grpc/proto/*.proto"
  },
  "devDependencies": {
    "concurrently": "^8.2.2"
  }
}
```

## Phase 9: Docker Compose Integration

### Add to docker-compose.yml

```yaml
services:
  # Existing services (keep as-is)
  fastify-server:
    ports:
      - "8090:8090"

  # New Centrifuge service
  centrifuge-server:
    build:
      context: .
      dockerfile: Dockerfile.centrifuge
    ports:
      - "8091:8091" # WebSocket port
      - "9091:9091" # gRPC port for Envoy
    environment:
      - CENTRIFUGE_PORT=8091
      - GRPC_PORT=9091
      - FASTIFY_URL=http://fastify-server:8090
    depends_on:
      - fastify-server
      - redis

  # Update Envoy to use Centrifuge gRPC
  envoy:
    # ... existing config
    depends_on:
      - centrifuge-server
```

## Phase 10: Envoy Configuration for ext_proc

### Update envoy.yaml

```yaml
static_resources:
  listeners:
    - address:
        socket_address:
          address: 0.0.0.0
          port_value: 8080
      filter_chains:
        - filters:
            - name: envoy.filters.network.http_connection_manager
              typed_config:
                "@type": type.googleapis.com/envoy.extensions.filters.network.http_connection_manager.v3.HttpConnectionManager
                codec_type: auto
                stat_prefix: ingress_http
                http_filters:
                  # Add ext_proc filter BEFORE router
                  - name: envoy.filters.http.ext_proc
                    typed_config:
                      "@type": type.googleapis.com/envoy.extensions.filters.http.ext_proc.v3.ExternalProcessor
                      grpc_service:
                        envoy_grpc:
                          cluster_name: ext_proc_cluster
                      processing_mode:
                        request_header_mode: SEND
                        response_header_mode: SKIP
                      request_attributes:
                        - headers
                  - name: envoy.filters.http.router
                    typed_config:
                      "@type": type.googleapis.com/envoy.extensions.filters.http.router.v3.Router

  clusters:
    # Add ext_proc cluster for Centrifuge gRPC
    - name: ext_proc_cluster
      connect_timeout: 1s
      type: strict_dns
      lb_policy: round_robin
      load_assignment:
        cluster_name: ext_proc_cluster
        endpoints:
          - lb_endpoints:
              - endpoint:
                  address:
                    socket_address:
                      address: centrifuge-server
                      port_value: 9091
      http2_protocol_options: {}
```

## Next Steps After Branch Switch

1. **Install dependencies** from Phase 1
2. **Create directory structure** from Phase 2
3. **Implement proto definitions** from Phase 3
4. **Set up basic Centrifuge server** from Phases 4-5
5. **Test gRPC communication** with Envoy ext_proc

## Development Workflow

```bash
# Start both servers in development
npm run dev:both

# Or start individually
npm run dev:fastify    # Port 8090 (existing)
npm run dev:centrifuge # Port 8091 (new)
```

## Testing Strategy

1. **Keep all existing Fastify tests** - no changes needed
2. **Add Centrifuge-specific tests** for gRPC and WebSocket
3. **Add integration tests** for auth proxy communication
4. **Add Envoy ext_proc tests** for header validation

This setup gives you:

- ✅ Existing Fastify server unchanged
- ✅ New Centrifuge server for real-time + gRPC
- ✅ Clean separation of concerns
- ✅ Easy to develop and deploy
- ✅ Ready for Envoy ext_proc integration

  Implementation Steps:

⏺ Step 1-2: Add Centrifuge Server

# Install Centrifuge

npm install centrifuge

# Create new centrifuge-server.js (separate from your Fastify server)

# Configure basic WebSocket + gRPC

Step 3: Auth Integration Bridge
// Add single endpoint to your existing Fastify server
app.post('/centrifuge/connect', async (req, reply) => {
// Reuse your existing auth validation logic
const user = await authService.verifyAccessToken(req.headers.authorization)
return { result: { user: user.id.toString() } }
})

Step 4: gRPC Service
// Add gRPC handlers to Centrifuge for Envoy ext_proc
// Move complex header validation from middleware to gRPC

Step 5: Frontend Integration
// Update frontend to connect to Centrifuge for real-time
// Keep all existing HTTP API calls to Fastify unchanged
