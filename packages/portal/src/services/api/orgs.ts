import { api } from '@pzero/shared/api'

export interface CreateOrgPayload {
  name: string
<<<<<<< HEAD
<<<<<<< HEAD
  handle: string
=======
  slug: string
>>>>>>> ae9947a (feat: org and user)
=======
  handle: string
>>>>>>> a238af6 (feat: org and user)
  description?: string
  status: 'active' | 'inactive' | 'suspended'
  plan: 'free' | 'starter' | 'pro' | 'enterprise'
  email: string
  website?: string
  phone?: string
  address?: string
<<<<<<< HEAD
  data?: {
    meta?: {
      c_by: string
    }
  }
=======
  owner_id: string
  settings?: Record<string, any>
  metadata?: Record<string, any>
>>>>>>> ae9947a (feat: org and user)
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

<<<<<<< HEAD
export interface Org {
  id: string
  name: string
  handle: string
=======
export interface Organization {
  id: string
  name: string
<<<<<<< HEAD
  slug: string
>>>>>>> ae9947a (feat: org and user)
=======
  handle: string
>>>>>>> a238af6 (feat: org and user)
  description?: string
  status: 'active' | 'inactive' | 'suspended'
  plan: 'free' | 'starter' | 'pro' | 'enterprise'
  email: string
  website?: string
  phone?: string
  address?: string
<<<<<<< HEAD
  data?: {
    meta?: {
      c_by: string
    }
  }
=======
  logo_url?: string
  owner_id: string
  settings?: Record<string, any>
  metadata?: Record<string, any>
  created_at: string
  updated_at: string
  deleted_at?: string
>>>>>>> ae9947a (feat: org and user)
}

class OrgsService {
  /**
   * Create a new organization
   */
<<<<<<< HEAD
  async createOrg(data: CreateOrgPayload): Promise<Org> {
    const response = await api.post<Org>('/api/orgs', data)
=======
  async createOrganization(data: CreateOrgPayload): Promise<Organization> {
    const response = await api.post<Organization>('/api/orgs', data)
>>>>>>> ae9947a (feat: org and user)
    return response
  }

  /**
   * Create an organization with optional user creation
   */
<<<<<<< HEAD
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
=======
  async createOrganizationWithUser(data: CreateOrgWithUserPayload): Promise<{
    organization: Organization
    user?: { id: string; email: string; name: string }
  }> {
    const response = await api.post<{
      organization: Organization
      user?: { id: string; email: string; name: string }
    }>('/api/orgs/create-with-user', data)
    return response
>>>>>>> ae9947a (feat: org and user)
  }

  /**
   * Get all organizations
   */
<<<<<<< HEAD
  async getOrgs(): Promise<Org[]> {
    const response = await api.get<Org[]>('/api/orgs')
=======
  async getOrganizations(): Promise<Organization[]> {
    const response = await api.get<Organization[]>('/api/orgs')
>>>>>>> ae9947a (feat: org and user)
    return response
  }

  /**
   * Get organization by ID
   */
<<<<<<< HEAD
  async getOrg(id: string): Promise<Org> {
    const response = await api.get<Org>(`/api/orgs/${id}`)
=======
  async getOrganization(id: string): Promise<Organization> {
    const response = await api.get<Organization>(`/api/orgs/${id}`)
>>>>>>> ae9947a (feat: org and user)
    return response
  }

  /**
   * Update organization
   */
<<<<<<< HEAD
  async updateOrg(id: string, data: Partial<CreateOrgPayload>): Promise<Org> {
    const response = await api.put<Org>(`/api/orgs/${id}`, data)
=======
  async updateOrganization(id: string, data: Partial<CreateOrgPayload>): Promise<Organization> {
    const response = await api.put<Organization>(`/api/orgs/${id}`, data)
>>>>>>> ae9947a (feat: org and user)
    return response
  }

  /**
   * Delete organization
   */
<<<<<<< HEAD
  async deleteOrg(id: string): Promise<void> {
=======
  async deleteOrganization(id: string): Promise<void> {
>>>>>>> ae9947a (feat: org and user)
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
