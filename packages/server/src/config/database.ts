import type { CreateUserData, User } from "@pzero/shared";
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
public async getUserByGithubId(githubId: string): Promise<User | null> {
  const result = await this.pool.query(
    "SELECT * FROM users WHERE github_id = $1",
    [githubId],
  );
  return result.rows[0] || null;
}

public async getUserById(id: string, schema: string = 'pzero'): Promise<User | null> {

    const result = await this.pool.query(`SELECT * FROM ${schema}.auth WHERE id = $1`, [
      id,
    ]);
    return result?.rows[0] || null;
  }

  public async getUserByEmail(email: string, schema: string = 'pzero'): Promise<User | null> {
    const result = await this.pool.query(
      `SELECT * FROM ${schema}.auth WHERE email = $1`,
      [email],
    );
    return result.rows[0] || null;
  }

  public async createUser(userData: CreateUserData, schema: string = 'pzero'): Promise<User> {
    const result = await this.pool.query(
      `INSERT INTO ${schema}.auth ( name, email)
       VALUES ($1, $2)
       RETURNING *`,
      [
        userData.name,
        userData.email
      ],
    );

    return result.rows[0];
  }

  public async updateUser(
    userData: Partial<CreateUserData>,
  ): Promise<User | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (userData.name !== undefined) {
      fields.push(`name = $${paramCount++}`);
      values.push(userData.name);
    }
    if (userData.email !== undefined) {
      fields.push(`email = $${paramCount++}`);
      values.push(userData.email);
    }
    if (userData.avatar !== undefined) {
      fields.push(`avatar = $${paramCount++}`);
      values.push(userData.avatar);
    }

    if (fields.length === 0) {
      return this.getUserByGithubId(githubId);
    }

    fields.push("updated_at = CURRENT_TIMESTAMP");
    values.push(githubId);

    const result = await this.pool.query(
      `UPDATE users
       SET ${fields.join(", ")}
       WHERE github_id = $${paramCount}
       RETURNING *`,
      values,
    );

    return result.rows[0] || null;
  }

  public async upsertUser(userData: CreateUserData): Promise<User> {
    const result = await this.pool.query(
      `INSERT INTO users (github_id, name, email, avatar)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (github_id)
       DO UPDATE SET
         name = EXCLUDED.name,
         email = EXCLUDED.email,
         avatar = EXCLUDED.avatar,
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [userData.github_id, userData.name, userData.email, userData.avatar],
    );
    return result.rows[0];
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
