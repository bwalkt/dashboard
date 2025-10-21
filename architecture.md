# Architecture Overview

## System Architecture with OpenZiti Integration

```mermaid
graph TB
    subgraph "Client Layer"
        C1[Web Client 1<br/>with Ziti SDK]
        C2[Web Client 2<br/>with Ziti SDK]
        C3[Mobile Client<br/>with Ziti SDK]
    end
    
    subgraph "OpenZiti Fabric - Zero Trust Network"
        ZER[Ziti Edge Router]
        ZC[Ziti Controller]
        
        subgraph "Ziti Services"
            ZS1[REST API Service<br/>:3000]
            ZS2[WebSocket Service<br/>:8000]
        end
    end
    
    subgraph "Application Layer - Dark Network"
        NJS[Node.js Backend<br/>:3000<br/>- Business Logic<br/>- Auth/JWT<br/>- REST API]
        CENT[Centrifugo Server<br/>:8000<br/>- WebSocket Handler<br/>- Real-time Messaging<br/>- Presence/Channels]
    end
    
    subgraph "Data Layer"
        REDIS[(Redis<br/>:6379<br/>- Centrifugo Engine<br/>- Session Cache<br/>- Pub/Sub)]
        PG[(PostgreSQL<br/>:5432<br/>- User Data<br/>- Messages History<br/>- Application Data)]
    end
    
    C1 -->|REST via Ziti| ZER
    C2 -->|REST via Ziti| ZER
    C3 -->|REST via Ziti| ZER
    
    C1 -.->|WebSocket via Ziti| ZER
    C2 -.->|WebSocket via Ziti| ZER
    C3 -.->|WebSocket via Ziti| ZER
    
    ZER -->|Authorized| ZC
    ZC -->|Route to Service| ZS1
    ZC -.->|Route to Service| ZS2
    
    ZS1 -->|Tunneled Traffic| NJS
    ZS2 -.->|Tunneled Traffic| CENT
    
    NJS -->|HTTP API<br/>Publish/Admin| CENT
    NJS -->|Query/Write| PG
    NJS -->|Cache/Session| REDIS
    
    CENT -->|Broker/Scale| REDIS
    CENT -->|Optional History| PG
    
    style C1 fill:#e1f5fe
    style C2 fill:#e1f5fe
    style C3 fill:#e1f5fe
    style ZER fill:#fff3e0
    style ZC fill:#fff3e0
    style ZS1 fill:#ffecb3
    style ZS2 fill:#ffecb3
    style NJS fill:#e8f5e9
    style CENT fill:#e8f5e9
    style REDIS fill:#fce4ec
    style PG fill:#f3e5f5
```

## Hybrid Architecture with OpenZiti - Detailed View

```mermaid
graph LR
    subgraph "Internet"
        Client[Client Application<br/>+ Ziti SDK]
    end
    
    subgraph "OpenZiti Network Fabric"
        Client -->|1. REST API Calls<br/>Auth, CRUD| ZAPI[Ziti Service<br/>'api.service']
        Client -.->|2. WebSocket<br/>Real-time| ZWS[Ziti Service<br/>'realtime.service']
        
        ZAPI -->|Secure Tunnel<br/>No Public IP| NodeJS
        ZWS -.->|Secure Tunnel<br/>No Public IP| Centrifugo
    end
    
    subgraph "Private Network / Dark Services"
        NodeJS[Node.js<br/>localhost:3000]
        Centrifugo[Centrifugo<br/>localhost:8000]
        NodeJS -->|3. Publish Events<br/>HTTP API| Centrifugo
        
        NodeJS --> PostgreSQL[(PostgreSQL<br/>localhost:5432)]
        NodeJS --> Redis[(Redis<br/>localhost:6379)]
        Centrifugo --> Redis
    end
    
    style Client fill:#e1f5fe
    style ZAPI fill:#fff3e0
    style ZWS fill:#fff3e0
    style NodeJS fill:#e8f5e9
    style Centrifugo fill:#e8f5e9
    style Redis fill:#fce4ec
    style PostgreSQL fill:#f3e5f5
```

## Data Flow with OpenZiti

