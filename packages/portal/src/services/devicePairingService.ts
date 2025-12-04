import { DeviceInfoType } from '@pzero/shared/pzero'
import { invoke } from '@tauri-apps/api/core'
import { DevicesStore } from '@/stores/devices'

// Tauri BLE command types
interface BLECommands {
  ble_initialize: () => Promise<void>
  ble_connect: () => Promise<void>
  ble_disconnect: () => Promise<void>
  ble_is_connected: () => Promise<boolean>
  ble_verify_device_proximity: () => Promise<string>
}

export interface PairingData {
  type: 'device_pairing'
  desktopDeviceId: string
  deviceName: string
  systemName: string
  timestamp: number
  connectionId: string
  deviceInfo: DeviceInfoType // Include complete device info
}

export interface MobilePairingResponse {
  type: 'mobile_pairing_response'
  connectionId: string
  mobileDeviceInfo: DeviceInfoType
  status: 'connected' | 'rejected'
  timestamp: number
}

export class DevicePairingService {
  private static instance: DevicePairingService
  private connectionCallbacks: Map<string, (response: MobilePairingResponse) => void> = new Map()
  private activeConnections: Set<string> = new Set()

  private constructor() {
    // Initialize any required services or listeners
    this.initializeServiceWorker()
  }

  public static getInstance(): DevicePairingService {
    if (!DevicePairingService.instance) {
      DevicePairingService.instance = new DevicePairingService()
    }
    return DevicePairingService.instance
  }

  /**
   * Generate pairing data for QR code
   */
  async generatePairingData(nickname?: string): Promise<PairingData> {
    // Ensure store is initialized before use
    if (!DevicesStore.currentDevice) {
      await DevicesStore.init()
    }

    const currentDevice = await DevicesStore.getCurrentDeviceInfo(nickname)

    const pairingData: PairingData = {
      type: 'device_pairing',
      desktopDeviceId: currentDevice.deviceId,
      deviceName: currentDevice.deviceName,
      systemName: currentDevice.systemName,
      timestamp: Date.now(),
      connectionId: crypto.randomUUID(),
      deviceInfo: currentDevice, // Include complete device info
    }

    // Store this connection as active
    this.activeConnections.add(pairingData.connectionId)

    // Log what's being transmitted in the QR code
    console.log('QR Code Pairing Data:', {
      type: pairingData.type,
      deviceId: pairingData.desktopDeviceId,
      deviceName: pairingData.deviceName,
      connectionId: pairingData.connectionId,
      deviceInfo: {
        id: currentDevice.id,
        deviceName: currentDevice.deviceName,
        model: currentDevice.model,
        brand: currentDevice.brand,
        systemName: currentDevice.systemName,
        deviceType: currentDevice.deviceType,
        nickname: currentDevice.nickname,
        // ... other device fields included
      },
    })

    return pairingData
  }

  /**
   * Initialize BLE proximity verification
   */
  async initializeBLEProximityVerification(): Promise<void> {
    try {
      console.log('DevicePairing: Initializing BLE proximity verification...')
      await invoke('ble_initialize')
      console.log('DevicePairing: BLE initialized successfully')
    } catch (error) {
      console.error('DevicePairing: Failed to initialize BLE:', error)
      throw new Error(`Failed to initialize BLE: ${error}`)
    }
  }

  /**
   * Connect to mobile device via BLE for proximity verification
   */
  async connectToBLEDevice(): Promise<void> {
    try {
      console.log('DevicePairing: Connecting to BLE device...')
      await invoke('ble_connect')
      console.log('DevicePairing: Connected to BLE device successfully')
    } catch (error) {
      console.error('DevicePairing: Failed to connect to BLE device:', error)
      throw new Error(`Failed to connect to BLE device: ${error}`)
    }
  }

  /**
   * Verify device proximity by retrieving UID via BLE
   */
  async verifyProximityViaBLE(): Promise<string> {
    try {
      console.log('DevicePairing: Verifying device proximity via BLE...')

      // Check if already connected to BLE device
      const isConnected = (await invoke('ble_is_connected')) as boolean
      if (!isConnected) {
        await this.connectToBLEDevice()
      }

      // Verify proximity and get UID
      const uid = (await invoke('ble_verify_device_proximity')) as string
      console.log('DevicePairing: Device proximity verified via BLE, UID:', uid)

      return uid
    } catch (error) {
      console.error('DevicePairing: Failed to verify proximity via BLE:', error)
      throw new Error(`Failed to verify proximity via BLE: ${error}`)
    }
  }

  /**
   * Disconnect from BLE device
   */
  async disconnectBLEDevice(): Promise<void> {
    try {
      await invoke('ble_disconnect')
      console.log('DevicePairing: Disconnected from BLE device')
    } catch (error) {
      console.error('DevicePairing: Failed to disconnect from BLE device:', error)
    }
  }

  /**
   * Wait for mobile device to connect (enhanced with BLE proximity verification)
   */
  async waitForConnection(
    connectionId: string,
    timeoutMs: number = 300000, // 5 minutes
  ): Promise<MobilePairingResponse> {
    return new Promise((resolve, reject) => {
      // Guard against duplicate waiters
      if (this.connectionCallbacks.has(connectionId)) {
        reject(new Error(`Already waiting for connection ${connectionId}`))
        return
      }

      // Set up timeout
      const timeout = setTimeout(() => {
        this.connectionCallbacks.delete(connectionId)
        this.activeConnections.delete(connectionId)
        reject(new Error('Connection timeout'))
      }, timeoutMs)

      // Register callback for this connection
      this.connectionCallbacks.set(connectionId, response => {
        clearTimeout(timeout)
        this.connectionCallbacks.delete(connectionId)
        this.activeConnections.delete(connectionId)
        resolve(response)
      })

      // Start enhanced connection polling with BLE proximity verification
      this.startEnhancedConnectionPolling(connectionId)
    })
  }

