import type { CreateUserData, GitHubUser, User } from "@pzero/shared";
import { db } from "../config/database";

export class UserService {
  /**
   * Get user by GitHub ID
   */
  public async getUserByGithubId(githubId: string): Promise<User | null> {
    return db.getUserByGithubId(githubId);
  }

  /**
   * Get user by internal ID
   */
  public async getUserById(id: string, schema: string = 'pzero'): Promise<User | null> {
    
    const result = await db.pool.query(`SELECT * FROM ${schema}.auth WHERE id = $1`, [
      id,
    ]);
    return result?.rows[0] || null;
  }

  /**
   * Get user by email
   */
  public async getUserByEmail(email: string): Promise<User | null> {
    const result = await db.pool.query(`SELECT * from public.users where email=$1`, [email])
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
      github_id: "",
      avatar: ""
    };

    return db.createUser(createData);
  }

  /**
   * Create a new user
   */
  public async createUser(userData: CreateUserData): Promise<User> {
    return db.createUser(userData);
  }

  /**
   * Update user information
   */
  public async updateUser(
    id: string,
    userData: Partial<CreateUserData>,
    schema: string = 'pzero'
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
    values.push(id);

    const result = await db.pool.query(
      `UPDATE ${schema}.users
       SET ${fields.join(", ")}
       WHERE id = $${id}
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
