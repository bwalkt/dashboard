import { type Endpoint, type EndpointStatus, endpointStatuses } from '@pzero/shared/pzero'
import { uuid } from '@pzero/shared/uuid'
import { HTTPServer } from '../services/server'
import { HistoryStore, Keys } from './history'
import { ZStorage } from './store'

const STORE = 'EndpointsStore'

export class EndpointsStoreClass extends ZStorage {
  endpoints: Map<string, Endpoint> = new Map()
  serverInstance: HTTPServer | null = null
  constructor() {
    super(STORE)
    const storedEndpoints = this.getAll()
    const activeEndpoint = Array.from(Object.values(storedEndpoints)).find((endpoint => (endpoint.status === endpointStatuses.active || endpoint.status === endpointStatuses.verified) && !endpoint.dateRevoked))
    if (activeEndpoint) {
      this.serverInstance = new HTTPServer()
      this.serverInstance.start()
    }
    if (storedEndpoints !== undefined && storedEndpoints !== null) {
      this.endpoints = new Map(Object.entries(storedEndpoints))
    }
  }
  addEndpoint(endpoint: Endpoint) {
    const id = uuid()
    if (this.endpoints.has(id)) {
      throw new Error(`Endpoint with id ${id} already exists`)
    }
    const newEndpoint = {
      ...endpoint,
      id,
      name: endpoint.name || id,
      dateAdded: Date.now(),
      status: endpoint.status || endpointStatuses.unverified,
    }
    this.endpoints.set(id, newEndpoint)
    this.setItem({ key: id, data: newEndpoint })
    return newEndpoint
  }
  updateEndpoint(id: string, updates: Partial<Endpoint>) {
    const endpoint = this.endpoints.get(id)
    if (!endpoint) {
      throw new Error(`Endpoint with id ${id} does not exist`)
    }
    if (endpoint.id !== updates.id) {
      throw new Error('Endpoint id cannot be changed')
    }
    const { status, data } = HistoryStore.putHistory({ id, key: Keys.endpoints, original: endpoint, updates })
    if (!status) {
      console.log('No Op - no change')
    }
    this.setItem({ key: id, data: JSON.parse(data) })
    this.endpoints.set(id, data)
    if ((endpoint.status !== data.status) && (data.status === endpointStatuses.verified || data.status === endpointStatuses.active) && (!this.isServerRunning)) {

      console.log(`Endpoint ${id} verified status changed to ${data.status}`)
    }
    return data
  }
  getEndpoint(id: string) {
    return this.endpoints.get(id)
  }
  getAllEndpoints() {
    return Array.from(this.endpoints.values())
  }
  getActiveEndpoints() {
    return Array.from(this.endpoints.values()).filter(endpoint => !endpoint.dateRevoked && (endpoint.status === endpointStatuses.active || endpoint.status === endpointStatuses.verified))
  }
  canStartServer() {
      const activeEndpoints = Array.from(this.endpoints.values()).filter(endpoint => !endpoint.dateRevoked && (endpoint.status === endpointStatuses.active || endpoint.status === endpointStatuses.verified))
      return activeEndpoints.length > 0
  }
  getRevokedEndpoints() {
    return Array.from(this.endpoints.values()).filter(endpoint => endpoint.dateRevoked)
  }
  removeEndpoint(id: string) {
    this.endpoints.delete(id)
    this.removeItem(id)
  }
  getEndpointStatus(id: string): EndpointStatus | null {
    const endpoint = this.endpoints.get(id)
    if (!endpoint) {
      return null
    }
    if (endpoint.dateRevoked) {
      return endpointStatuses.revoked
    }
    return endpoint.status
  }
}

export const EndpointsStore = new EndpointsStoreClass()
