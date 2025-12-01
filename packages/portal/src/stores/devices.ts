import { uuid } from '@pzero/shared/uuid'

export type DeviceInfoType = {
  id?: string
  nickname?: string // Device nickname
  isPrimaryDevice?: boolean
  c_at?: number
  deviceId: string
  deviceName: string
  systemName: string
  systemVersion: string
  brand: string
  model: string
  buildNumber: string
  appVersion: string
  appName: string
  uniqueId: string
  carrier: string | null
  ipAddress: string | null
  macAddress: string | null
  deviceType: string
  isEmulator: boolean
  isTablet: boolean
  ua: string | null
  manufacturer: string | null
  os: string
  osVersion: string
  other: unknown[]
}

export const STORE = 'devices'

export class DevicesStoreClass extends ZStorage {
  primaryDevice?: DeviceInfoType
  currentDevice?: DeviceInfoType
  devices: Map<string, DeviceInfoType> = new Map()
  isPrimaryDevice: boolean = true
  constructor() {
    super(STORE)
  }
