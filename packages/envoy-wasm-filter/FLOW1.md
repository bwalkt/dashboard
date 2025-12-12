sequenceDiagram
    actor Client
    participant Envoy as Envoy WASM Filter
    participant Shared as Shared Data Cache
    participant AuthZ as AuthZ Service
    participant Origin as Origin Server

    Client->>Envoy: HTTP request (protected route)
    Envoy->>Envoy: Extract & validate challenge headers
    Envoy->>Shared: GET key "challenge:<id>"
    alt Cache hit & matches provided answer
        Shared-->>Envoy: expectedAnswer (match)
        Envoy->>Origin: Forward request
        Origin-->>Client: 200/response
    else Cache hit & mismatch
        Shared-->>Envoy: expectedAnswer (mismatch)
        Envoy-->>Client: 403 Forbidden
    else Cache miss
        Envoy->>AuthZ: async POST /validate {challengeId, challengeAnswer}
        Envoy-->>Client: Request paused / held
        AuthZ->>AuthZ: verifyChallenge(...)
        alt AuthZ validates
            AuthZ-->>Envoy: 200 {ok:true, expectedAnswer, x-challenge-ttl}
            Envoy->>Shared: SET challenge:<id> = expectedAnswer (with TTL)
            Envoy->>Origin: Resume & forward request
            Origin-->>Client: 200/response
        else AuthZ rejects
            AuthZ-->>Envoy: 403 {ok:false, message}
            Envoy-->>Client: 403 Forbidden
        end
    end
