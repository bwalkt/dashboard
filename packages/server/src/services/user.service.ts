import type { CreateUserData, GitHubUser, User } from "@pzero/shared";
import { generateHandleFromEmail } from '@pzero/shared/pzero'
import { db } from "../config/database.js";
import { config } from "../config/env.js";
import { redis } from "../config/redis.js";

/**
 * User with status field from all_users table
 * This type represents the data returned by getUserByEmail which joins
 * all_auth and all_users tables to include the status field
 */
export type UserWithStatus = User & {
  status?: 'ACTIVE' | 'INACTIVE' | 'BANNED' | 'DELETED' | 'PENDING' | 'BLOCKED' | null;
};

import { get } from "node:http";
import { encryptionService } from "../utils/encryption.js";
export class UserService {
  /**
   * Get user by GitHub ID
   */

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
   * Returns user data with status field from all_users table
   */
  public async getUserByEmail(
    email: string,
    schema: string = "pzero",
  ): Promise<UserWithStatus | null> {
    const result = await db.pool.query(
      `SELECT a.*, u.status
       FROM ${schema}.all_auth a
       LEFT JOIN ${schema}.all_users u ON a.id = u.id AND a.is_act = u.is_act
       WHERE a.email = $1 AND a.is_act = true
       LIMIT 1`,
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
    handle?: string;
    grid?: number[][];
  }): Promise<User> {
    const createData: CreateUserData & { grid?: number[][] } = {
      name: userData.name,
      email: userData.email,
      github_id: null,
      avatar: null,
      handle: userData.handle?? generateHandleFromEmail(userData.email),
      email_verified: userData.email_verified ?? false,
      grid: userData.grid??[],
    };

    return this.createUser(createData);
  }

  

  /**
   * Get user's decrypted grid
   */
  public async getUserGrid(
    userId: string,
    schema: string = "pzero"
  ): Promise<number[][] | null> {
    try {
      const result = await db.pool.query(
        `SELECT data->'grid' as grid FROM ${schema}.all_users WHERE id = $1::uuid`,
        [userId]
      );
      
      if (!result.rows[0] || !result.rows[0].grid) {
        return null;
      }
      
      // Decrypt the grid
      const encryptedGrid = result.rows[0].grid;
      return encryptionService.decryptGrid(encryptedGrid);
    } catch (error) {
      console.error("Error getting user grid:", error);
      return null;
    }
  }

  /**
   * Update user's grid
   */
  public async updateUserGrid(
    userId: string,
    grid: number[][],
    schema: string = "pzero"
  ): Promise<boolean> {
    try {
      // Validate grid structure (5x5 matrix of numbers)
      if (!grid || !Array.isArray(grid) || grid.length !== 5) {
        console.error("Invalid grid: must be 5x5 matrix");
        return false;
      }
      
      if (!grid.every(row => 
        Array.isArray(row) && 
        row.length === 5 && 
        row.every(cell => typeof cell === 'number' && !isNaN(cell) && cell > 0)
      )) {
        console.error("Invalid grid: all elements must be positive numbers");
        return false;
      }
      // Encrypt the grid before storing
      const encryptedGrid = encryptionService.encryptGrid(grid);
      
      const result = await db.pool.query(
        `UPDATE ${schema}.all_users 
         SET data = jsonb_set(COALESCE(data, '{}'), '{grid}', $1::jsonb)
         WHERE id = $2::uuid 
         RETURNING id`,
        [JSON.stringify(encryptedGrid), userId]
      );
      
      return !!result?.rowCount ? true : false;
    } catch (error) {
      console.error("Error updating user grid:", error);
      return false;
    }
  }

