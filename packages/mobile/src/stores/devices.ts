import type { DeviceInfoType } from '@pzero/shared/pzero'
import { uuid } from '@pzero/shared/uuid'
import DeviceInfo from 'react-native-device-info'
import { ZStorage } from './store'

export async function getDeviceInfo(): Promise<DeviceInfoType> {
  const deviceInfo: DeviceInfoType = {
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
    ua: await DeviceInfo.getUserAgent(),
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

        const primarySaved = await await this.setItem({
          key: deviceAssignmentTypes.primary,
          data: this.currentDevice,
        })
        if (!primarySaved) {
          throw new Error('Failed to save primary device data')
        }

        const currentSaved = await await this.setItem({
          key: deviceAssignmentTypes.current,
          data: this.currentDevice,
        })
        if (!currentSaved) {
          throw new Error('Failed to save current device data')
        }

        return this.currentDevice
      }

      device.c_at = Date.now()
      const saved = await await this.setItem({ key: deviceAssignmentTypes.primary, data: device })
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
          const backupSaved = await await this.setItem({
            key: deviceAssignmentTypes.backedup_connections,
            data: connections,
          })
          if (!backupSaved) {
            throw new Error('Failed to backup connected devices')
          }
          const connectionsCleared = await await this.setItem({ key: deviceAssignmentTypes.connected, data: [] })
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
          const backupSaved = await await this.setItem({
            key: deviceAssignmentTypes.backedup_connections,
            data: connections,
          })
          if (!backupSaved) {
            throw new Error('Failed to backup connected devices')
          }
          const connectionsCleared = await await this.setItem({ key: deviceAssignmentTypes.connected, data: [] })
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
