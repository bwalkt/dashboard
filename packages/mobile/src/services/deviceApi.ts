import type { DeviceInfoType } from '@pzero/shared/pzero'
import { stores } from '../stores'
import { ServiceClass } from './index'
import { getServerURL } from './server'

export interface ConnectDeviceRequest {
  uid: string
  deviceInfo: DeviceInfoType
}

export interface ConnectDeviceResponse {
  success: boolean
  message: string
  device: {
    id: string
    uid: string
    isVerifier: boolean
    isPrimary: boolean
    status: string
    deviceInfo: DeviceInfoType
    [key: string]: any
  }
}

class DeviceApiService {
  private service: ServiceClass | null = null

  private async getService(): Promise<ServiceClass> {
    if (!this.service) {
      const serverUrl = await getServerURL()
      this.service = new ServiceClass({
        baseURL: `${serverUrl}/api`,
        defaultHeaders: [{ key: 'Content-Type', value: 'application/json' }],
      })
    }
    return this.service
  }

  /**
   * Connect device to server and set as verifier
   */
  async connectDevice(uid: string, deviceInfo: DeviceInfoType): Promise<ConnectDeviceResponse> {
    try {
      const service = await this.getService()

      console.log('DeviceApi: Connecting device to server', {
        uid,
        deviceInfo: {
          id: deviceInfo.id,
          deviceId: deviceInfo.deviceId,
          deviceName: deviceInfo.deviceName,
          nickname: deviceInfo.nickname,
        },
      })

      const response = (await service.request({
        method: 'POST',
        endPoint: '/connectDevice',
        body: {
          uid,
          deviceInfo,
        },
        timeout: 10000, // 10 seconds
      })) as ConnectDeviceResponse

      console.log('DeviceApi: Device connected successfully', {
        deviceId: response.device?.id,
        isVerifier: response.device?.isVerifier,
        status: response.device?.status,
      })

      return response
    } catch (error) {
      console.error('DeviceApi: Failed to connect device:', error)
      throw error
    }
  }

  /**
   * Get all devices for a user
   */
  async getDevices(uid: string): Promise<{ success: boolean; devices: any[] }> {
    try {
      const service = await this.getService()

      const response = (await service.request({
        method: 'GET',
        endPoint: `/devices?uid=${encodeURIComponent(uid)}`,
        timeout: 10000,
      })) as { success: boolean; devices: any[] }

      return response
    } catch (error) {
      console.error('DeviceApi: Failed to get devices:', error)
      throw error
    }
  }
}

export const deviceApiService = new DeviceApiService()
