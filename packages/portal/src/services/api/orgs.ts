import { api } from '@pzero/shared/api'

export interface CreateOrgPayload {
  name: string
  handle: string
  dscr?: string
  status: 'active' | 'inactive' | 'suspended'
  plan: 'free' | 'starter' | 'pro' | 'enterprise'
  email: string
  website?: string
  phone?: string
  address?: string
}

export interface CreateOrgWithUserPayload extends CreateOrgPayload {
  create_user?: {
    name: string
    email: string
    password?: string
    email_verified?: boolean
  }
  associate_users?: string[]
}

export interface Org {
  id: string
  name: string
  handle: string
  description?: string
  status: 'active' | 'inactive' | 'suspended'
  plan: 'free' | 'starter' | 'pro' | 'enterprise'
  email: string
  website?: string
  phone?: string
  address?: string
  logo_url?: string
  c_at: string
  u_at: string
}

class OrgsService {
  /**
   * Create a new organization
   */
  async createOrg(data: CreateOrgPayload): Promise<Org> {
    const response = await api.post<Org>('/api/orgs', data)
    return response
  }

  /**
   * Create an organization with optional user creation
   */
  async createOrgWithUser(data: CreateOrgWithUserPayload): Promise<{
    organization: Org
    user?: { id: string; email: string; name: string }
  }> {
    console.log('📡 API SERVICE: Sending request to /api/orgs/create-with-user')
    console.log('📡 API SERVICE: Request payload:', JSON.stringify(data, null, 2))

    try {
      const response = await api.post<{
        organization: Org
        user?: { id: string; email: string; name: string }
      }>('/api/orgs/create-with-user', data)

      console.log('📡 API SERVICE: Received successful response:', JSON.stringify(response, null, 2))
      return response
    } catch (error) {
      console.error('📡 API SERVICE: Request failed:', error)
      console.error('📡 API SERVICE: Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace',
        type: typeof error,
      })
      throw error
    }
  }

  /**
   * Get all organizations
   */
  async getOrgs(): Promise<Org[]> {
    const response = await api.get<Org[]>('/api/orgs')
    return response
  }

  /**
   * Get organization by ID
   */
  async getOrg(id: string): Promise<Org> {
    const response = await api.get<Org>(`/api/orgs/${id}`)
    return response
  }

  /**
   * Update organization
   */
  async updateOrg(id: string, data: Partial<CreateOrgPayload>): Promise<Org> {
    const response = await api.put<Org>(`/api/orgs/${id}`, data)
    return response
  }

  /**
   * Delete organization
   */
  async deleteOrg(id: string): Promise<void> {
    await api.delete(`/api/orgs/${id}`)
  }

  /**
   * Associate users with organization
   */
  async associateUsers(orgId: string, userIds: string[]): Promise<void> {
    await api.post(`/api/orgs/${orgId}/users`, { user_ids: userIds })
  }

  /**
   * Remove user from organization
   */
  async removeUser(orgId: string, userId: string): Promise<void> {
    await api.delete(`/api/orgs/${orgId}/users/${userId}`)
  }
}

export const orgsService = new OrgsService()
