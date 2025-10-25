import type { CreateUserData, User } from '@pzero/shared'
import pg from 'pg'

const { Pool } = pg

class DatabaseManager {
  private pool: pg.Pool
  private initialized: boolean = false

  constructor() {
    this.pool = new Pool({
      host: process.env.POSTGRES_HOST || 'localhost',
      port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
      user: process.env.POSTGRES_USER || 'postgres',
      password: process.env.POSTGRES_PASSWORD || 'postgres',
      database: process.env.POSTGRES_DB || 'pzero',
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    })

    // Handle pool errors
    this.pool.on('error', (err) => {
      console.error('Unexpected error on idle client', err)
    })
  }

  public async initialize(): Promise<void> {
    if (this.initialized) return

    try {
      // Test database connection
      const client = await this.pool.connect()
      client.release()

      this.initialized = true
      console.log('✅ Database connected successfully')
      console.log('💡 Run "pnpm migrate:up" to apply migrations')
    } catch (error) {
      console.error('❌ Failed to connect to database:', error)
      throw error
    }
  }

  public async getUserByGithubId(githubId: string): Promise<User | null> {
    const result = await this.pool.query(
      'SELECT * FROM users WHERE github_id = $1',
      [githubId]
    )
    return result.rows[0] || null
  }

  public async getUserById(id: number): Promise<User | null> {
    const result = await this.pool.query(
      'SELECT * FROM users WHERE id = $1',
      [id]
    )
    return result.rows[0] || null
  }

  public async createUser(userData: CreateUserData): Promise<User> {
    const result = await this.pool.query(
      `INSERT INTO users (github_id, name, email, avatar)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [userData.github_id, userData.name, userData.email, userData.avatar]
    )

    return result.rows[0]
  }

  public async updateUser(githubId: string, userData: Partial<CreateUserData>): Promise<User | null> {
    const fields: string[] = []
    const values: any[] = []
    let paramCount = 1

    if (userData.name !== undefined) {
      fields.push(`name = $${paramCount++}`)
      values.push(userData.name)
    }
    if (userData.email !== undefined) {
      fields.push(`email = $${paramCount++}`)
      values.push(userData.email)
    }
    if (userData.avatar !== undefined) {
      fields.push(`avatar = $${paramCount++}`)
      values.push(userData.avatar)
    }

    if (fields.length === 0) {
      return this.getUserByGithubId(githubId)
    }

    fields.push('updated_at = CURRENT_TIMESTAMP')
    values.push(githubId)

    const result = await this.pool.query(
      `UPDATE users
       SET ${fields.join(', ')}
       WHERE github_id = $${paramCount}
       RETURNING *`,
      values
    )

    return result.rows[0] || null
  }

  public async upsertUser(userData: CreateUserData): Promise<User> {
    const existingUser = await this.getUserByGithubId(userData.github_id)

    if (existingUser) {
      const updated = await this.updateUser(userData.github_id, userData)
      return updated || existingUser
    } else {
      return this.createUser(userData)
    }
  }

  public async close(): Promise<void> {
    await this.pool.end()
  }

  public getPool(): pg.Pool {
    return this.pool
  }
}

// Export singleton instance
export const db = new DatabaseManager()
