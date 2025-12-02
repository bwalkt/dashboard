import { ZStorage as Storage, type ZStorageParams } from '@pzero/shared/pzero'
import { createStore, del, get, keys, set } from 'idb-keyval'
import { envs } from '../constants/envs'

export type { SetItem } from '@pzero/shared/pzero'

// IndexedDB adapter that matches MMKV interface
class IndexedDBAdapter {
  private store: any
  private id: string

  constructor({ id }: { id: string }) {
    this.id = id
    // Create a custom store for this specific storage instance
    this.store = createStore(`${id}-db`, `${id}-store`)
  }

  // Async method to set a value
  async set(key: string, value: string): Promise<void> {
    await set(key, value, this.store)
  }

  // Async method to get a value
  async get(key: string): Promise<string | undefined> {
    const value = await get(key, this.store)
    return value
  }
  getId(): string {
    return this.id
  }
  // Async method to delete a value
  async delete(key: string): Promise<void> {
    await del(key, this.store)
  }

  // Async method to get all keys
  async getAllKeys(): Promise<string[]> {
    const allKeys = await keys(this.store)
    return allKeys.map(k => String(k))
  }
}

export class ZStorage extends Storage {
  constructor(name: string) {
    super({ name, storageImpl: IndexedDBAdapter, envs, suffix: 'idb' } as ZStorageParams)
  }
}
