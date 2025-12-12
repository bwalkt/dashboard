import { api } from '@pzero/shared/api'

export interface CreateUserPayload {
  name: string
  email: string
  password?: string
  phone?: string
  email_verified?: boolean
  phone_verified?: boolean
  org_id?: string
  metadata?: Record<string, any>
}

export interface User {
  id: string
  name: string
  email: string
  phone?: string
  email_verified: boolean
  phone_verified: boolean
  avatar?: string
  org_id?: string
}

export interface UserWithVerification extends User {
  verification_token?: string
  verification_expires_at?: string
}

class UsersService {
  /**
   * Create a new user (similar to registration)
   */
  async createUser(data: CreateUserPayload): Promise<UserWithVerification> {
    const response = await api.post<UserWithVerification>('/api/users', data)
    return response
  }

  /**
   * Create user with automatic verification
   */
  async createUserWithVerification(
    data: CreateUserPayload & {
      skip_verification?: boolean
    },
  ): Promise<UserWithVerification> {
    const response = await api.post<UserWithVerification>('/api/users/create-verified', data)
    return response
  }

  /**
   * Get all users
   */
  async getUsers(): Promise<User[]> {
    const response = await api.get<User[]>('/api/users')
    // add pagination handling if needed
    return response
  }

  /**
   * Get user by ID
   */
  async getUser(id: string): Promise<User> {
    const response = await api.get<User>(`/api/users/${id}`)
    return response
  }

  /**
   * Update user
   */
  async updateUser(id: string, data: Partial<CreateUserPayload>): Promise<User> {
    const response = await api.put<User>(`/api/users/${id}`, data)
    return response
  }

  /**
   * Delete user
   */
  async deleteUser(id: string): Promise<void> {
    await api.delete(`/api/users/${id}`)
  }

  /**
   * Associate user with organization
   */
  async associateWithOrg(userId: string, orgId: string): Promise<User> {
    const response = await api.post<User>(`/api/users/${userId}/associate-org`, { org_id: orgId })
    return response
  }
}

export const usersService = new UsersService()
