import type { CreateUserData, User } from '@pzero/shared'
import Database from 'better-sqlite3'

class DatabaseManager {
  private db: Database.Database

  constructor() {
    const dbPath = process.env.DATABASE_PATH || './database.db'
    this.db = new Database(dbPath)
    this.initializeDatabase()
  }

  private initializeDatabase(): void {
    // Create users table
    const createUsersTable = `
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        github_id TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        avatar TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `

    this.db.exec(createUsersTable)

    // Create index on github_id for faster lookups
    const createIndex = `
      CREATE INDEX IF NOT EXISTS idx_users_github_id ON users(github_id)
    `

    this.db.exec(createIndex)
  }

  public getUserByGithubId(githubId: string): User | null {
    const stmt = this.db.prepare('SELECT * FROM users WHERE github_id = ?')
    return stmt.get(githubId) as User | null
  }

  public getUserById(id: number): User | null {
    const stmt = this.db.prepare('SELECT * FROM users WHERE id = ?')
    return stmt.get(id) as User | null
  }

  public createUser(userData: CreateUserData): User {
    const stmt = this.db.prepare(`
      INSERT INTO users (github_id, name, email, avatar)
      VALUES (?, ?, ?, ?)
    `)

    const result = stmt.run(userData.github_id, userData.name, userData.email, userData.avatar)

    return this.getUserById(result.lastInsertRowid as number)!
  }

  public updateUser(githubId: string, userData: Partial<CreateUserData>): User | null {
    const fields = []
    const values = []

    if (userData.name !== undefined) {
      fields.push('name = ?')
      values.push(userData.name)
    }
    if (userData.email !== undefined) {
      fields.push('email = ?')
      values.push(userData.email)
    }
    if (userData.avatar !== undefined) {
      fields.push('avatar = ?')
      values.push(userData.avatar)
    }

    if (fields.length === 0) {
      return this.getUserByGithubId(githubId)
    }

    fields.push('updated_at = CURRENT_TIMESTAMP')
    values.push(githubId)

    const stmt = this.db.prepare(`
      UPDATE users 
      SET ${fields.join(', ')} 
      WHERE github_id = ?
    `)

    stmt.run(...values)
    return this.getUserByGithubId(githubId)
  }

  public upsertUser(userData: CreateUserData): User {
    const existingUser = this.getUserByGithubId(userData.github_id)

    if (existingUser) {
      return this.updateUser(userData.github_id, userData) || existingUser
    } else {
      return this.createUser(userData)
    }
  }

  public close(): void {
    this.db.close()
  }
}

// Export singleton instance
export const db = new DatabaseManager()
