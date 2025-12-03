import type { DeviceInfoType } from '@pzero/shared/pzero'
import { uuid } from '@pzero/shared/uuid'
import { ZStorage } from './store'

// Helper function to check if Tauri is available
function isTauriAvailable(): boolean {
  return typeof window !== 'undefined' && !!(window as any).__TAURI__
}

// Browser fallbacks for Tauri OS APIs
async function platform(): Promise<string> {
  if (isTauriAvailable()) {
    try {
      const { platform: tauriPlatform } = await import('@tauri-apps/plugin-os')
      return tauriPlatform()
    } catch (error) {
      console.warn('Tauri platform API failed, using browser fallback')
    }
  }
  return navigator.platform || 'web'
}

async function version(): Promise<string> {
  if (isTauriAvailable()) {
    try {
      const { version: tauriVersion } = await import('@tauri-apps/plugin-os')
      return tauriVersion()
    } catch (error) {
      console.warn('Tauri version API failed, using browser fallback')
    }
  }
  return navigator.userAgent || 'unknown'
}

async function family(): Promise<string> {
  if (isTauriAvailable()) {
    try {
      const { family: tauriFamily } = await import('@tauri-apps/plugin-os')
      return tauriFamily()
    } catch (error) {
      console.warn('Tauri family API failed, using browser fallback')
    }
  }
  return 'web'
}

async function arch(): Promise<string> {
  if (isTauriAvailable()) {
    try {
      const { arch: tauriArch } = await import('@tauri-apps/plugin-os')
      return tauriArch()
    } catch (error) {
      console.warn('Tauri arch API failed, using browser fallback')
    }
  }
  return 'x64'
}

async function locale(): Promise<string> {
  if (isTauriAvailable()) {
    try {
      const { locale: tauriLocale } = await import('@tauri-apps/plugin-os')
      return tauriLocale()
    } catch (error) {
      console.warn('Tauri locale API failed, using browser fallback')
    }
  }
  return navigator.language || 'en-US'
}

async function hostname(): Promise<string> {
  if (isTauriAvailable()) {
    try {
      const { hostname: tauriHostname } = await import('@tauri-apps/plugin-os')
      return tauriHostname()
    } catch (error) {
      console.warn('Tauri hostname API failed, using browser fallback')
    }
  }
  return 'web-browser'
}

export const STORE = 'devices'

/**
 * Generate a unique device identifier
 */
async function generateDeviceId(hostname: string, platform: string): Promise<string> {
  const identifier = `${hostname}-${platform}`

  // Use SubtleCrypto to generate a consistent hash
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    const encoder = new TextEncoder()
    const data = encoder.encode(identifier)
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
    return hashHex.substring(0, 32) // Take first 32 characters
  }

  // Fallback for environments without SubtleCrypto
  return btoa(identifier)
    .replace(/[^a-zA-Z0-9]/g, '')
    .substring(0, 32)
}

/**
 * Get app version from Tauri
 */
async function getAppVersion(): Promise<string> {
  try {
    const { getVersion } = await import('@tauri-apps/api/app')
    return await getVersion()
  } catch {
    return '1.0.0'
  }
}

/**
 * Get build number/version from Tauri
 */
async function getBuildNumber(): Promise<string> {
  try {
    const { getTauriVersion } = await import('@tauri-apps/api/app')
    return await getTauriVersion()
  } catch {
    return '1.0.0'
  }
}

/**
 * Get app name from Tauri
 */
async function getAppName(): Promise<string> {
  try {
    const { getName } = await import('@tauri-apps/api/app')
    return await getName()
  } catch {
    return 'Unknown App'
  }
}

/**
 * Determine device type based on platform
 */
function getDeviceType(platform: string): string {
  const mobilePlatforms = ['ios', 'android']
  const desktopPlatforms = ['windows', 'macos', 'linux']

  if (mobilePlatforms.includes(platform.toLowerCase())) {
    return 'mobile'
  } else if (desktopPlatforms.includes(platform.toLowerCase())) {
    return 'desktop'
  }
  return 'web'
}

/**
 * Check if running in an emulator (basic detection)
 */
