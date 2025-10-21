import { MMKV } from 'react-native-mmkv'
import type { StateStorage } from 'zustand/middleware'
import { envs } from '../constants/envs'

export type SetItem = {
  key: string
  data: unknown
  sortField?: string
}
export type Prune = {
  key: string
  dateTo: number
  sortField: string
}
export class ZStorage {
  keys: Set<string> = new Set()
  zustandStorage: StateStorage
  constructor(name: string) {
    name = `${envs.APP_NAME}_${envs.APP_VERSION}_${name}_mmkv`
    const storage = new MMKV({ id: name })
    this.zustandStorage = {
      setItem: (name: string, value: string) => {
        return storage.set(name, value)
      },
      getItem: (name: string) => {
        const value = storage.getString(name)
        return value ?? null
      },
      removeItem: (name: string) => {
        return storage.delete(name)
      },
    }
    this.keys = new Set(storage.getAllKeys())
  }
  getItem(key: string) {
    const value = this.zustandStorage.getItem(key)
    if (value) {
      try {
        return JSON.parse(value as string)
      } catch {
        return value
      }
    }
    return undefined
  }

  // insertItem if data is array to existing keys
  insertArrayItems({ key, data, sortField }: SetItem): unknown[] | false {
    if (!data || !Array.isArray(data) || !sortField) return false

    if (!Array.isArray(data)) {
      data = [data]
    }
    const oldData = this.getItem(key)
    if (oldData === undefined || !Array.isArray(oldData)) {
      return false
    }
    // sort descending on sortField
    const newData = [...(data as unknown[]), ...oldData].sort((a, b) => b[sortField] - a[sortField])

    this.zustandStorage.setItem(key, JSON.stringify(newData))
    return newData
  }
  insertObjectItems({ key, data }: SetItem) {
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      return false
    }
    const oldData = this.getItem(key)
    if (oldData === undefined || typeof oldData !== 'object' || Array.isArray(oldData)) {
      return false
    }
    const newData = { ...oldData, ...data }

    this.zustandStorage.setItem(key, JSON.stringify(newData))
    return newData
  }

  setItem({ key, data }: SetItem): boolean {
    if (data === undefined || data === null) {
      throw 'Cannot set empty item'
    }
    data = typeof data === 'object' ? JSON.stringify(data) : data
    this.zustandStorage.setItem(key, data as string)
    if (!this.keys.has(key)) {
      this.keys.add(key)
    }
    return true
  }
  removeItem(key: string): boolean {
    if (this.getItem(key)) {
      this.zustandStorage.removeItem(key)
      this.keys.delete(key)
      return true
    }
    return false
  }
  getAllKeys(): string[] {
    return Array.from(this.keys.keys())
  }
  clearAll() {
    const keys = this.getAllKeys()
    while (keys.length) {
      this.removeItem(keys[0])
      keys.shift()
    }
  }
  getAll() {
    const keys = this.getAllKeys()
    const allValues: Record<string, any> = {}
    for (let i = 0; i < keys.length; i++) {
      allValues[keys[i]] = this.getItem(keys[i])
    }
    return allValues
  }
  prune({ key, dateTo, sortField }: Prune) {
    let recs = this.getItem(key)
    if (!recs) {
      return true
    }
    if (!Array.isArray(recs)) {
      return false
    }
    // sort descending
    recs = recs.sort((a, b) => b[sortField] - a[sortField])
    while (recs.length) {
      const lastEl = recs[recs.length - 1]
      if (!lastEl[sortField]) {
        return false
      }
      if (lastEl[sortField] > dateTo) {
        break
      }
      recs.length--
    }
    this.setItem({ key, data: recs })
    return true
  }
}
