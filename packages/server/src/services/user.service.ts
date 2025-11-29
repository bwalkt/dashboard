import type { CreateUserData, GitHubUser, User } from "@pzero/shared";
import { db } from "../config/database.js";

export class UserService {
  /**
   * Get user by GitHub ID
   */
  public async getUserByGithubId(githubId: string): Promise<User | null> {
    const result = await db.pool.query(
      "SELECT * FROM users WHERE github_id = $1",
      [githubId],
    );
    return result.rows[0] || null;
  }

  /**
   * Get user by internal ID
   */
  public async getUserById(
    id: string,
    schema: string = "pzero",
  ): Promise<User | null> {
    const result = await db.pool.query(
      `SELECT * FROM ${schema}.auth WHERE id = $1`,
      [id],
    );
    return result.rows[0] || null;
  }

  /**
   * Get user by email
   */
  public async getUserByEmail(
    email: string,
    schema: string = "pzero",
  ): Promise<User | null> {
    const result = await db.pool.query(
      `SELECT * FROM ${schema}.auth WHERE email = $1`,
      [email],
    );
    return result.rows[0] || null;
  }

  /**
   * Create user from email registration
   */
  public async createUserFromEmail(userData: {
    email: string;
    name: string;
    email_verified?: boolean;
  }): Promise<User> {
    const createData: CreateUserData = {
      name: userData.name,
      email: userData.email,
      github_id: null,
      avatar: null,
      email_verified: userData.email_verified ?? false,
    };

    return this.createUser(createData);
  }

  /**
   * Generate a unique handle from email (username part, max 10 chars)
   */
  private generateHandle(email: string): string {
    // Extract username part from email and sanitize
    const username = email.split("@")[0];
    // Remove invalid characters and truncate to 10 chars
    const handle = username?.replace(/[^A-Za-z0-9._-]/g, "").substring(0, 10);
    return handle || "user";
  }

  /**
   * Create a new user
   */
  public async createUser(
    userData: CreateUserData,
    schema: string = "pzero",
  ): Promise<User> {
    // Generate handle from email
    const handle = this.generateHandle(userData.email);

    // Use the create_user postgres function
    const createResult = await db.pool.query(
      `SELECT ${schema}.create_user($1) as result`,
      [
        JSON.stringify({
          name: userData.name,
          email: userData.email,
          handle: handle,
          avatar: userData.avatar || null,
          email_verified: userData.email_verified ?? false,
          device: JSON.stringify(userData.device || {})
        }),
      ],
    );

    const { user_id } = createResult.rows[0].result;

    // Fetch the complete user record
    const userResult = await db.pool.query(
      `SELECT u.*, a.email, a.email_verified
       FROM ${schema}.all_users u
       JOIN ${schema}.all_auth a ON u.id = a.id
       WHERE u.id = $1`,
      [user_id],
    );

    return userResult.rows[0];
  }

  /**
   * Upsert user (insert or update on conflict)
   */
  public async upsertUser(userData: CreateUserData): Promise<User> {
    const result = await db.pool.query(
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

  /**
   * Upsert user from GitHub data
   */
  public async upsertUserFromGitHub(githubUser: GitHubUser): Promise<User> {
    const userData: CreateUserData = {
      github_id: githubUser.id,
      name: githubUser.name,
      email: githubUser.email,
      avatar: githubUser.avatar_url,
      email_verified: false,
    };

    return this.upsertUser(userData);
  }

  /**
   * Update user information
   */
  public async updateUser(
    id: string,
    userData: Partial<CreateUserData>,
    schema: string = "pzero",
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
      // Nothing to update
      return null;
    }

    values.push(id);

    const result = await db.pool.query(
      `UPDATE ${schema}.auth
       SET ${fields.join(", ")}
       WHERE id = $${paramCount}
       RETURNING *`,
      values,
    );

    return result.rows[0] || null;
  }

  /**
   * Validate GitHub user data
   */
  public validateGitHubUser(githubUser: any): GitHubUser | null {
    if (!githubUser || typeof githubUser !== "object") {
      return null;
    }

    const { id, login, name, email, avatar_url } = githubUser;

    if (!id || !login || typeof login !== "string") {
      return null;
    }

    return {
      id: id.toString(),
      login,
      name: name || login,
      email: email || "",
      avatar_url: avatar_url || "",
    };
  }

  /**
   * Sanitize user data for API responses
   */
  public sanitizeUserForResponse(user: User): Omit<User, "id"> {
    const { id, ...sanitizedUser } = user;
    return sanitizedUser;
  }
}

// Export singleton instance
export const userService = new UserService();
