import { uuid } from '@pzero/shared/uuid'
import DeviceInfo from 'react-native-device-info'
import { ZStorage } from './store'

export type DeviceInfoType = {
  uuid?: string
  nickname?: string
  isPrimaryDevice?: boolean
  dateAdded?: number
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
      deviceInfo = (await getDeviceInfo()) as unknown as DeviceInfoType
      deviceInfo.dateAdded = Date.now()
      deviceInfo.uuid = uuid()
      this.setItem({ key: deviceAssignmentTypes.current, data: deviceInfo, isTransit: false })
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
    device.isPrimaryDevice = true
    if (this.currentDevice && this.currentDevice.deviceId === device.deviceId) {
      this.isPrimaryDevice = true
      this.currentDevice.isPrimaryDevice = true
      this.setItem({ key: deviceAssignmentTypes.primary, data: this.currentDevice, isTransit: false })
      this.setItem({ key: deviceAssignmentTypes.current, data: this.currentDevice, isTransit: false })
      return this.currentDevice
    }
    device.dateAdded = Date.now()
    this.setItem({ key: deviceAssignmentTypes.primary, data: device, isTransit: false })
  }
  async setToggleThisDeviceAsPrimary() {
    const isPrimary = !this.isPrimaryDevice
    const currentDevice = await this.getCurrentDeviceInfo()
    currentDevice.isPrimaryDevice = isPrimary
    this.isPrimaryDevice = isPrimary
    this.setItem({ key: deviceAssignmentTypes.current, data: currentDevice })
    if (!isPrimary) {
      this.setItem({ key: deviceAssignmentTypes.primary, data: null })
      this.primaryDevice = undefined
      const connections = this.getItem(deviceAssignmentTypes.connected)
      if (connections && Array.isArray(connections) && connections.length) {
        this.setItem({ key: deviceAssignmentTypes.backedup_connections, data: connections })
        this.setItem({ key: deviceAssignmentTypes.connected, data: [] })
      }
    } else {
      this.setItem({ key: deviceAssignmentTypes.primary, data: currentDevice })
      this.primaryDevice = currentDevice
    }
    this.setItem({ key: deviceAssignmentTypes.connected, data: [] })
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
    let devices = this.getItem(deviceAssignmentTypes.connected)
    if (!devices) {
      devices = []
    }
    devices.push(device)
    this.setItem({ key: deviceAssignmentTypes.connected, data: devices })
  }
  async removeConnectedDevice(deviceId: string) {
    if (!this.isPrimaryDevice) {
      throw new Error('Only primary device can remove connected devices')
    }
    const devices = this.getItem(deviceAssignmentTypes.connected)
    if (!devices || !Array.isArray(devices)) {
      return
    }
    const updatedDevices = devices.filter(device => device.deviceId !== deviceId)
    this.setItem({ key: deviceAssignmentTypes.connected, data: updatedDevices })
  }
}

export const DevicesStore = new DevicesStoreClass()