  /**
   * Create a new user
   */
  public async createUser(
    userData: CreateUserData & { grid?: number[][] },
    schema: string = "pzero",
  ): Promise<User> {
    // Generate handle from email
    const handle = userData.handle ?? generateHandleFromEmail(userData.email);

    // Encrypt grid if provided
    const encryptedGrid = userData.grid ? encryptionService.encryptGrid(userData.grid) : null;

    // Use the create_user postgres function
    const createResult = await db.pool.query(
      `SELECT ${schema}.create_user($1::jsonb) as result`,
      [
        JSON.stringify({
          name: userData.name,
          email: userData.email,
          handle: handle,
          avatar: userData.avatar || null,
          grid: encryptedGrid,
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
    console.log('🔥 SERVER: Created user ', userResult.rows[0]);
    return userResult.rows[0];
  }

  /**
   * Upsert user (insert or update on conflict)
   */
  public async upsertUser(userData: CreateUserData): Promise<User> {
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');
      const user = await this.getUserByEmail(userData.email);
      if (user) {
        if (user.email_verified === false ) {
          const sql = `UPDATE pzero.all_auth SET email_verified = TRUE WHERE email = $1 RETURNING *`;
          const result = await client.query(sql, [userData.email]);
          if (!result.rows.length) {
            console.log('Failed to update email_verified status for user ', userData.email);
            client.query('ROLLBACK');
            return {} as User;
          }
        }
        if (userData.avatar && !user.avatar) {
          user.avatar = userData.avatar;
          const sql = `UPDATE pzero.all_users SET avatar = $1 WHERE id = $2 RETURNING *`;
          const avatarResult = await client.query(sql, [userData.avatar, user.id]);
          if (!avatarResult.rows.length) {
            console.log('Failed to update avatar for user ', userData.email);
            client.query('ROLLBACK');
            return {} as User;
          }
        }
        await client.query('COMMIT');          
        return user;
      } else {
        // user should have been in pzero before github login
        throw new Error('User not in the system');
      }
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
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
      email_verified: true,
    };
    const user = await this.upsertUser(userData);
    const returnData = { ...githubUser, ...user, github_id: githubUser.id };
    console.log('🔥 SERVER: Upserted user ', returnData);
    // returnData.id is postgres id,
    // returnData.is_act = false blocks user from proceeding
    return returnData;
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

  /**
   * Cache user status in Redis for quick access during authentication checks.
   * This reduces database queries for frequently accessed user status information.
   * TTL is set to balance cache freshness with performance (default: 24 hours).
   * The status is automatically refreshed on login, so the TTL primarily handles
   * cases where status changes occur outside of login flows.
   */
  public async setUserStatusInCache(
    userId: string,
    status: string | null | undefined,
  ): Promise<void> {
    if (!status) {
      console.warn(
        `Skipping status cache for user ${userId}: status is missing. This may indicate a data integrity issue.`,
      );
      return;
    }

    try {
      const statusKey = `${config.REDIS_STATUS_NAMESPACE}${userId}`;
      await redis.set(statusKey, status, config.REDIS_STATUS_TTL_SECONDS);
    } catch (error) {
      // Log error but don't fail the operation (status storage is supplementary)
      console.error(`Failed to store user status in Redis for user ${userId}:`, error);
    }
  }

  /**
   * Check if user status exists in Redis cache.
   */
  public async userStatusCacheExists(userId: string): Promise<boolean> {
    try {
      const statusKey = `${config.REDIS_STATUS_NAMESPACE}${userId}`;
      return await redis.exists(statusKey);
    } catch (error) {
      // Log error but return false to be safe
      console.error(`Failed to check user status cache existence for user ${userId}:`, error);
      return false;
    }
  }

  /**
   * Update user status in Redis cache only if cache already exists.
   * This is used when status is changed via API to keep existing cache in sync.
   */
  public async updateUserStatusInCacheIfExists(
    userId: string,
    status: string | null | undefined,
  ): Promise<void> {
    if (!status) {
      return;
    }

    try {
      const statusKey = `${config.REDIS_STATUS_NAMESPACE}${userId}`;
      const cacheExists = await redis.exists(statusKey);
      
      if (cacheExists) {
        await redis.set(statusKey, status, config.REDIS_STATUS_TTL_SECONDS);
      }
      // If cache doesn't exist, skip silently (cache will be created on next login)
    } catch (error) {
      // Log error but don't fail the operation (status storage is supplementary)
      console.error(`Failed to update user status in Redis for user ${userId}:`, error);
    }
  }

  /**
   * Delete user status from Redis cache.
   * Called during logout to ensure cached status is cleared.
   */
  public async deleteUserStatusFromCache(userId: string): Promise<void> {
    try {
      const statusKey = `${config.REDIS_STATUS_NAMESPACE}${userId}`;
      await redis.delete(statusKey);
    } catch (error) {
      // Log error but don't fail the operation
      console.error(`Failed to delete user status from Redis for user ${userId}:`, error);
    }
  }
}

// Export singleton instance
export const userService = new UserService();
