import type { DeviceInfoType } from '@pzero/shared/pzero'
import { uuid } from '@pzero/shared/uuid'
import { arch, family, hostname, locale, platform, version } from '@tauri-apps/plugin-os'
import { create } from 'zustand'

export const STORE = 'devices'

interface DevicesStore {
  deviceInfo: DeviceInfoType | null
  isLoading: boolean
  error: string | null

  // Actions
  fetchDeviceInfo: () => Promise<void>
  clearError: () => void

  // Getters for backward compatibility
  getSystemName: () => string | null
  getSystemVersion: () => string | null
  getDeviceId: () => string | null
  getModel: () => string | null
  getBrand: () => string | null
}

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

export const useDevicesStore = create<DevicesStore>((set, get) => ({
  deviceInfo: null,
  isLoading: false,
  error: null,

  fetchDeviceInfo: async () => {
    set({ isLoading: true, error: null })

    try {
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
        id: uniqueId,
        deviceId,
        deviceName: deviceHostname ?? '',
        systemName: devicePlatform,
        systemVersion: osVersion,
        brand: devicePlatform.charAt(0).toUpperCase() + devicePlatform.slice(1),
        model: `${devicePlatform} ${deviceArch}`,
        buildNumber: await getBuildNumber(),
        appVersion: await getAppVersion(),
        appName: await getAppName(),
        uniqueId,
        carrier: null, // Not applicable for desktop apps
        ipAddress: null, // Could be implemented if needed
        macAddress: null, // Not accessible for security reasons
        deviceType: getDeviceType(devicePlatform),
        isEmulator: await getIsEmulator(),
        isTablet: getIsTablet(),
        ua: navigator.userAgent || null,
        manufacturer: devicePlatform.charAt(0).toUpperCase() + devicePlatform.slice(1),
        os: devicePlatform,
        osVersion,
        other: [],
        c_at: Date.now(),
      }

      set({ deviceInfo, isLoading: false })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to get device info'
      set({ error: errorMessage, isLoading: false })
    }
  },

  clearError: () => set({ error: null }),

  // Backward compatibility getters
  getSystemName: () => {
    const { deviceInfo } = get()
    return deviceInfo?.systemName || null
  },

  getSystemVersion: () => {
    const { deviceInfo } = get()
    return deviceInfo?.systemVersion || null
  },

  getDeviceId: () => {
    const { deviceInfo } = get()
    return deviceInfo?.deviceId || null
  },

  getModel: () => {
    const { deviceInfo } = get()
    return deviceInfo?.model || null
  },

  getBrand: () => {
    const { deviceInfo } = get()
    return deviceInfo?.brand || null
  },
}))

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
