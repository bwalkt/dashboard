import { api } from '@pzero/shared/api'

export interface CreateOrgPayload {
  name: string
  slug: string
  description?: string
  status: 'active' | 'inactive' | 'suspended'
  plan: 'free' | 'starter' | 'pro' | 'enterprise'
  email: string
  website?: string
  phone?: string
  address?: string
  owner_id: string
  settings?: Record<string, any>
  metadata?: Record<string, any>
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

export interface Organization {
  id: string
  name: string
  slug: string
  description?: string
  status: 'active' | 'inactive' | 'suspended'
  plan: 'free' | 'starter' | 'pro' | 'enterprise'
  email: string
  website?: string
  phone?: string
  address?: string
  logo_url?: string
  owner_id: string
  settings?: Record<string, any>
  metadata?: Record<string, any>
  created_at: string
  updated_at: string
  deleted_at?: string
}

class OrgsService {
  /**
   * Create a new organization
   */
  async createOrganization(data: CreateOrgPayload): Promise<Organization> {
    const response = await api.post<Organization>('/api/orgs', data)
    return response
  }

  /**
   * Create an organization with optional user creation
   */
  async createOrganizationWithUser(data: CreateOrgWithUserPayload): Promise<{
    organization: Organization
    user?: { id: string; email: string; name: string }
  }> {
    const response = await api.post<{
      organization: Organization
      user?: { id: string; email: string; name: string }
    }>('/api/orgs/create-with-user', data)
    return response
  }

  /**
   * Get all organizations
   */
  async getOrganizations(): Promise<Organization[]> {
    const response = await api.get<Organization[]>('/api/orgs')
    return response
  }

  /**
   * Get organization by ID
   */
  async getOrganization(id: string): Promise<Organization> {
    const response = await api.get<Organization>(`/api/orgs/${id}`)
    return response
  }

  /**
   * Update organization
   */
  async updateOrganization(id: string, data: Partial<CreateOrgPayload>): Promise<Organization> {
    const response = await api.put<Organization>(`/api/orgs/${id}`, data)
    return response
  }

  /**
   * Delete organization
   */
  async deleteOrganization(id: string): Promise<void> {
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
