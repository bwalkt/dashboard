import { ZStorage as Storage, type ZStorageParams } from '@pzero/shared/pzero'
import { MMKV } from 'react-native-mmkv'
import { envs } from '../constants/envs'

export type { SetItem } from '@pzero/shared/pzero'
export class ZStorage extends Storage {
  constructor(name: string) {
    super({ name, storageImpl: MMKV, envs, suffix: 'mmkv' } as ZStorageParams)
  }
}
