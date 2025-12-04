import pg from "pg";
import { config } from "../config/env.js";

const { Pool } = pg;

class DatabaseManager {
  public pool: pg.Pool;
  private initialized: boolean = false;

  constructor() {
    this.pool = new Pool({
      host: config.POSTGRES_HOST,
      port: config.POSTGRES_PORT,
      user: config.POSTGRES_USER,
      password: config.POSTGRES_PASSWORD,
      database: config.POSTGRES_DB,
      max: config.POSTGRES_MAX_CLIENTS || 20,
      idleTimeoutMillis: config.POSTGRES_IDLE_TIMEOUT || 30000,
      connectionTimeoutMillis: config.POSTGRES_CONNECTION_TIMEOUT || 2000,
    });

    // Handle pool errors
    this.pool.on("error", (err) => {
      console.error("Unexpected error on idle client", err);
    });
  }

  public async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Test database connection
      const client = await this.pool.connect();
      client.release();

      this.initialized = true;
      console.log("✅ Database connected successfully");
      console.log('💡 Run "pnpm migrate:up" to apply migrations');
    } catch (error) {
      console.error("❌ Failed to connect to database:", error);
      throw error;
    }
  }

  public async close(): Promise<void> {
    await this.pool.end();
  }

  public getPool(): pg.Pool {
    return this.pool;
  }

  public async query(text: string, params?: any[]): Promise<pg.QueryResult> {
    return this.pool.query(text, params);
  }

  public async healthCheck(): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('SELECT 1');
    } finally {
      client.release();
    }
  }

  public async getMemoryInfo(): Promise<{ 
    shared_buffers: number; 
    effective_cache_size: number; 
    work_mem: number;
    maintenance_work_mem: number;
    database_size: number;
  }> {
    const client = await this.pool.connect();
    try {
      // Get PostgreSQL memory configuration and database size
      const memoryQuery = `
        SELECT 
          setting AS shared_buffers_blocks,
          (setting::bigint * 8192) AS shared_buffers_bytes
        FROM pg_settings WHERE name = 'shared_buffers'
        UNION ALL
        SELECT 
          setting AS effective_cache_size_blocks,
          (setting::bigint * 8192) AS effective_cache_size_bytes
        FROM pg_settings WHERE name = 'effective_cache_size'
        UNION ALL
        SELECT 
          setting AS work_mem_kb,
          (setting::bigint * 1024) AS work_mem_bytes
        FROM pg_settings WHERE name = 'work_mem'
        UNION ALL
        SELECT 
          setting AS maintenance_work_mem_kb,
          (setting::bigint * 1024) AS maintenance_work_mem_bytes
        FROM pg_settings WHERE name = 'maintenance_work_mem'
      `;
      
      const sizeQuery = `
        SELECT pg_database_size(current_database()) AS database_size;
      `;

      const [memoryResult, sizeResult] = await Promise.all([
        client.query(memoryQuery),
        client.query(sizeQuery)
      ]);

      const memoryData = memoryResult.rows;
      const databaseSize = parseInt(sizeResult.rows[0].database_size, 10);

      return {
        shared_buffers: parseInt(memoryData[0]?.shared_buffers_bytes || '0', 10),
        effective_cache_size: parseInt(memoryData[1]?.effective_cache_size_bytes || '0', 10),
        work_mem: parseInt(memoryData[2]?.work_mem_bytes || '0', 10),
        maintenance_work_mem: parseInt(memoryData[3]?.maintenance_work_mem_bytes || '0', 10),
        database_size: databaseSize,
      };
    } finally {
      client.release();
    }
  }
}

// Export singleton instance
export const db = new DatabaseManager();
