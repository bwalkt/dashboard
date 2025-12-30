# Envoy WASM Filter

A Go-based Envoy WASM filter that implements a challenge-response authentication system for Envoy proxy. It validates incoming requests using challenge headers and maintains a cache of validated challenges for performance optimization.

## Overview

This WASM filter validates challenge headers (`x-challenge-id` and `x-challenge-answer`) using Envoy's shared data cache with fallback to the authz-service via async HTTP calls. The filter provides fast in-memory lookups for repeated challenges while ensuring security through TTL-based cache expiry.

## Prerequisites

- Go 1.21 or later
- TinyGo (for WASM compilation)
  - Install: `brew install tinygo` (macOS) or download from [tinygo.org](https://tinygo.org/getting-started/install/)

## Building

Install Go dependencies and build the filter:

```bash
cd packages/envoy-wasm-filter
make build
```

This will compile the Go code to `build/filter.wasm` using TinyGo.

## Architecture Flow

```mermaid
sequenceDiagram
    actor Client
    participant Envoy as Envoy WASM Filter
    participant Shared as Shared Data Cache
    participant AuthZ as AuthZ Service
    participant Origin as Origin Server
    
    Client->>Envoy: HTTP request (protected route)
    Envoy->>Envoy: Extract & validate challenge headers<br/>x-challenge-id, x-challenge-answer
    Envoy->>Shared: GET key "challenge:<id>"
    
    alt Cache hit & matches provided answer
        Shared-->>Envoy: expectedAnswer (match)
        Envoy->>Origin: Forward request (ActionContinue)
        Origin-->>Client: 200/response
    else Cache hit & answer mismatch
        Shared-->>Envoy: expectedAnswer (mismatch)
        Envoy-->>Client: 403 Forbidden (invalid challenge answer)
    else Cache miss
        Envoy->>AuthZ: async POST /validate {challengeId, challengeAnswer}
        Envoy-->>Client: Request paused (ActionPause)
        AuthZ->>AuthZ: verifyChallenge(challengeId, challengeAnswer)
        
        alt AuthZ validates successfully
            AuthZ-->>Envoy: 200 {ok:true, expectedAnswer}<br/>with optional x-challenge-ttl
            Envoy->>Shared: SET challenge:<id> = expectedAnswer (with TTL)
            Envoy->>Envoy: ResumeHttpRequest()
            Envoy->>Origin: Resume & forward request
            Origin-->>Client: 200/response
        else AuthZ rejects challenge
            AuthZ-->>Envoy: 403 {ok:false, message}
            Envoy-->>Client: 403 Forbidden
        end
    end
```

## Detailed Processing Flow

```mermaid
flowchart TD
    Start([HTTP Request Arrives]) --> GetHeaders[Extract Request Headers<br/>:path, :method]
    
    GetHeaders --> CheckPublic{Is Public Route?}
    
    CheckPublic -->|YES| AllowPublic[Allow Request]
    CheckPublic -->|NO| CheckOptions{Is OPTIONS?}
    
    CheckOptions -->|YES| AllowCORS[Allow CORS Preflight]
    CheckOptions -->|NO| ExtractChallenge[Extract Challenge Headers<br/>x-challenge-id<br/>x-challenge-answer]
    
    ExtractChallenge --> ValidatePresence{Headers Present?}
    
    ValidatePresence -->|NO| Block403A[Return 403<br/>Missing Headers]
    ValidatePresence -->|YES| ValidateFormat{Valid Format?}
    
    ValidateFormat -->|NO| Block403B[Return 403<br/>Invalid Format]
    ValidateFormat -->|YES| CheckCache{Check Shared Data Cache}
    
    CheckCache --> CacheFound{Found in Cache?}
    
    CacheFound -->|YES| CheckExpiry{Entry Expired?}
    CheckExpiry -->|YES| DeleteExpired[Delete Expired Entry]
    CheckExpiry -->|NO| ValidateCached{Answer Matches?}
    
    ValidateCached -->|YES| AllowCached[Allow Request<br/>From Cache]
    ValidateCached -->|NO| Block403C[Return 403<br/>Answer Mismatch]
    
    DeleteExpired --> CallAuthz
    CacheFound -->|NO| CallAuthz[Store Challenge Context<br/>Dispatch HTTP Call to authz-service]
    
    CallAuthz --> PauseRequest[Pause Request Processing<br/>ActionPause]
    
    PauseRequest --> WaitCallback[Wait for HTTP Callback]
    
    WaitCallback --> Callback[HTTP Callback Received]
    
    Callback --> CheckStatus{Status 200?}
    
    CheckStatus -->|NO| Block403D[Return 403<br/>Validation Failed]
    CheckStatus -->|YES| ParseResponse[Parse JSON Response]
    
    ParseResponse --> CheckOK{Response OK?}
    
    CheckOK -->|NO| Block403E[Return 403<br/>Invalid Challenge]
    CheckOK -->|YES| CacheResult[Cache Challenge Answer<br/>with TTL]
    
    CacheResult --> ResumeRequest[Resume Request<br/>proxywasm.ResumeHttpRequest]
    
    ResumeRequest --> AllowValidated[Allow Request<br/>ActionContinue]
    
    AllowPublic --> End([Request Continues])
    AllowCORS --> End
    AllowCached --> End
    AllowValidated --> End
    
    Block403A --> EndBlocked([Request Blocked])
    Block403B --> EndBlocked
    Block403C --> EndBlocked
    Block403D --> EndBlocked
    Block403E --> EndBlocked
    
    style Start fill:#e1f5e1
    style End fill:#e1f5e1
    style EndBlocked fill:#ffe1e1
    style Block403A fill:#ffcccc
    style Block403B fill:#ffcccc
    style Block403C fill:#ffcccc
    style Block403D fill:#ffcccc
    style Block403E fill:#ffcccc
    style AllowPublic fill:#ccffcc
    style AllowCORS fill:#ccffcc
    style AllowCached fill:#ccffcc
    style AllowValidated fill:#ccffcc
    style PauseRequest fill:#fff3cd
    style ResumeRequest fill:#fff3cd
    style CallAuthz fill:#cce5ff
    style Callback fill:#cce5ff
```

## Filter Behavior

### 1. Public Routes
Bypasses validation for public routes:
- `/health` (exact match)
- `/auth/*` (prefix)
- `/centrifugo/*` (prefix)
- `/sms/*` (prefix)
- `/email/*` (prefix)
- `/proxy/auth/login` (prefix)
- `/proxy/auth/callback` (prefix)
- `/proxy/auth/refresh` (prefix)
- `/faq` (exact match)
- `/terms` (exact match)
- `/public/*` (prefix)
- `/docs/*` (prefix)
- `/assets/*` (prefix)
- OPTIONS requests (CORS preflight)

### 2. Protected Routes
Requires `x-challenge-id` and `x-challenge-answer` headers:
- First checks Envoy shared data cache (fast in-memory lookup)
- If cache miss, makes async HTTP call to `authz-service:3000/validate`
- Caches successful validations in shared data with TTL (3600s default)
- Returns 403 if validation fails

## Shared Data Cache

The filter uses Envoy's shared data for high-performance caching:

```mermaid
flowchart TB
    subgraph Cache Entry Structure
        Entry[ChallengeCacheEntry]
        Entry --> Value[value: string<br/>Challenge Answer]
        Entry --> Expires[expiresAt: uint32<br/>Unix Timestamp]
    end
    
    subgraph Cache Operations
        Get[GetChallengeFromSharedData]
        Set[SetChallengeInSharedData]
        
        Get --> CheckExp{Expired?}
        CheckExp -->|YES| Delete[Delete Entry]
        CheckExp -->|NO| Return[Return Value]
        
        Set --> CalcExp[Calculate Expiry<br/>Now + TTL]
        CalcExp --> Store[Store JSON Entry]
    end
```

## Key Features

### Security
- **Challenge Validation**: All non-public routes require valid challenge headers
- **Answer Verification**: Validates challenge answers against expected values
- **Cache Security**: TTL-based expiry prevents stale challenges

### Performance
- **Shared Data Cache**: Reduces authz-service calls for repeated challenges
- **TTL Management**: Automatic cleanup of expired entries
- **Async Processing**: Non-blocking HTTP calls to authz-service

### Resilience
- **Fallback to AuthZ**: Cache miss triggers validation via external service
- **Error Handling**: Graceful degradation on service failures
- **CORS Support**: Automatic OPTIONS request passthrough

## Error Scenarios

```mermaid
flowchart TD
    Err1[Missing Headers] --> R403A[403: missing challenge headers]
    Err2[Invalid Format] --> R403B[403: invalid challenge format]
    Err3[Answer Mismatch] --> R403C[403: invalid challenge answer]
    Err4[AuthZ Failed] --> R403D[403: challenge validation failed]
    Err5[Service Error] --> R500[500: validation service error]
    
    style R403A fill:#ffcccc
    style R403B fill:#ffcccc
    style R403C fill:#ffcccc
    style R403D fill:#ffcccc
    style R500 fill:#ffaaaa
```

## Configuration

### Environment Variables
- **authz_cluster**: Envoy cluster configuration for authz-service
- **Default TTL**: 3600 seconds (1 hour)

### Headers
- **Request Headers**:
  - `x-challenge-id`: Unique challenge identifier
  - `x-challenge-answer`: Challenge response value
  
- **Response Headers**:
  - `x-challenge-ttl`: Optional TTL override (from authz-service)

### Envoy Configuration
```yaml
http_filters:
  - name: envoy.filters.http.wasm
    typed_config:
      "@type": type.googleapis.com/envoy.extensions.filters.http.wasm.v3.Wasm
      config:
        root_id: challenge_handler
        vm_config:
          vm_id: challenge_handler
          runtime: envoy.wasm.runtime.v8
          code:
            local:
              filename: /etc/envoy/filter.wasm
```

## Usage

The compiled WASM file is mounted into the Envoy container at `/etc/envoy/wasm/challenge-authz.wasm` and configured in `packages/server/envoy-wasm.yaml`.

The WASM filter runs in a separate Envoy container (`pzero-envoy-wasm`) on port 8182 (external) → 8081 (internal).

## Testing

### Quick Test

Run a simple smoke test:

```bash
./quick-test.sh
```

This tests:
- Public route bypass
- Protected route rejection without challenge
- Valid challenge acceptance
- Invalid challenge rejection

### Full Test Suite

Run comprehensive tests:

```bash
./test-filter.sh
```

This tests:
- Public route bypass for all public routes
- Protected routes without challenge headers
- Invalid challenge scenarios
- Valid challenge validation (cache miss and cache hit)
- Direct `/validate` endpoint testing
- Error cases

### Manual Testing Flow
1. Send request without headers → Expect 403
2. Send request with invalid headers → Expect 403
3. Send valid challenge → Expect pass + cache
4. Repeat same challenge → Expect cache hit
5. Wait for TTL expiry → Expect cache miss

### Environment Variables

You can customize the test URLs:

```bash
ENVOY_WASM_URL=http://localhost:8182 \
AUTHZ_SERVICE_URL=http://localhost:3002 \
CHALLENGE_SECRET=your-secret \
./test-filter.sh
```

### Load Testing Considerations
- Monitor shared data memory usage
- Check authz-service latency impact
- Validate cache hit/miss ratios
- Test concurrent request handling

## Development

The filter is written in Go using the [proxy-wasm-go-sdk](https://github.com/proxy-wasm/proxy-wasm-go-sdk).

### Build Process

**Requirements:**
- Go 1.24+ (for WASI support)
- Target: `GOOS=wasip1 GOARCH=wasm`

```bash
# Compile with upstream Go (requires Go 1.24+)
GOOS=wasip1 GOARCH=wasm go build -o filter.wasm ./src

# Build using Makefile
make build

# Docker multi-stage build
docker build -t envoy-wasm-filter .
```

**Note:** The new proxy-wasm/proxy-wasm-go-sdk requires upstream Go 1.24+ with WASI support, not TinyGo.

## Architecture

- **Shared Data Cache**: Fast in-memory lookups using Envoy's shared data (per-worker)
- **HTTP Fallback**: Async calls to authz-service when cache misses
- **TTL**: 3600 seconds (1 hour) matching Redis TTL
- **Async Processing**: Non-blocking HTTP calls using `DispatchHttpCall`