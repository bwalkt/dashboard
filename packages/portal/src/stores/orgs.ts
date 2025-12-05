import { api } from '@pzero/shared/api'
import type {
  CreateOrganizationData,
  Organization,
  OrganizationsListResponse,
  UpdateOrganizationData,
} from '@pzero/shared/pzero'
import { ZStorage } from './store'

export const STORE = 'orgs'

export class OrgsStoreClass extends ZStorage {
  // Current organization data
  currentOrg?: Organization | null = null
  organizations: Organization[] = []
  loading: boolean = false
  error: string | null = null

  // Pagination
  totalCount: number = 0
  currentPage: number = 1
  pageSize: number = 20

  constructor() {
    super(STORE)
    this.initializeStore()
  }

  private async initializeStore() {
    try {
      // Load persisted current org
      const persistedOrg = await this.getItem('currentOrg')
      if (persistedOrg) {
        this.currentOrg = persistedOrg
      }

      // Load organizations list from cache
      const cachedOrgs = await this.getItem('organizations')
      if (cachedOrgs && Array.isArray(cachedOrgs)) {
        this.organizations = cachedOrgs
      }
    } catch (error) {
      console.error('OrgsStore: Failed to initialize:', error)
    }
  }

  setLoading(loading: boolean) {
    this.loading = loading
  }

  setError(error: string | null) {
    this.error = error
  }

  async setCurrentOrg(org: Organization | null) {
    this.currentOrg = org

    if (org) {
      await this.setItem({ key: 'currentOrg', data: org })
    } else {
      await this.removeItem('currentOrg')
    }
  }

  async fetchOrganizations(page: number = 1, limit: number = 20, query?: string) {
    this.setLoading(true)
    this.setError(null)

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(query && { q: query }),
      })

      const response = await api.get<OrganizationsListResponse>(`/orgs?${params}`)

      this.organizations = response.organizations
      this.totalCount = response.total
      this.currentPage = response.page
      this.pageSize = response.limit

      // Cache organizations
      await this.setItem({ key: 'organizations', data: response.organizations })

      return response
    } catch (error: any) {
      const errorMessage = error?.message || 'Failed to fetch organizations'
      this.setError(errorMessage)
      throw error
    } finally {
      this.setLoading(false)
    }
  }

  async fetchOrganization(id: string) {
    this.setLoading(true)
    this.setError(null)

    try {
      const response = await api.get<{ organization: Organization }>(`/orgs/${id}`)

      // Update in list if exists
      const index = this.organizations.findIndex(org => org.id === id)
      if (index !== -1) {
        this.organizations[index] = response.organization
      }

      return response.organization
    } catch (error: any) {
      const errorMessage = error?.message || 'Failed to fetch organization'
      this.setError(errorMessage)
      throw error
    } finally {
      this.setLoading(false)
    }
  }

  async createOrganization(data: CreateOrganizationData) {
    this.setLoading(true)
    this.setError(null)

    try {
      const response = await api.post<{ organization: Organization }>('/orgs', data)

      // Add to beginning of list
      this.organizations = [response.organization, ...this.organizations]
      this.totalCount += 1

      // Update cache
      await this.setItem({ key: 'organizations', data: this.organizations })

      return response.organization
    } catch (error: any) {
      const errorMessage = error?.message || 'Failed to create organization'
      this.setError(errorMessage)
      throw error
    } finally {
      this.setLoading(false)
    }
  }

  async updateOrganization(id: string, data: UpdateOrganizationData) {
    this.setLoading(true)
    this.setError(null)

    try {
      const response = await api.patch<{ organization: Organization }>(`/orgs/${id}`, data)

      // Update in list
      const index = this.organizations.findIndex(org => org.id === id)
      if (index !== -1) {
        this.organizations[index] = response.organization
      }

      // Update current org if it's the same
      if (this.currentOrg?.id === id) {
        await this.setCurrentOrg(response.organization)
      }

      // Update cache
      await this.setItem({ key: 'organizations', data: this.organizations })

      return response.organization
    } catch (error: any) {
      const errorMessage = error?.message || 'Failed to update organization'
      this.setError(errorMessage)
      throw error
    } finally {
      this.setLoading(false)
    }
  }

  async deleteOrganization(id: string) {
    this.setLoading(true)
    this.setError(null)

    try {
      await api.delete(`/orgs/${id}`)

      // Remove from list
      this.organizations = this.organizations.filter(org => org.id !== id)
      this.totalCount = Math.max(0, this.totalCount - 1)

      // Clear current org if it's the deleted one
      if (this.currentOrg?.id === id) {
        await this.setCurrentOrg(null)
      }

      // Update cache
      await this.setItem({ key: 'organizations', data: this.organizations })

      return true
    } catch (error: any) {
      const errorMessage = error?.message || 'Failed to delete organization'
      this.setError(errorMessage)
      throw error
    } finally {
      this.setLoading(false)
    }
  }

  async switchOrganization(orgId: string) {
    const org = this.organizations.find(o => o.id === orgId)

    if (org) {
      await this.setCurrentOrg(org)
      return org
    }

    // If not in cache, fetch it
    const fetchedOrg = await this.fetchOrganization(orgId)
    await this.setCurrentOrg(fetchedOrg)
    return fetchedOrg
  }

  clearCache() {
    this.organizations = []
    this.totalCount = 0
    this.currentPage = 1
    this.removeItem('organizations')
  }
}

// Create singleton instance
let _orgsStore: OrgsStoreClass | null = null

function getOrgsStore(): OrgsStoreClass {
  if (!_orgsStore) {
    _orgsStore = new OrgsStoreClass()
  }
  return _orgsStore
}

export const OrgsStore = getOrgsStore()

// React hook for using OrgsStore in components
export function useOrgsStore() {
  return getOrgsStore()
}