async function getIsEmulator(): Promise<boolean> {
  try {
    const hostnameValue = await hostname()
    // Basic emulator detection - could be enhanced
    const emulatorKeywords = ['emulator', 'simulator', 'virtual']
    return emulatorKeywords.some(keyword => hostnameValue?.toLowerCase()?.includes(keyword) || false)
  } catch {
    return false
  }
}

/**
 * Check if device is tablet (basic detection for desktop/web)
 */
function getIsTablet(): boolean {
  // For Tauri desktop apps, this would typically be false
  // Could be enhanced with screen size detection if needed
  return false
}

/**
 * Get device info for Tauri applications
 */
export async function getDeviceInfo(): Promise<DeviceInfoType> {
  const [devicePlatform, osVersion, osFamily, deviceArch, deviceLocale, deviceHostname] = await Promise.all([
    platform(),
    version(),
    family(),
    arch(),
    locale(),
    hostname(),
  ])

  // Generate a consistent device ID
  const deviceId = await generateDeviceId(deviceHostname || '', devicePlatform)
  const uniqueId = uuid()

  const deviceInfo: DeviceInfoType = {
    // Core identification fields
    id: uniqueId,
    deviceId,
    uniqueId,

    // Device naming and branding
    deviceName: deviceHostname ?? 'Unknown Device',
    appName: await getAppName(),
    brand: devicePlatform.charAt(0).toUpperCase() + devicePlatform.slice(1),
    manufacturer: devicePlatform.charAt(0).toUpperCase() + devicePlatform.slice(1),
    model: `${devicePlatform} ${deviceArch}`,

    // System information
    systemName: devicePlatform,
    systemVersion: osVersion,
    os: devicePlatform,
    osVersion,

    // App version information
    appVersion: await getAppVersion(),
    buildNumber: await getBuildNumber(),

    // Device characteristics
    deviceType: getDeviceType(devicePlatform),
    isEmulator: await getIsEmulator(),
    isTablet: getIsTablet(),

    // Network information (not available for desktop/security reasons)
    carrier: null,
    ipAddress: null,
    macAddress: null,

    // Browser/user agent info
    ua: typeof navigator !== 'undefined' ? navigator.userAgent : null,

    // Additional metadata
    other: [
      {
        platform: devicePlatform,
        architecture: deviceArch,
        family: osFamily,
        locale: deviceLocale,
        hostname: deviceHostname,
        timestamp: Date.now(),
      },
    ],

    // Timestamps
    c_at: Date.now(),
  }

  return deviceInfo
}

export const deviceAssignmentTypes = {
  primary: 'primary',
  connected: 'connected',
  current: 'current',
  attrs: 'attrs',
  backedup_connections: 'backedup_connections',
}

export class DevicesStoreClass extends ZStorage {
  primaryDevice?: DeviceInfoType
  currentDevice?: DeviceInfoType
  devices: Map<string, DeviceInfoType> = new Map()
  isPrimaryDevice: boolean = true

  constructor() {
    super(STORE)
  }

  async init() {
    await this.getCurrentDeviceInfo()
    await this.getPrimaryDevice()
  }

  async getCurrentDeviceInfo(): Promise<DeviceInfoType> {
    if (this.currentDevice) {
      return this.currentDevice as DeviceInfoType
    }
    let deviceInfo = await this.getItem(deviceAssignmentTypes.current)
    if (!deviceInfo) {
      try {
        deviceInfo = await getDeviceInfo()
        deviceInfo.id = uuid()
        const saved = await this.setItem({ key: deviceAssignmentTypes.current, data: deviceInfo })
        if (!saved) {
          throw new Error('Failed to save current device info to storage')
        }
      } catch (error) {
        console.error('Failed to get current device info:', error)
        throw error
      }
    } else {
      if (deviceInfo.isPrimaryDevice) {
        this.isPrimaryDevice = true
        this.primaryDevice = deviceInfo
      }
    }
    this.currentDevice = deviceInfo
    return deviceInfo as DeviceInfoType
  }

  async transferPrimaryDeviceToCurrent() {
    const primaryDevice = await this.getPrimaryDevice()
    if (primaryDevice) {
      const currentDevice = await this.getCurrentDeviceInfo()
      this.isPrimaryDevice = true
      this.primaryDevice = currentDevice
    }
    return this.primaryDevice
  }