  /**
   * Enhanced connection polling with BLE proximity verification
   */
  private async startEnhancedConnectionPolling(connectionId: string) {
    const pollInterval = setInterval(async () => {
      try {
        // Check if connection is still active
        if (!this.activeConnections.has(connectionId)) {
          clearInterval(pollInterval)
          return
        }

        // Try to verify proximity via BLE
        try {
          await this.initializeBLEProximityVerification()

          // Attempt BLE proximity verification
          const uid = await this.verifyProximityViaBLE()

          console.log('DevicePairing: BLE proximity verification successful, UID:', uid)

          // Get device info for the verified UID
          const currentDevice = await DevicesStore.getCurrentDeviceInfo()

          // Create successful pairing response
          const callback = this.connectionCallbacks.get(connectionId)
          if (callback) {
            const response: MobilePairingResponse = {
              type: 'mobile_pairing_response',
              connectionId,
              mobileDeviceInfo: {
                ...currentDevice,
                uid: uid, // Include the verified UID
                isPrimaryDevice: true,
              },
              status: 'connected',
              timestamp: Date.now(),
            }
            callback(response)
            clearInterval(pollInterval)
            return
          }
        } catch (bleError) {
          // BLE verification failed - continue polling
          console.log('DevicePairing: BLE verification attempt failed, will retry:', bleError.message)
        }

        // Fallback to traditional polling method
        await this.fallbackConnectionPolling(connectionId)
      } catch (error) {
        console.error('Error in enhanced connection polling:', error)
      }
    }, 3000) // Poll every 3 seconds for BLE

    // Clean up after timeout
    setTimeout(() => {
      clearInterval(pollInterval)
      this.disconnectBLEDevice() // Clean up BLE connection
    }, 300000)
  }

  /**
   * Fallback connection polling (original method)
   */
  private async fallbackConnectionPolling(connectionId: string) {
    // Ensure store is initialized before use
    if (!DevicesStore.currentDevice) {
      await DevicesStore.init()
    }

    const primaryDevice = await DevicesStore.getPrimaryDevice()

    // Check if we have a new primary device (mobile connected)
    const currentDevice = await DevicesStore.getCurrentDeviceInfo()
    if (primaryDevice && primaryDevice.deviceId !== currentDevice.deviceId) {
      // Mobile device connected via traditional method
      const callback = this.connectionCallbacks.get(connectionId)
      if (callback) {
        const response: MobilePairingResponse = {
          type: 'mobile_pairing_response',
          connectionId,
          mobileDeviceInfo: primaryDevice,
          status: 'connected',
          timestamp: Date.now(),
        }
        callback(response)
      }
    }
  }

  /**
   * Handle incoming mobile pairing response (would be called from API/WebSocket)
   */
  async handleMobilePairingResponse(response: MobilePairingResponse): Promise<void> {
    const callback = this.connectionCallbacks.get(response.connectionId)

    if (callback) {
      if (response.status === 'connected') {
        // Set mobile device as primary
        await DevicesStore.setPrimaryDevice(response.mobileDeviceInfo)

        // Update current device to not be primary
        await DevicesStore.setIsPrimaryDevice(false)
      }

      callback(response)
    }
  }

  /**
   * Check current connection status
   */
  async getConnectionStatus(): Promise<{
    isConnected: boolean
    primaryDevice?: DeviceInfoType
    currentDevice: DeviceInfoType
  }> {
    // Ensure store is initialized before use
    if (!DevicesStore.currentDevice) {
      await DevicesStore.init()
    }

    const currentDevice = await DevicesStore.getCurrentDeviceInfo()
    const primaryDevice = await DevicesStore.getPrimaryDevice()

    const isConnected = Boolean(primaryDevice && primaryDevice.deviceId !== currentDevice.deviceId)

    return {
      isConnected,
      primaryDevice: isConnected ? primaryDevice : undefined,
      currentDevice,
    }
  }

  /**
   * Disconnect from mobile device
   */
  async disconnect(): Promise<void> {
    // Clear primary device
    await DevicesStore.setIsPrimaryDevice(true)

    // Clear all active connections
    this.activeConnections.clear()
    this.connectionCallbacks.clear()
  }

  /**
   * Initialize service worker for background connection handling
   */
  private initializeServiceWorker() {
    // This would set up service worker for background sync
    // For now, just a placeholder
    if ('serviceWorker' in navigator) {
      // Register service worker for background sync
      console.log('DevicePairingService initialized')
    }
  }
}

// Singleton instance
export const devicePairingService = DevicePairingService.getInstance()

// React hook for device pairing
export function useDevicePairing() {
  return {
    generatePairingData: (nickname?: string) => devicePairingService.generatePairingData(nickname),
    waitForConnection: (connectionId: string, timeout?: number) =>
      devicePairingService.waitForConnection(connectionId, timeout),
    getConnectionStatus: () => devicePairingService.getConnectionStatus(),
    disconnect: () => devicePairingService.disconnect(),

    // BLE proximity verification methods
    initializeBLEProximityVerification: () => devicePairingService.initializeBLEProximityVerification(),
    verifyProximityViaBLE: () => devicePairingService.verifyProximityViaBLE(),
    disconnectBLEDevice: () => devicePairingService.disconnectBLEDevice(),
  }
}
