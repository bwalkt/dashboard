import { api } from '@pzero/shared/api'
import type { CreateOrgData, Org, OrgsListResponse, UpdateOrgData } from '@pzero/shared/pzero'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { ZStorage } from './store'

export const STORE = 'orgs'

// Create a reactive Zustand store for organizations
interface OrgsState {
  // State
  currentOrg?: Org | null
  orgs: Org[]
  loading: boolean
  error: string | null
  totalCount: number
  currentPage: number
  pageSize: number

  // Actions
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  setCurrentOrg: (org: Org | null) => void
  fetchOrgs: (page?: number, limit?: number, query?: string) => Promise<OrgsListResponse>
  fetchOrg: (id: string) => Promise<Org>
  createOrg: (orgData: CreateOrgData) => Promise<Org>
  updateOrg: (id: string, orgData: UpdateOrgData) => Promise<Org>
  deleteOrg: (id: string) => Promise<void>
}

// Create storage instance for persistence
const storage = new ZStorage(STORE)

export const useOrgsStore = create<OrgsState>()(
  persist(
    (set, get) => ({
      // Initial state
      currentOrg: null,
      orgs: [],
      loading: false,
      error: null,
      totalCount: 0,
      currentPage: 1,
      pageSize: 20,

      // Actions
      setLoading: loading => set({ loading }),
      setError: error => set({ error }),
      setCurrentOrg: org => set({ currentOrg: org }),

      fetchOrgs: async (page = 1, limit = 20, query) => {
        set({ loading: true, error: null })

        try {
          const params = new URLSearchParams({
            page: page.toString(),
            limit: limit.toString(),
            ...(query && { q: query }),
          })

          const response = await api.get<OrgsListResponse>(`/orgs?${params}`)

          set({
            orgs: response.orgs,
            totalCount: response.total,
            currentPage: response.page,
            pageSize: response.limit,
            loading: false,
          })

          return response
        } catch (error: any) {
          const errorMessage = error?.message || 'Failed to fetch orgs'
          set({ error: errorMessage, loading: false })
          throw error
        }
      },

      fetchOrg: async id => {
        set({ loading: true, error: null })

        try {
          const response = await api.get<{ org: Org }>(`/orgs/${id}`)
          set({ loading: false })
          return response.org
        } catch (error: any) {
          const errorMessage = error?.message || 'Failed to fetch org'
          set({ error: errorMessage, loading: false })
          throw error
        }
      },

      createOrg: async orgData => {
        set({ loading: true, error: null })

        try {
          const response = await api.post<{ org: Org }>('/orgs', orgData)
          const newOrg = response.org

          set(state => ({
            orgs: [newOrg, ...state.orgs],
            loading: false,
          }))

          return newOrg
        } catch (error: any) {
          const errorMessage = error?.message || 'Failed to create org'
          set({ error: errorMessage, loading: false })
          throw error
        }
      },

      updateOrg: async (id, orgData) => {
        set({ loading: true, error: null })

        try {
          const response = await api.put<{ org: Org }>(`/orgs/${id}`, orgData)
          const updatedOrg = response.org

          set(state => ({
            orgs: state.orgs.map(org => (org.id === id ? updatedOrg : org)),
            currentOrg: state.currentOrg?.id === id ? updatedOrg : state.currentOrg,
            loading: false,
          }))

          return updatedOrg
        } catch (error: any) {
          const errorMessage = error?.message || 'Failed to update org'
          set({ error: errorMessage, loading: false })
          throw error
        }
      },

      deleteOrg: async id => {
        set({ loading: true, error: null })

        try {
          await api.delete(`/orgs/${id}`)

          set(state => ({
            orgs: state.orgs.filter(org => org.id !== id),
            currentOrg: state.currentOrg?.id === id ? null : state.currentOrg,
            loading: false,
          }))
        } catch (error: any) {
          const errorMessage = error?.message || 'Failed to delete org'
          set({ error: errorMessage, loading: false })
          throw error
        }
      },
    }),
    {
      name: STORE,
      storage: storage.zustandStorage,
      partialize: state => ({
        currentOrg: state.currentOrg,
        orgs: state.orgs,
      }),
    },
  ),
)
