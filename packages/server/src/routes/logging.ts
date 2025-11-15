import type { FastifyPluginAsync } from 'fastify';
import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'postgres',
  database: process.env.POSTGRES_DB || 'pzero',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

const loggingRoutes: FastifyPluginAsync = async (fastify) => {
  
  // Async endpoint that Envoy calls
  fastify.post('/async-logs', async (request, reply) => {
    // Verify it's an internal request from Envoy
    if (request.headers['x-internal-request'] !== 'true') {
      return reply.status(403).send({ error: 'Forbidden' });
    }
    
    // Return immediately - don't make Envoy wait
    reply.send({ received: true });
    
    // Process asynchronously after response
    setImmediate(async () => {
      try {
        const { events } = request.body as { events: any[] };
        
        if (!events || !Array.isArray(events)) {
          return;
        }
        
        // Batch insert into PostgreSQL
        await insertEvents(events);
        
      } catch (error) {
        fastify.log.error('Failed to persist events:', error);
        // Don't throw - this is async processing
      }
    });
  });

  // Redis proxy endpoint
  fastify.post('/redis-proxy', async (request, reply) => {
    // Verify it's an internal request
    if (request.headers['x-internal-request'] !== 'true') {
      return reply.status(403).send({ error: 'Forbidden' });
    }

    const { operation, key, value, ttl } = request.body as {
      operation: string;
      key: string;
      value?: string;
      ttl?: number;
    };
    
    try {
      // In a real implementation, you'd use Redis client here
      // For now, just return mock response
      switch (operation) {
        case 'get':
          return { value: null }; // Mock response
          
        case 'set':
          return { success: true };
          
        case 'exists':
          return { exists: false };
          
        default:
          return reply.status(400).send({ error: 'Invalid operation' });
      }
    } catch (error) {
      fastify.log.error('Redis operation failed:', error);
      return reply.status(500).send({ error: 'Redis operation failed' });
    }
  });

  // Validation endpoint
  fastify.post('/validate-header', async (request, reply) => {
    const customHeader = request.headers['x-custom-auth'] as string;
    
    // Call your internal validation function
    const isValid = await validateHeaderInternal(customHeader);
    
    if (isValid) {
      return { valid: true };
    } else {
      return reply.status(401).send({ valid: false });
    }
  });
};

async function insertEvents(events: any[]) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    for (const event of events) {
      switch (event.type) {
        case 'auth_success':
          await client.query(
            `INSERT INTO auth_logs (timestamp, client_ip, path, method, token_prefix, status)
             VALUES ($1, $2, $3, $4, $5, 'success')`,
            [new Date(event.timestamp), event.client_ip, event.path, event.method, event.token]
          );
          break;
          
        case 'auth_failed':
          await client.query(
            `INSERT INTO auth_logs (timestamp, client_ip, path, reason, status)
             VALUES ($1, $2, $3, $4, 'failed')`,
            [new Date(event.timestamp), event.client_ip, event.path, event.reason]
          );
          break;
          
        case 'request_complete':
          await client.query(
            `INSERT INTO request_logs (timestamp, client_ip, duration_ms, status_code, auth_status)
             VALUES ($1, $2, $3, $4, $5)`,
            [new Date(event.timestamp), event.client_ip, event.duration_ms, event.status_code, event.auth_status]
          );
          break;
      }
    }
    
    await client.query('COMMIT');
    
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// Your internal validation logic
async function validateHeaderInternal(header: string): Promise<boolean> {
  // Your validation logic here
  return header === 'secret-value-123';
}

export default loggingRoutes;