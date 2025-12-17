import { api } from '@pzero/shared/api'
import type { CreateOrganizationWithUserData, CreateOrgData, Org, UpdateOrgData } from '@pzero/shared/pzero'

// Using shared types from @pzero/shared/pzero/orgs
// All interfaces are now imported from shared package

class OrgsService {
  /**
   * Create a new organization
   */
  async createOrg(
    data: CreateOrgData & {
      status: 'active' | 'inactive' | 'suspended'
      plan: 'free' | 'starter' | 'pro' | 'enterprise'
      email: string
    },
  ): Promise<Org> {
    const response = await api.post<Org>('/api/orgs', data)
    return response
  }

  /**
   * Create an organization with optional user creation
   */
  async createOrgWithUser(data: CreateOrganizationWithUserData): Promise<{
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
  async updateOrg(id: string, data: UpdateOrgData): Promise<Org> {
    const response = await api.patch<Org>(`/api/orgs/${id}`, data)
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
   *
   * TODO: TBD - Server endpoint POST /api/orgs/:id/users not implemented yet
   * This method will fail with 404 until the corresponding server route is added
   */
  async associateUsers(orgId: string, userIds: string[]): Promise<void> {
    await api.post(`/api/orgs/${orgId}/users`, { user_ids: userIds })
  }

  /**
   * Remove user from organization
   *
   * TODO: TBD - Server endpoint DELETE /api/orgs/:id/users/:userId not implemented yet
   * This method will fail with 404 until the corresponding server route is added
   */
  async removeUser(orgId: string, userId: string): Promise<void> {
    await api.delete(`/api/orgs/${orgId}/users/${userId}`)
  }
}

export const orgsService = new OrgsService()
