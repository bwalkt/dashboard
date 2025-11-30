import { uuid } from '@pzero/shared/uuid'
import DeviceInfo from 'react-native-device-info'
import { ZStorage } from './store'

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

export async function getDeviceInfo() {
  const deviceInfo = {
    deviceId: DeviceInfo.getDeviceId(),
    deviceName: await DeviceInfo.getDeviceName(),
    systemName: DeviceInfo.getSystemName(),
    systemVersion: DeviceInfo.getSystemVersion(),
    brand: DeviceInfo.getBrand(),
    model: DeviceInfo.getModel(),
    buildNumber: DeviceInfo.getBuildNumber(),
    appName: DeviceInfo.getApplicationName(),
    appVersion: DeviceInfo.getVersion(),
    uniqueId: await DeviceInfo.getUniqueId(),
    carrier: await DeviceInfo.getCarrier(),
    ipAddress: await DeviceInfo.getIpAddress(),
    macAddress: await DeviceInfo.getMacAddress(),
    deviceType: DeviceInfo.getDeviceType(),
    isEmulator: await DeviceInfo.isEmulator(),
    isTablet: DeviceInfo.isTablet(),
    ua: DeviceInfo.getUserAgent(),
    manufacturer: await DeviceInfo.getManufacturer(),
    os: DeviceInfo.getSystemName(),
    osVersion: DeviceInfo.getSystemVersion(),
    other: [],
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

export const STORE = 'devices'

export class DevicesStoreClass extends ZStorage {
  primaryDevice?: DeviceInfoType
  currentDevice?: DeviceInfoType
  devices: Map<string, DeviceInfoType> = new Map()
  isPrimaryDevice: boolean = false
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
    let deviceInfo = this.getItem(deviceAssignmentTypes.current)
    if (!deviceInfo) {
      try {
        deviceInfo = (await getDeviceInfo()) as unknown as DeviceInfoType
        deviceInfo.id = uuid()
        const saved = this.setItem({ key: deviceAssignmentTypes.current, data: deviceInfo, isTransit: false })
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
      return this.currentDevice ?? this.getCurrentDeviceInfo()
    }
    const device = this.getItem(deviceAssignmentTypes.primary)
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

        const primarySaved = this.setItem({
          key: deviceAssignmentTypes.primary,
          data: this.currentDevice,
          isTransit: false,
        })
        if (!primarySaved) {
          throw new Error('Failed to save primary device data')
        }

        const currentSaved = this.setItem({
          key: deviceAssignmentTypes.current,
          data: this.currentDevice,
          isTransit: false,
        })
        if (!currentSaved) {
          throw new Error('Failed to save current device data')
        }

        return this.currentDevice
      }

      device.c_at = Date.now()
      const saved = this.setItem({ key: deviceAssignmentTypes.primary, data: device, isTransit: false })
      if (!saved) {
        throw new Error('Failed to save primary device data')
      }
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
    const originalCurrentDevice = { ...this.currentDevice }

    try {
      currentDevice.isPrimaryDevice = isPrimary
      this.isPrimaryDevice = isPrimary

      const currentSaved = this.setItem({ key: deviceAssignmentTypes.current, data: currentDevice })
      if (!currentSaved) {
        throw new Error('Failed to save current device data')
      }

      if (!isPrimary) {
        const primaryCleared = this.setItem({ key: deviceAssignmentTypes.primary, data: null })
        if (!primaryCleared) {
          throw new Error('Failed to clear primary device data')
        }
        this.primaryDevice = undefined

        const connections = this.getItem(deviceAssignmentTypes.connected)
        if (connections && Array.isArray(connections) && connections.length) {
          const backupSaved = this.setItem({ key: deviceAssignmentTypes.backedup_connections, data: connections })
          if (!backupSaved) {
            throw new Error('Failed to backup connected devices')
          }
          const connectionsCleared = this.setItem({ key: deviceAssignmentTypes.connected, data: [] })
          if (!connectionsCleared) {
            throw new Error('Failed to clear connected devices')
          }
        }
      } else {
        const primarySaved = this.setItem({ key: deviceAssignmentTypes.primary, data: currentDevice })
        if (!primarySaved) {
          throw new Error('Failed to save primary device data')
        }
        this.primaryDevice = currentDevice
      }

      const connectionsCleared = this.setItem({ key: deviceAssignmentTypes.connected, data: [] })
      if (!connectionsCleared) {
        throw new Error('Failed to clear connected devices list')
      }
    } catch (error) {
      // Rollback in-memory state on failure
      this.isPrimaryDevice = originalIsPrimary
      this.primaryDevice = originalPrimaryDevice
      this.currentDevice = originalCurrentDevice

      console.error('Failed to toggle device primary status:', error)
      throw error
    }
  }

  async setIsPrimaryDevice(value: boolean) {
    const currentDevice = await this.getCurrentDeviceInfo()

    // Store original state for rollback
    const originalIsPrimary = this.isPrimaryDevice
    const originalPrimaryDevice = this.primaryDevice
    const originalCurrentDevice = { ...this.currentDevice }

    try {
      // Update the current device's primary status
      currentDevice.isPrimaryDevice = value
      this.isPrimaryDevice = value
      this.currentDevice = currentDevice

      // Save to storage
      const currentDeviceSaved = this.setItem({ key: deviceAssignmentTypes.current, data: currentDevice })
      if (!currentDeviceSaved) {
        throw new Error('Failed to save current device data')
      }

      if (!value) {
        // If removing primary status, clear primary device reference
        const primaryCleared = this.setItem({ key: deviceAssignmentTypes.primary, data: null })
        if (!primaryCleared) {
          throw new Error('Failed to clear primary device data')
        }
        this.primaryDevice = undefined

        // Backup connected devices if any exist
        const connections = this.getItem(deviceAssignmentTypes.connected)
        if (connections && Array.isArray(connections) && connections.length) {
          const backupSaved = this.setItem({ key: deviceAssignmentTypes.backedup_connections, data: connections })
          if (!backupSaved) {
            throw new Error('Failed to backup connected devices')
          }
          const connectionsCleared = this.setItem({ key: deviceAssignmentTypes.connected, data: [] })
          if (!connectionsCleared) {
            throw new Error('Failed to clear connected devices')
          }
        }
      } else {
        // If setting as primary, save current device as primary
        const primarySaved = this.setItem({ key: deviceAssignmentTypes.primary, data: currentDevice })
        if (!primarySaved) {
          throw new Error('Failed to save primary device data')
        }
        this.primaryDevice = currentDevice
      }

      // Clear connected devices list when changing primary status
      const connectionsCleared = this.setItem({ key: deviceAssignmentTypes.connected, data: [] })
      if (!connectionsCleared) {
        throw new Error('Failed to clear connected devices list')
      }

      return currentDevice
    } catch (error) {
      // Rollback in-memory state on failure
      this.isPrimaryDevice = originalIsPrimary
      this.primaryDevice = originalPrimaryDevice
      this.currentDevice = originalCurrentDevice

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
      let devices = this.getItem(deviceAssignmentTypes.connected)
      if (!devices) {
        devices = []
      }
      devices.push(device)

      const saved = this.setItem({ key: deviceAssignmentTypes.connected, data: devices })
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
      const devices = this.getItem(deviceAssignmentTypes.connected)
      if (!devices || !Array.isArray(devices)) {
        return
      }

      const updatedDevices = devices.filter(device => device.deviceId !== deviceId)
      const saved = this.setItem({ key: deviceAssignmentTypes.connected, data: updatedDevices })
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