  async getPrimaryDevice() {
    if (this.primaryDevice) {
      return this.primaryDevice
    }
    if (this.isPrimaryDevice) {
      return this.currentDevice ?? (await this.getCurrentDeviceInfo())
    }
    const device = await this.getItem(deviceAssignmentTypes.primary)
    if (device) {
      this.primaryDevice = device
      if (this.currentDevice && this.currentDevice.deviceId === device.deviceId) {
        this.isPrimaryDevice = true
      }
    }
    return this.primaryDevice
  }

  async setPrimaryDevice(device: DeviceInfoType) {
    const primaryDevice = await this.getPrimaryDevice()
    if (primaryDevice && primaryDevice.deviceId === device.deviceId) {
      return primaryDevice
    }

    try {
      device.isPrimaryDevice = true
      if (this.currentDevice && this.currentDevice.deviceId === device.deviceId) {
        this.isPrimaryDevice = true
        this.currentDevice.isPrimaryDevice = true

        const primarySaved = await this.setItem({
          key: deviceAssignmentTypes.primary,
          data: this.currentDevice,
        })
        if (!primarySaved) {
          throw new Error('Failed to save primary device data')
        }

        const currentSaved = await this.setItem({
          key: deviceAssignmentTypes.current,
          data: this.currentDevice,
        })
        if (!currentSaved) {
          throw new Error('Failed to save current device data')
        }

        return this.currentDevice
      }

      device.c_at = Date.now()
      const saved = await this.setItem({ key: deviceAssignmentTypes.primary, data: device })
      if (!saved) {
        throw new Error('Failed to save primary device data')
      }
      return device
    } catch (error) {
      console.error('Failed to set primary device:', error)
      throw error
    }
  }

  async setToggleThisDeviceAsPrimary() {
    const isPrimary = !this.isPrimaryDevice
    const currentDevice = await this.getCurrentDeviceInfo()

    // Store original state for rollback
    const originalIsPrimary = this.isPrimaryDevice
    const originalPrimaryDevice = this.primaryDevice
    const originalCurrentDevice = this.currentDevice ? { ...this.currentDevice } : undefined

    try {
      currentDevice.isPrimaryDevice = isPrimary
      this.isPrimaryDevice = isPrimary

      const currentSaved = await this.setItem({ key: deviceAssignmentTypes.current, data: currentDevice })
      if (!currentSaved) {
        throw new Error('Failed to save current device data')
      }

      if (!isPrimary) {
        const primaryCleared = await this.setItem({ key: deviceAssignmentTypes.primary, data: null })
        if (!primaryCleared) {
          throw new Error('Failed to clear primary device data')
        }
        this.primaryDevice = undefined

        const connections = await this.getItem(deviceAssignmentTypes.connected)
        if (connections && Array.isArray(connections) && connections.length) {
          const backupSaved = await this.setItem({ key: deviceAssignmentTypes.backedup_connections, data: connections })
          if (!backupSaved) {
            throw new Error('Failed to backup connected devices')
          }
          const connectionsCleared = await this.setItem({ key: deviceAssignmentTypes.connected, data: [] })
          if (!connectionsCleared) {
            throw new Error('Failed to clear connected devices')
          }
        }
      } else {
        const primarySaved = await this.setItem({ key: deviceAssignmentTypes.primary, data: currentDevice })
        if (!primarySaved) {
          throw new Error('Failed to save primary device data')
        }
        this.primaryDevice = currentDevice
      }

      const connectionsCleared = await this.setItem({ key: deviceAssignmentTypes.connected, data: [] })
      if (!connectionsCleared) {
        throw new Error('Failed to clear connected devices list')
      }
    } catch (error) {
      // Rollback in-memory state on failure
      this.isPrimaryDevice = originalIsPrimary
      this.primaryDevice = originalPrimaryDevice
      this.currentDevice = originalCurrentDevice as DeviceInfoType | undefined

      console.error('Failed to toggle device primary status:', error)
      throw error
    }
  }

