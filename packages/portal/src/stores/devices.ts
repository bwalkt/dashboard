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

export const STORE = 'portal-devices'

/**
 * Get CPU information
 */
async function getCPUInfo(): Promise<{ model: string; cores: number }> {
  if (isTauriAvailable()) {
    try {
      // Try to get CPU info from Tauri
      const { invoke } = await import('@tauri-apps/api/core')
      const cpuInfo = await invoke('get_cpu_info').catch(() => null)
      if (cpuInfo) return cpuInfo
    } catch (error) {
      console.warn('Tauri CPU info failed, using browser fallback')
    }
  }

  // Browser fallback
  return {
    model: navigator.hardwareConcurrency ? `Generic-${navigator.hardwareConcurrency}core` : 'unknown',
    cores: navigator.hardwareConcurrency || 1,
  }
}

/**
 * Get memory information
 */
async function getMemoryInfo(): Promise<{ total: number }> {
  if (isTauriAvailable()) {
    try {
      const { invoke } = await import('@tauri-apps/api/core')
      const memInfo = await invoke('get_memory_info').catch(() => null)
      if (memInfo) return memInfo
    } catch (error) {
      console.warn('Tauri memory info failed, using browser fallback')
    }
  }

  // Browser fallback using available APIs
  const memoryGB =
    (navigator as any).deviceMemory ||
    (navigator as any).hardwareConcurrency * 2 || // Rough estimate
    4 // Default fallback

  return { total: memoryGB * 1024 * 1024 * 1024 }
}

/**
 * Get screen information
 */
function getScreenInfo(): { width: number; height: number; colorDepth: number } {
  return {
    width: screen.width,
    height: screen.height,
    colorDepth: screen.colorDepth,
  }
}

/**
 * Get network interfaces (MAC addresses)
 */
async function getNetworkInfo(): Promise<string[]> {
  if (isTauriAvailable()) {
    try {
      const { invoke } = await import('@tauri-apps/api/core')
      const networkInfo = await invoke('get_network_info').catch(() => [])
      return networkInfo || []
    } catch (error) {
      console.warn('Tauri network info failed')
    }
  }

  // Browser can't access MAC addresses for security reasons
  return []
}

/**
 * Get hardware UUID/serial if available
 */
async function getHardwareUUID(): Promise<string | null> {
  if (isTauriAvailable()) {
    try {
      const { invoke } = await import('@tauri-apps/api/core')
      const uuid = await invoke('get_hardware_uuid').catch(() => null)
      return uuid
    } catch (error) {
      console.warn('Tauri hardware UUID failed')
    }
  }

  return null
}

/**
 * Generate a comprehensive hardware fingerprint
 */
async function generateHardwareFingerprint(): Promise<string> {
  const [hostnameValue, platformValue, archValue, cpuInfo, memoryInfo, screenInfo, networkInfo, hardwareUUID] =
    await Promise.all([
      hostname(),
      platform(),
      arch(),
      getCPUInfo(),
      getMemoryInfo(),
      getScreenInfo(),
      getNetworkInfo(),
      getHardwareUUID(),
    ])

  // Create a comprehensive fingerprint
  const fingerprint = {
    hostname: hostnameValue,
    platform: platformValue,
    arch: archValue,
    cpu: {
      model: cpuInfo.model,
      cores: cpuInfo.cores,
    },
    memory: {
      total: Math.floor(memoryInfo.total / (1024 * 1024 * 1024)), // Convert to GB
    },
    screen: {
      resolution: `${screenInfo.width}x${screenInfo.height}`,
      colorDepth: screenInfo.colorDepth,
    },
    network: networkInfo.length > 0 ? networkInfo.sort() : [], // Sort for consistency
    hardwareUUID,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    language: typeof navigator !== 'undefined' ? navigator.language : 'en-US',
  }

  return JSON.stringify(fingerprint)
}

/**
 * Generate a unique device identifier based on hardware fingerprint
 */
