# Async Logging from Envoy to PostgreSQL

## Architecture Overview

```
[Envoy/Wasm] --async--> [Node.js] --batch--> [PostgreSQL]
     |                       |                     |
  Fast Path             Buffer/Queue          Persistent
  (microseconds)        (milliseconds)        Storage
```

## Key Design Principles

### 1. Never Block Main Request Path
- Use fire-and-forget HTTP calls
- Set very short timeouts (100ms max)
- Don't wait for responses

### 2. Batch for Efficiency
```typescript
// In Wasm - batch events
const eventBuffer = [];
if (eventBuffer.length >= 100 || timeSinceLastFlush > 5000) {
  flush();
}

// In Node.js - batch inserts
INSERT INTO logs (columns...) VALUES 
  ($1, $2, $3),
  ($4, $5, $6),
  ($7, $8, $9)
```

### 3. Handle Failures Gracefully
- Log endpoint returns 200 immediately
- Process async after response
- Use circuit breakers in Envoy
- Implement retry logic with backoff

### 4. Optimize PostgreSQL Writes
```sql
-- Use COPY for bulk inserts
COPY auth_logs FROM STDIN CSV;

-- Or use batch INSERT
INSERT INTO auth_logs VALUES 
  (unnest($1::timestamptz[]), 
   unnest($2::inet[]),
   unnest($3::text[]));

-- Consider partitioning
CREATE TABLE auth_logs_2024_01 
PARTITION OF auth_logs 
FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
```

## Implementation Patterns

### Pattern 1: Immediate Async (Low Latency)
```typescript
// Fire immediately, don't batch
httpCall("log", headers, event, 100, () => {});
```

### Pattern 2: Batched Async (High Throughput)
```typescript
// Buffer and send in batches
eventBuffer.add(event);
if (shouldFlush()) {
  httpCall("log", headers, eventBuffer.toJSON(), 100, () => {});
  eventBuffer.clear();
}
```

### Pattern 3: Hybrid (Best of Both)
```typescript
// Immediate for critical, batched for normal
if (event.critical) {
  httpCall("log", headers, event, 100, () => {});
} else {
  eventBuffer.add(event);
}
```

## Node.js Best Practices

### 1. Use Queue for Reliability
```typescript
import Bull from 'bull';

const logQueue = new Bull('log-queue', {
  redis: { port: 6379, host: 'redis' }
});

// Add to queue
app.post('/async-logs', (req, res) => {
  res.status(200).send(); // Return immediately
  logQueue.add('process-logs', req.body);
});

// Process queue
logQueue.process('process-logs', async (job) => {
  await insertToPostgres(job.data);
});
```

### 2. Connection Pooling
```typescript
const pool = new Pool({
  max: 20, // Max connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

### 3. Error Handling
```typescript
setImmediate(async () => {
  try {
    await processLogs(events);
  } catch (error) {
    // Log error but don't crash
    console.error('Log processing failed:', error);
    // Could retry or send to dead letter queue
  }
});
```

## Monitoring

### Envoy Metrics
```bash
# Check logging stats
curl http://localhost:9901/stats/prometheus | grep log

# Circuit breaker status
curl http://localhost:9901/clusters | grep logging_cluster
```

### PostgreSQL Monitoring
```sql
-- Check write performance
SELECT 
  schemaname,
  tablename,
  n_tup_ins as inserts_per_sec,
  n_tup_upd as updates_per_sec
FROM pg_stat_user_tables
WHERE tablename LIKE '%log%';

-- Table sizes
SELECT 
  tablename,
  pg_size_pretty(pg_total_relation_size(tablename::regclass))
FROM pg_tables 
WHERE tablename LIKE '%log%';
```

## Troubleshooting

### If Logs Are Missing:
1. Check Envoy circuit breaker status
2. Verify Node.js endpoint is responsive
3. Check PostgreSQL connection pool
4. Look for errors in Node.js logs

### If Performance Degrades:
1. Increase batch size in Wasm
2. Add more Node.js workers
3. Optimize PostgreSQL (indexes, partitioning)
4. Use Redis queue for buffering

### If Database Grows Too Large:
1. Implement retention policies
2. Archive old data to S3/cold storage
3. Use partitioning with automatic dropping
4. Aggregate and delete raw data

## Example: Complete Setup

1. **Wasm batches events** (100 events or 5 seconds)
2. **Node.js receives batch** (returns 200 immediately)
3. **Redis queues events** (for reliability)
4. **Worker processes queue** (with retries)
5. **PostgreSQL stores data** (partitioned by day)
6. **Cron aggregates stats** (hourly rollups)
7. **Cleanup removes old data** (30-day retention)