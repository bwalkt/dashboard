import type { CreateUserData, GitHubUser, User } from '@pzero/shared'
import { db } from '../config/database.js'

export class UserService {
  /**
   * Get user by GitHub ID
   */
  public getUserByGithubId(githubId: string): User | null {
    return db.getUserByGithubId(githubId)
  }

  /**
   * Get user by internal ID
   */
  public getUserById(id: number): User | null {
    return db.getUserById(id)
  }

  /**
   * Create or update user from GitHub profile
   */
  public upsertUserFromGitHub(githubUser: GitHubUser): User {
    const userData: CreateUserData = {
      github_id: githubUser.id.toString(),
      name: githubUser.name || githubUser.login,
      email: githubUser.email || '',
      avatar: githubUser.avatar_url,
    }

    return db.upsertUser(userData)
  }

  /**
   * Create a new user
   */
  public createUser(userData: CreateUserData): User {
    return db.createUser(userData)
  }

  /**
   * Update user information
   */
  public updateUser(githubId: string, userData: Partial<CreateUserData>): User | null {
    return db.updateUser(githubId, userData)
  }

  /**
   * Validate GitHub user data
   */
  public validateGitHubUser(githubUser: any): GitHubUser | null {
    if (!githubUser || typeof githubUser !== 'object') {
      return null
    }

    const { id, login, name, email, avatar_url } = githubUser

    if (!id || !login || typeof login !== 'string') {
      return null
    }

    return {
      id: id.toString(),
      login,
      name: name || login,
      email: email || '',
      avatar_url: avatar_url || '',
    }
  }

  /**
   * Sanitize user data for API responses
   */
  public sanitizeUserForResponse(user: User): Omit<User, 'id'> {
    const { id, ...sanitizedUser } = user
    return sanitizedUser
  }
}

// Export singleton instance
export const userService = new UserService()