  async setIsPrimaryDevice(value: boolean) {
    const currentDevice = await this.getCurrentDeviceInfo()

    // Store original state for rollback
    const originalIsPrimary = this.isPrimaryDevice
    const originalPrimaryDevice = this.primaryDevice
    const originalCurrentDevice = this.currentDevice ? { ...this.currentDevice } : undefined

    try {
      // Update the current device's primary status
      currentDevice.isPrimaryDevice = value
      this.isPrimaryDevice = value
      this.currentDevice = currentDevice

      // Save to storage
      const currentDeviceSaved = await this.setItem({ key: deviceAssignmentTypes.current, data: currentDevice })
      if (!currentDeviceSaved) {
        throw new Error('Failed to save current device data')
      }

      if (!value) {
        // If removing primary status, clear primary device reference
        const primaryCleared = await this.setItem({ key: deviceAssignmentTypes.primary, data: null })
        if (!primaryCleared) {
          throw new Error('Failed to clear primary device data')
        }
        this.primaryDevice = undefined

        // Backup connected devices if any exist
        const connections = await this.getItem(deviceAssignmentTypes.connected)
        if (connections && Array.isArray(connections) && connections.length) {
          const backupSaved = await this.setItem({ key: deviceAssignmentTypes.backedup_connections, data: connections })
          if (!backupSaved) {
            throw new Error('Failed to backup connected devices')
          }
          const connectionsCleared = await this.setItem({ key: deviceAssignmentTypes.connected, data: [] })
          if (!connectionsCleared) {
            throw new Error('Failed to clear connected devices')
          }
        }
      } else {
        // If setting as primary, save current device as primary
        const primarySaved = await this.setItem({ key: deviceAssignmentTypes.primary, data: currentDevice })
        if (!primarySaved) {
          throw new Error('Failed to save primary device data')
        }
        this.primaryDevice = currentDevice
      }

      // Clear connected devices list when changing primary status
      const connectionsCleared = await this.setItem({ key: deviceAssignmentTypes.connected, data: [] })
      if (!connectionsCleared) {
        throw new Error('Failed to clear connected devices list')
      }

      return currentDevice
    } catch (error) {
      // Rollback in-memory state on failure
      this.isPrimaryDevice = originalIsPrimary
      this.primaryDevice = originalPrimaryDevice
      this.currentDevice = originalCurrentDevice as DeviceInfoType | undefined

      console.error('Failed to set primary device status:', error)
      throw error
    }
  }

  async getConnectedDevices() {
    const devices = await this.getItem(deviceAssignmentTypes.connected)
    if (devices && Array.isArray(devices)) {
      return devices
    }
    return []
  }

  async addConnectedDevice(device: DeviceInfoType) {
    if (!this.isPrimaryDevice || device.isPrimaryDevice) {
      throw new Error('Only primary device can add connected devices')
    }

    try {
      let devices = await this.getItem(deviceAssignmentTypes.connected)
      if (!devices) {
        devices = []
      }
      devices.push(device)

      const saved = await this.setItem({ key: deviceAssignmentTypes.connected, data: devices })
      if (!saved) {
        throw new Error('Failed to save connected device data')
      }
    } catch (error) {
      console.error('Failed to add connected device:', error)
      throw error
    }
  }

  async removeConnectedDevice(deviceId: string) {
    if (!this.isPrimaryDevice) {
      throw new Error('Only primary device can remove connected devices')
    }

    try {
      const devices = await this.getItem(deviceAssignmentTypes.connected)
      if (!devices || !Array.isArray(devices)) {
        return
      }

      const updatedDevices = devices.filter(device => device.deviceId !== deviceId)
      const saved = await this.setItem({ key: deviceAssignmentTypes.connected, data: updatedDevices })
      if (!saved) {
        throw new Error('Failed to save updated connected devices list')
      }
    } catch (error) {
      console.error('Failed to remove connected device:', error)
      throw error
    }
  }
}

export const DevicesStore = new DevicesStoreClass()

// React hook for using DevicesStore in components
export function useDevicesStore() {
  return DevicesStore
}

// Standalone functions for backward compatibility with react-native-device-info API
export const getSystemName = async () => {
  return await platform()
}

export const getSystemVersion = async () => {
  return await version()
}

export const getDeviceId = async () => {
  const hostnameValue = await hostname()
  const platformValue = await platform()
  return await generateDeviceId(hostnameValue || '', platformValue)
}

export const getModel = async () => {
  const platformValue = await platform()
  const archValue = await arch()
  return `${platformValue} ${archValue}`
}

export const getBrand = async () => {
  const platformValue = await platform()
  return platformValue.charAt(0).toUpperCase() + platformValue.slice(1)
}
