import type { StateStorage } from 'zustand/middleware'

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
export type ZStorageParams = {
  name: string
  envs: {
    APP_NAME: string
    APP_VERSION: string
  }
  storageImpl?: any
  suffix?: string
}
const names = new Set<string>()

export class ZStorage {
  keys: Set<string> = new Set()
  zustandStorage: StateStorage
  name: string
  private storage: any
  private isInitialized = false

  constructor({ name, envs, storageImpl, suffix = 'mmkv' }: ZStorageParams) {
    if (names.has(name)) {
      throw new Error(`Storage with name ${name} already exists`)
    }
    names.add(name)
    this.name = name
    const id = `${envs.APP_NAME}_${envs.APP_VERSION}_${name}_${suffix}`
    this.storage = new storageImpl({ id })

    // Create async-aware zustand storage interface
    this.zustandStorage = {
      setItem: async (name: string, value: string) => {
        // Handle both sync (MMKV) and async (IndexedDB) storage implementations
        const result = this.storage.set(name, value)
        // If result is a promise, await it; otherwise return as-is
        return result instanceof Promise ? await result : result
      },
      getItem: async (name: string) => {
        // Handle both sync (MMKV) and async (IndexedDB) storage implementations
        // MMKV uses getString, IndexedDB-like storages use get
        if (this.storage.getString) {
          // Sync: MMKV
          const value = this.storage.getString(name)
          return value ?? null
        } else {
          // Async: IndexedDB or other async storages
          const value = await this.storage.get(name)
          return value ?? null
        }
      },
      removeItem: async (name: string) => {
        // Handle both sync (MMKV) and async (IndexedDB) storage implementations
        const result = this.storage.delete(name)
        // If result is a promise, await it; otherwise return as-is
        return result instanceof Promise ? await result : result
      },
    }

    // Initialize keys synchronously for MMKV, async init needed for IndexedDB
    if (this.storage.getAllKeys && typeof this.storage.getAllKeys === 'function') {
      const keys = this.storage.getAllKeys()
      if (keys instanceof Promise) {
        // Async storage - keys will be initialized later
        this.initializeAsync()
      } else {
        // Sync storage - keys available immediately
        this.keys = new Set(keys)
        this.isInitialized = true
      }
    } else {
      this.isInitialized = true
    }
  }

  private async initializeAsync() {
    const keys = await this.storage.getAllKeys()
    this.keys = new Set(keys)
    this.isInitialized = true
  }
  async getItem(key: string) {
    const value = await this.zustandStorage.getItem(key)
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
  async insertArrayItems({ key, data, sortField }: SetItem): Promise<unknown[] | false> {
    if (!data || !Array.isArray(data) || !sortField) return false

    if (!Array.isArray(data)) {
      data = [data]
    }
    const oldData = await this.getItem(key)
    if (oldData === undefined || !Array.isArray(oldData)) {
      return false
    }
    // sort descending on sortField
    const newData = [...(data as unknown[]), ...oldData].sort((a, b) => b[sortField] - a[sortField])

    await this.zustandStorage.setItem(key, JSON.stringify(newData))
    return newData
  }
  async insertObjectItems({ key, data }: SetItem): Promise<any | false> {
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      return false
    }
    const oldData = await this.getItem(key)
    if (oldData === undefined || typeof oldData !== 'object' || Array.isArray(oldData)) {
      return false
    }
    const newData = { ...oldData, ...data }

    await this.zustandStorage.setItem(key, JSON.stringify(newData))
    return newData
  }

  async setItem({ key, data }: SetItem): Promise<boolean> {
    if (data === undefined || data === null) {
      throw 'Cannot set empty item'
    }
    data = typeof data === 'object' ? JSON.stringify(data) : data
    await this.zustandStorage.setItem(key, data as string)
    if (!this.keys.has(key)) {
      this.keys.add(key)
    }
    return true
  }
  async removeItem(key: string): Promise<boolean> {
    if (await this.getItem(key)) {
      await this.zustandStorage.removeItem(key)
      this.keys.delete(key)
      return true
    }
    return false
  }
  async getAllKeys(): Promise<string[]> {
    // Wait for initialization if async storage
    if (!this.isInitialized) {
      if (this.storage.getAllKeys) {
        const keys = await this.storage.getAllKeys()
        this.keys = new Set(keys)
        this.isInitialized = true
      }
    }
    return Array.from(this.keys.keys())
  }
  async clearAll() {
    const keys = await this.getAllKeys()
    while (keys.length) {
      await this.removeItem(keys[0])
      keys.shift()
    }
  }
  async getAll() {
    const keys = await this.getAllKeys()
    const allValues: Record<string, any> = {}
    for (let i = 0; i < keys.length; i++) {
      allValues[keys[i]] = await this.getItem(keys[i])
    }
    return allValues
  }
  async prune({ key, dateTo, sortField }: Prune): Promise<boolean> {
    let recs = await this.getItem(key)
    if (!recs) {
      return true
    }
    if (!Array.isArray(recs)) {
      return false
    }
    // Validate all records have the sort Field
    if (!recs.every(item => item && typeof item === 'object' && sortField in item)) {
      return false
    }
    // sort descendin
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
    await this.setItem({ key, data: recs })
    return true
  }
}
