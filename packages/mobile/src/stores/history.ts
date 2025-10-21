import type { History, HistoryAudit } from '@pzero/shared/pzero'
import { ignoreFields } from '@pzero/shared/pzero'
import { uuid } from '@pzero/shared/uuid'
import { ZStorage } from './store'
export const STORE = 'history'
export const Keys = {
  endpoints: 'endpoints',
  devices: 'devices',
  actor: 'actor',
  networking: 'networking',
} as const
export type Key = keyof typeof Keys
export type HistoryParam = {
  id: string
  key: Key
  original?: any
  updates?: any
}
class HistoryStoreClass extends ZStorage {
  constructor() {
    super(STORE)
  }
  getId({ id, key }: HistoryParam) {
    return `${key}-${id}`
  }
  getHistory(param: HistoryParam) {
    let hist = this.getItem(this.getId(param))
    if (hist) {
      if (!Array.isArray(hist)) {
        hist = [hist]
      }
    }
    return hist
  }
  putHistory({ id, key, original, updates }: HistoryParam) {
    if (original.id !== updates.id || id !== updates.id) {
      return { status: false }
    }
    // @ts-expect-error
    const keys = Object.keys(updates).filter(field => field !== 'id' && !ignoreFields.includes(field))
    const audits: HistoryAudit[] = []
    // merged data
    const data = original
    for (let i = 0; i < keys.length; i++) {
      const ukey = keys[i]
      if (JSON.stringify(original[ukey]) !== JSON.stringify(updates[ukey])) {
        audits.push({
          attr: ukey,
          old: original[ukey],
          new: updates[ukey],
        })
        data[ukey] = updates[ukey]
      }
    }
    if (!audits.length) {
      return { status: false }
    }
    const hist = this.getHistory({ id, key }) ?? []
    const newHist: History = {
      id: uuid(),
      audits: {
        createDate: Date.now(),
        audits: audits ?? [],
      },
    }
    hist.unshift(newHist)
    this.setItem({ key: this.getId({ id, key }), data: hist })
    return {
      status: true,
      data,
    }
  }
  clearHistory({ id, key }: HistoryParam) {
    const hist = this.getHistory({ id, key }) ?? []
    if (!hist) {
      return true
    }
    this.removeItem(this.getId({ id, key }))
  }
  pruneHistory({ id, key }: HistoryParam, dateTo: number) {
    return this.prune({ key: this.getId({ id, key }), dateTo, sortField: 'audits.createDate' })
  }

  getStatusHistory({ id, key }: HistoryParam): History[] {
    const hist = this.getHistory({ id, key })
    return hist
      ? hist
          .filter(
            (history: History) =>
              history.id === id && history.audits.audits.some((audit: HistoryAudit) => audit.attr === 'status'),
          )
          .sort((a: History, b: History) => a.audits.createDate - b.audits.createDate)
      : []
  }
}

export const HistoryStore = new HistoryStoreClass()