```mermaid
sequenceDiagram
    participant Client
    participant ZitiSDK
    participant ZitiRouter
    participant ZitiController
    participant NodeJS
    participant Centrifugo
    participant Redis
    participant PostgreSQL
    
    Note over Client,PostgreSQL: Initial Setup - Client Authentication
    Client->>ZitiSDK: Initialize with Identity
    ZitiSDK->>ZitiController: Authenticate Identity
    ZitiController-->>ZitiSDK: Service Access List
    
    Note over Client,PostgreSQL: REST API Call through Ziti
    Client->>ZitiSDK: POST /api/auth/login
    ZitiSDK->>ZitiRouter: Encapsulated Request
    ZitiRouter->>ZitiController: Route to 'api.service'
    ZitiController->>NodeJS: Tunneled HTTPS Request
    NodeJS->>PostgreSQL: Verify Credentials
    PostgreSQL-->>NodeJS: User Data
    NodeJS->>NodeJS: Generate JWT & Centrifugo Token
    NodeJS-->>Client: JWT + Connection Credentials
    
    Note over Client,Redis: WebSocket Connection through Ziti
    Client->>ZitiSDK: Connect WS to 'realtime.service'
    ZitiSDK->>ZitiRouter: Encapsulated WebSocket
    ZitiRouter->>ZitiController: Route to 'realtime.service'
    ZitiController->>Centrifugo: Tunneled WebSocket
    Centrifugo->>Centrifugo: Validate Token
    Centrifugo->>Redis: Register Client
    Centrifugo-->>Client: WebSocket Connected
    
    Note over Client,Redis: Publishing Messages
    Client->>ZitiSDK: POST /api/messages
    ZitiSDK->>NodeJS: Via Ziti Tunnel
    NodeJS->>PostgreSQL: Store Message
    NodeJS->>Centrifugo: Publish via Internal API
    Centrifugo->>Redis: Broadcast to Channel
    Redis-->>Centrifugo: Active Subscribers
    Centrifugo-->>Client: Real-time via WebSocket
```

## OpenZiti Integration Details

### 1. Zero Trust Architecture Benefits

- **No Public IPs**: Neither Node.js nor Centrifugo have public IP addresses
- **Identity-Based Access**: Clients must have valid Ziti identity to connect
- **Microsegmentation**: Different services can have different access policies
- **End-to-End Encryption**: All traffic encrypted through Ziti fabric

### 2. Service Configuration

```yaml
# Ziti Services Configuration

api.service:
  - Type: TCP
  - Host: nodejs-container or localhost
  - Port: 3000
  - Intercept: api.myapp.ziti
  - Allowed Identities: authenticated-users

realtime.service:
  - Type: TCP/WebSocket
  - Host: centrifugo-container or localhost  
  - Port: 8000
  - Intercept: realtime.myapp.ziti
  - Allowed Identities: authenticated-users
```

### 3. Client Connection Flow

1. **Client SDK Integration**:
   - Web: Ziti BrowZer SDK
   - Mobile: Native Ziti SDKs
   - Desktop: Ziti Desktop Edge

2. **Service Access**:
   ```javascript
   // Client connects to services via Ziti addresses
   const api = 'https://api.myapp.ziti'
   const websocket = 'wss://realtime.myapp.ziti'
   ```

3. **No Direct Internet Access**:
   - Services run on localhost or private network
   - Only accessible through Ziti fabric
   - Complete invisibility from internet scans

### 4. Security Layers

```mermaid
graph TD
    subgraph "Security Layers"
        A[Client Identity<br/>Ziti Certificate/JWT] --> B[Ziti Network Auth<br/>mTLS + Zero Trust]
        B --> C[Service Authorization<br/>Policy-Based Access]
        C --> D[Application Auth<br/>JWT/Session]
        D --> E[Data Encryption<br/>TLS + App-Level]
    end
```

## Why This Architecture is Optimal

### Advantages

1. **Complete Security**: Services are completely dark to the internet
2. **Scalability**: Centrifugo handles WebSocket scale, Node.js handles business logic
3. **Separation of Concerns**: Clear boundaries between real-time and business logic
4. **Performance**: Direct WebSocket to Centrifugo (no proxy overhead)
5. **Flexibility**: Can scale Node.js and Centrifugo independently

### Network Flow Optimization

- **REST API** (via Node.js): Authentication, CRUD operations, business logic
- **WebSocket** (via Centrifugo): Real-time updates, presence, live features  
- **Internal Communication**: Node.js → Centrifugo API for publishing
- **Zero Trust**: All external access through OpenZiti

### Scalability Considerations

```mermaid
graph LR
    subgraph "Horizontal Scaling"
        C1[Centrifugo-1] --> R[Redis Cluster]
        C2[Centrifugo-2] --> R
        C3[Centrifugo-3] --> R
        
        N1[NodeJS-1] --> R
        N2[NodeJS-2] --> R
        N3[NodeJS-3] --> R
        
        R --> PG[(PostgreSQL<br/>Primary-Replica)]
    end
```

Each component scales independently:
- **Centrifugo**: Add nodes for more WebSocket connections
- **Node.js**: Add instances for more API throughput
- **Redis**: Cluster mode for high availability
- **PostgreSQL**: Read replicas for query scaling
- **OpenZiti**: Multiple edge routers for redundancy