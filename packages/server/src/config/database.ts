import pg from "pg";
import { config } from "../config/env";

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
}

// Export singleton instance
export const db = new DatabaseManager();
