export type DeviceInfoType = {
  id?: string
  nickname?: string
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
