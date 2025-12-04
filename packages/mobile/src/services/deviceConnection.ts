import type { DeviceInfoType } from '@pzero/shared/pzero'
import { stores } from '../stores'
import { bleService } from './ble'
import { type ConnectDeviceResponse, deviceApiService } from './deviceApi'

export interface DeviceConnectionOptions {
  uid: string
  deviceInfo?: DeviceInfoType
  transmitUidViaBle?: boolean
}

export interface DeviceConnectionResult {
  success: boolean
  serverResponse?: ConnectDeviceResponse
  bleTransmissionSuccess?: boolean
  error?: string
}

/**
 * Enhanced device connection service that handles both server persistence
 * and BLE UID transmission for proximity verification
 */
class DeviceConnectionService {
  private static instance: DeviceConnectionService

  private constructor() {}

  static getInstance(): DeviceConnectionService {
    if (!DeviceConnectionService.instance) {
      DeviceConnectionService.instance = new DeviceConnectionService()
    }
    return DeviceConnectionService.instance
  }

  /**
   * Connect device to server and optionally transmit UID via BLE for proximity verification
   */
  async connectDevice(options: DeviceConnectionOptions): Promise<DeviceConnectionResult> {
    const { uid, deviceInfo, transmitUidViaBle = true } = options

    try {
      console.log('DeviceConnection: Starting device connection flow', {
        uid,
        hasDeviceInfo: !!deviceInfo,
        transmitUidViaBle,
      })

      // Use provided device info or get current device info
      let targetDeviceInfo = deviceInfo
      if (!targetDeviceInfo) {
        const devicesStore = stores.DevicesStore
        await devicesStore.init()
        targetDeviceInfo = await devicesStore.getCurrentDeviceInfo()
      }

      if (!targetDeviceInfo) {
        throw new Error('No device info available')
      }

      // Step 1: Connect device to server
      console.log('DeviceConnection: Connecting device to server...')
      const serverResponse = await deviceApiService.connectDevice(uid, targetDeviceInfo)

      console.log('DeviceConnection: Server connection successful', {
        deviceId: serverResponse.device?.id,
        isVerifier: serverResponse.device?.isVerifier,
        status: serverResponse.device?.status,
      })

      let bleTransmissionSuccess = false

      // Step 2: Transmit UID via BLE for proximity verification (if requested)
      if (transmitUidViaBle) {
        try {
          console.log('DeviceConnection: Transmitting UID via BLE for proximity verification...')

          // Initialize BLE service if not already initialized
          if (!bleService.isCurrentlyAdvertising()) {
            await bleService.startAdvertising()
          }

          // Transmit the UID via BLE
          await bleService.transmitUid(uid)
          bleTransmissionSuccess = true

          console.log('DeviceConnection: BLE UID transmission successful')
        } catch (bleError) {
          console.error('DeviceConnection: BLE UID transmission failed:', bleError)
          // Don't fail the entire operation if BLE transmission fails
          // The server connection was successful, BLE is just for additional security
        }
      }

      return {
        success: true,
        serverResponse,
        bleTransmissionSuccess,
      }
    } catch (error) {
      console.error('DeviceConnection: Device connection failed:', error)

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      }
    }
  }

  /**
   * Enhanced device pairing that includes proximity verification via BLE
   * This method should be called when a device wants to establish secure connection
   */
  async pairDeviceWithProximityVerification(uid: string): Promise<DeviceConnectionResult> {
    console.log('DeviceConnection: Starting enhanced device pairing with proximity verification')

    try {
      // Get current device info
      const devicesStore = stores.DevicesStore
      await devicesStore.init()
      const deviceInfo = await devicesStore.getCurrentDeviceInfo()

      // Connect device with BLE UID transmission for proximity verification
      const result = await this.connectDevice({
        uid,
        deviceInfo,
        transmitUidViaBle: true, // Enable proximity verification
      })

      if (result.success) {
        console.log('DeviceConnection: Enhanced pairing completed successfully', {
          serverConnected: !!result.serverResponse,
          proximityVerified: result.bleTransmissionSuccess,
        })

        // Update local device store if needed
        if (result.serverResponse?.device) {
          // Could update local state here if needed
          console.log('DeviceConnection: Device is now registered as verifier on server')
        }
      }

      return result
    } catch (error) {
      console.error('DeviceConnection: Enhanced pairing failed:', error)

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Enhanced pairing failed',
      }
    }
  }

  /**
   * Check if BLE advertising is active for proximity verification
   */
  isBleProximityVerificationActive(): boolean {
    return bleService.isCurrentlyAdvertising()
  }

  /**
   * Stop BLE proximity verification
   */
  async stopBleProximityVerification(): Promise<void> {
    try {
      await bleService.stopAdvertising()
      console.log('DeviceConnection: BLE proximity verification stopped')
    } catch (error) {
      console.error('DeviceConnection: Failed to stop BLE proximity verification:', error)
      throw error
    }
  }
}

export const deviceConnectionService = DeviceConnectionService.getInstance()
