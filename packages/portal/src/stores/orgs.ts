import { api } from '@pzero/shared/api'
import type { CreateOrgData, Org, OrgsListResponse, UpdateOrgData } from '@pzero/shared/pzero'
import { ZStorage } from './store'

export const STORE = 'orgs'

export class OrgsStoreClass extends ZStorage {
  // Current organization data
  currentOrg?: Org | null = null
  orgs: Org[] = []
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
      const cachedOrgs = await this.getItem('orgs')
      if (cachedOrgs && Array.isArray(cachedOrgs)) {
        this.orgs = cachedOrgs
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

  async setCurrentOrg(org: Org | null) {
    this.currentOrg = org

    if (org) {
      await this.setItem({ key: 'currentOrg', data: org })
    } else {
      await this.removeItem('currentOrg')
    }
  }

  async fetchOrgs(page: number = 1, limit: number = 20, query?: string) {
    this.setLoading(true)
    this.setError(null)

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(query && { q: query }),
      })

      const response = await api.get<OrgsListResponse>(`/orgs?${params}`)

      this.orgs = response.orgs
      this.totalCount = response.total
      this.currentPage = response.page
      this.pageSize = response.limit

      // Cache organizations
      await this.setItem({ key: 'orgs', data: response.orgs })

      return response
    } catch (error: any) {
      const errorMessage = error?.message || 'Failed to fetch orgs'
      this.setError(errorMessage)
      throw error
    } finally {
      this.setLoading(false)
    }
  }

  async fetchOrg(id: string) {
    this.setLoading(true)
    this.setError(null)

    try {
      const response = await api.get<{ organization: Org }>(`/orgs/${id}`)

      // Update in list if exists
      const index = this.orgs.findIndex(org => org.id === id)
      if (index !== -1) {
        this.orgs[index] = response.organization
      }

      return response.organization
    } catch (error: any) {
      const errorMessage = error?.message || 'Failed to fetch org'
      this.setError(errorMessage)
      throw error
    } finally {
      this.setLoading(false)
    }
  }

  async createOrg(data: CreateOrgData) {
    this.setLoading(true)
    this.setError(null)

    try {
      const response = await api.post<{ organization: Org }>('/orgs', data)

      // Add to beginning of list
      this.orgs = [response.organization, ...this.orgs]
      this.totalCount += 1

      // Update cache
      await this.setItem({ key: 'orgs', data: this.orgs })

      return response.organization
    } catch (error: any) {
      const errorMessage = error?.message || 'Failed to create org'
      this.setError(errorMessage)
      throw error
    } finally {
      this.setLoading(false)
    }
  }

  async updateOrg(id: string, data: UpdateOrgData) {
    this.setLoading(true)
    this.setError(null)

    try {
      const response = await api.patch<{ organization: Org }>(`/orgs/${id}`, data)

      // Update in list
      const index = this.orgs.findIndex(org => org.id === id)
      if (index !== -1) {
        this.orgs[index] = response.organization
      }

      // Update current org if it's the same
      if (this.currentOrg?.id === id) {
        await this.setCurrentOrg(response.organization)
      }

      // Update cache
      await this.setItem({ key: 'orgs', data: this.orgs })

      return response.organization
    } catch (error: any) {
      const errorMessage = error?.message || 'Failed to update org'
      this.setError(errorMessage)
      throw error
    } finally {
      this.setLoading(false)
    }
  }

  async deleteOrg(id: string) {
    this.setLoading(true)
    this.setError(null)

    try {
      await api.delete(`/orgs/${id}`)

      // Remove from list
      this.orgs = this.orgs.filter(org => org.id !== id)
      this.totalCount = Math.max(0, this.totalCount - 1)

      // Clear current org if it's the deleted one
      if (this.currentOrg?.id === id) {
        await this.setCurrentOrg(null)
      }

      // Update cache
      await this.setItem({ key: 'orgs', data: this.orgs })

      return true
    } catch (error: any) {
      const errorMessage = error?.message || 'Failed to delete org'
      this.setError(errorMessage)
      throw error
    } finally {
      this.setLoading(false)
    }
  }

  async switchOrg(orgId: string) {
    const org = this.orgs.find(o => o.id === orgId)

    if (org) {
      await this.setCurrentOrg(org)
      return org
    }

    // If not in cache, fetch it
    const fetchedOrg = await this.fetchOrg(orgId)
    await this.setCurrentOrg(fetchedOrg)
    return fetchedOrg
  }

  clearCache() {
    this.orgs = []
    this.totalCount = 0
    this.currentPage = 1
    this.removeItem('orgs')
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
