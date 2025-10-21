import type { Location, NetworkLog } from '@pzero/shared/pzero'
import { uuid } from '@pzero/shared/uuid'
import { ZStorage } from './store'
export const STORE = 'network-store'
class NetworkStoreClass extends ZStorage {
  constructor() {
    super(STORE)
  }
  getItem(id: string): NetworkLog[] {
    return super.getItem(id) as NetworkLog[]
  }
  putItem(id: string, log: NetworkLog) {
    let logs = this.getItem(id)
    if (logs) {
      if (!Array.isArray(logs)) {
        logs = [logs]
      }
    }
    logs.unshift(log)
    return super.setItem({ key: id, data: logs })
  }
  prune({ key, dateTo, sortField }: { key: string; dateTo: number; sortField: string }): boolean {
    return super.prune({ key, dateTo, sortField })
  }
}

export const NetworkStore = new NetworkStoreClass()