async function generateDeviceId(): Promise<string> {
  console.log('Generating comprehensive device fingerprint...')

  try {
    const fingerprint = await generateHardwareFingerprint()
    console.log('Hardware fingerprint:', JSON.parse(fingerprint))

    // Use SubtleCrypto to generate a consistent hash
    if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
      const encoder = new TextEncoder()
      const data = encoder.encode(fingerprint)
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', data)
      const hashArray = Array.from(new Uint8Array(hashBuffer))
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
      const deviceId = hashHex.substring(0, 32) // Take first 32 characters
      console.log('Generated device ID:', deviceId)
      return deviceId
    }

    // Fallback for environments without SubtleCrypto
    const simpleHash = btoa(fingerprint)
      .replace(/[^a-zA-Z0-9]/g, '')
      .substring(0, 32)
    console.log('Generated device ID (fallback):', simpleHash)
    return simpleHash
  } catch (error) {
    console.error('Failed to generate device fingerprint:', error)

    // Ultimate fallback - use basic info
    const hostnameValue = await hostname()
    const platformValue = await platform()
    const fallbackId = btoa(`${hostnameValue}-${platformValue}-${Date.now()}`)
      .replace(/[^a-zA-Z0-9]/g, '')
      .substring(0, 32)
    console.log('Generated device ID (ultimate fallback):', fallbackId)
    return fallbackId
  }
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
export async function getDeviceInfo(nickname?: string): Promise<DeviceInfoType> {
  const [devicePlatform, osVersion, osFamily, deviceArch, deviceLocale, deviceHostname] = await Promise.all([
    platform(),
    version(),
    family(),
    arch(),
    locale(),
    hostname(),
  ])

  // Get screen dimensions
  const screenInfo = getScreenInfo()
  const screenSize = `${screenInfo.width}x${screenInfo.height}`

  // Generate a consistent device ID
  const deviceId = await generateDeviceId()
  const uniqueId = uuid()

  const deviceInfo: DeviceInfoType = {
    // Core identification fields
    id: uniqueId,
    deviceId,
    uniqueId,

    // Device naming and branding - use nickname if provided, otherwise hostname
    deviceName: nickname || deviceHostname || 'Unknown Device',
    appName: await getAppName(),
    brand: devicePlatform.charAt(0).toUpperCase() + devicePlatform.slice(1),
    manufacturer: devicePlatform.charAt(0).toUpperCase() + devicePlatform.slice(1),
    model: `${devicePlatform} ${deviceArch} ${screenSize}`,

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
    nickname: nickname ? nickname : `${devicePlatform} ${deviceArch} ${screenSize}`,
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
  console.log('Generated device info:', deviceInfo)
  //  alert('Generated device info: ' + JSON.stringify(deviceInfo, null, 2))
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
    try {
      console.log('DevicesStore.init() starting...')
      await this.getCurrentDeviceInfo()
      console.log('getCurrentDeviceInfo() completed')
      await this.getPrimaryDevice()
      console.log('getPrimaryDevice() completed')
      console.log('DevicesStore.init() completed successfully')
    } catch (error) {
      console.error('DevicesStore.init() failed:', error)
      throw error
    }
  }

  async getCurrentDeviceInfo(nickname?: string): Promise<DeviceInfoType> {
    console.log('getCurrentDeviceInfo() called, currentDevice:', this.currentDevice ? 'exists' : 'null')

    if (this.currentDevice) {
      console.log('Returning existing currentDevice')
      return this.currentDevice as DeviceInfoType
    }

    console.log('Getting device info from storage...')
    let deviceInfo = await this.getItem(deviceAssignmentTypes.current)

    if (!deviceInfo) {
      try {
        console.log('No stored device info, generating new device info...')
        deviceInfo = await getDeviceInfo(nickname)
        deviceInfo.id = uuid()

        console.log('Saving device info to storage...')
        const saved = await this.setItem({ key: deviceAssignmentTypes.current, data: deviceInfo })
        if (!saved) {
          throw new Error('Failed to save current device info to storage')
        }
        console.log('Device info saved successfully')
      } catch (error) {
        console.error('Failed to get current device info:', error)
        throw error
      }
    } else {
      console.log('Found existing device info in storage')
      if (deviceInfo.isPrimaryDevice) {
        this.isPrimaryDevice = true
        this.primaryDevice = deviceInfo
        console.log('Device is marked as primary')
      }
    }

    this.currentDevice = deviceInfo
    console.log('Setting currentDevice, final result:', deviceInfo?.deviceName || 'unnamed device')
    return deviceInfo as DeviceInfoType
  }

  async forceRegenerateDeviceInfo(nickname?: string): Promise<DeviceInfoType> {
    console.log('Forcing regeneration of device info...')
    this.currentDevice = undefined
    await this.removeItem(deviceAssignmentTypes.current)
    return await this.getCurrentDeviceInfo(nickname)
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

  async setPrimaryDevice(device: DeviceInfoType) {
    try {
      this.primaryDevice = device
      const saved = await this.setItem({ key: deviceAssignmentTypes.primary, data: device })
      if (!saved) {
        throw new Error('Failed to save primary device data')
      }
    } catch (error) {
      console.error('Failed to set primary device:', error)
      throw error
    }
  }

  async setIsPrimaryDevice(isPrimary: boolean) {
    try {
      this.isPrimaryDevice = isPrimary
      if (this.currentDevice) {
        this.currentDevice.isPrimaryDevice = isPrimary
        const saved = await this.setItem({ key: deviceAssignmentTypes.current, data: this.currentDevice })
        if (!saved) {
          throw new Error('Failed to update current device primary status')
        }
      }
    } catch (error) {
      console.error('Failed to set primary device status:', error)
      throw error
    }
  }
}

// Create the store instance with proper singleton pattern
let _devicesStore: DevicesStoreClass | null = null

function getDevicesStore(): DevicesStoreClass {
  if (!_devicesStore) {
    _devicesStore = new DevicesStoreClass()
    console.log('Initialized DevicesStore:', _devicesStore.currentDevice || 'Not initialized yet')
  }
  return _devicesStore
}

export const DevicesStore = getDevicesStore()

// React hook for using DevicesStore in components
export function useDevicesStore() {
  return getDevicesStore()
}

// Standalone functions for backward compatibility with react-native-device-info API
export const getSystemName = async () => {
  return await platform()
}

export const getSystemVersion = async () => {
  return await version()
}

export const getDeviceId = async () => {
  return await generateDeviceId()
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
