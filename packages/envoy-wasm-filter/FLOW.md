# Envoy WASM Filter - Challenge Authentication Flow

## Overview

This Go-based WASM filter implements a challenge-response authentication system for Envoy proxy. It validates incoming requests using challenge headers and maintains a cache of validated challenges for performance optimization.

## Architecture Flow

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

## Component Details

### 1. Main Entry Point (`main.go`)

The filter initializes through the proxy-wasm SDK:

```mermaid
flowchart LR
    Main[main.go] --> VM[VM Context]
    VM --> Plugin[Plugin Context]
    Plugin --> HTTP[HTTP Context<br/>Per Request]
    
    HTTP --> OnReq[OnHttpRequestHeaders]
    OnReq --> Process[Process Request]
```

### 2. Request Processing Pipeline

```mermaid
sequenceDiagram
    participant Client
    participant Envoy
    participant WASM as WASM Filter
    participant Cache as Shared Data
    participant AuthZ as AuthZ Service
    
    Client->>Envoy: HTTP Request
    Envoy->>WASM: OnHttpRequestHeaders
    
    alt Public Route
        WASM->>WASM: Check PublicRoutes list
        WASM->>Envoy: ActionContinue
        Envoy->>Client: Forward to Upstream
    else Protected Route
        WASM->>WASM: Extract Challenge Headers
        WASM->>Cache: GetSharedData(challenge:id)
        
        alt Cache Hit
            Cache->>WASM: Return Cached Answer
            WASM->>WASM: Validate Answer
            alt Valid
                WASM->>Envoy: ActionContinue
            else Invalid
                WASM->>Envoy: SendHttpResponse(403)
            end
        else Cache Miss
            WASM->>Envoy: ActionPause
            WASM->>AuthZ: DispatchHttpCall(/validate)
            Note over WASM: Async Call
            AuthZ->>WASM: Callback Response
            
            alt Valid Response
                WASM->>Cache: SetSharedData(challenge:id)
                WASM->>Envoy: ResumeHttpRequest
                WASM->>Envoy: ActionContinue
            else Invalid Response
                WASM->>Envoy: SendHttpResponse(403)
            end
        end
    end
```

### 3. Public Routes

The filter bypasses validation for:
- `/health` (exact match)
- `/auth/*` (prefix)
- `/centrifugo/*` (prefix)
- `/sms/*`, `/email/*` (prefixes)
- `/proxy/auth/login`, `/proxy/auth/callback`, `/proxy/auth/refresh`
- `/faq`, `/terms` (exact)
- `/public/*`, `/docs/*`, `/assets/*`
- All `OPTIONS` requests (CORS)

### 4. Shared Data Cache

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

### 5. HTTP Client Integration

```mermaid
flowchart LR
    subgraph Async HTTP Call
        Dispatch[DispatchHttpCall] --> Headers[Set Headers<br/>:method, :path, :authority]
        Headers --> Body[JSON Body<br/>challengeId, challengeAnswer]
        Body --> Send[Send to authz_cluster]
        Send --> Timeout[5 second timeout]
        Timeout --> CB[Callback Function]
    end
    
    subgraph Callback Processing
        CB --> Status[Parse Status Code]
        Status --> RespBody[Get Response Body]
        RespBody --> Parse[Parse JSON]
        Parse --> Validate[Check OK field]
        Validate --> Cache[Cache if Valid]
        Cache --> Resume[Resume Request]
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

## Build and Deployment

### Build Process
```bash
# Compile with TinyGo
tinygo build -o filter.wasm -scheduler=none -target=wasi main.go

# Docker multi-stage build
docker build -t envoy-wasm-filter .
```

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

## Testing

### Manual Testing Flow
1. Send request without headers → Expect 403
2. Send request with invalid headers → Expect 403
3. Send valid challenge → Expect pass + cache
4. Repeat same challenge → Expect cache hit
5. Wait for TTL expiry → Expect cache miss

### Load Testing Considerations
- Monitor shared data memory usage
- Check authz-service latency impact
- Validate cache hit/miss ratios
- Test concurrent request handling