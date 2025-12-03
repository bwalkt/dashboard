import { DeviceInfoType } from '@pzero/shared/pzero'
import { DevicesStore } from '@/stores/devices'

export interface PairingData {
  type: 'device_pairing'
  desktopDeviceId: string
  deviceName: string
  systemName: string
  timestamp: number
  connectionId: string
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
  async generatePairingData(): Promise<PairingData> {
    const currentDevice = await DevicesStore.getCurrentDeviceInfo()

    const pairingData: PairingData = {
      type: 'device_pairing',
      desktopDeviceId: currentDevice.deviceId,
      deviceName: currentDevice.deviceName,
      systemName: currentDevice.systemName,
      timestamp: Date.now(),
      connectionId: crypto.randomUUID(),
    }

    // Store this connection as active
    this.activeConnections.add(pairingData.connectionId)

    return pairingData
  }

  /**
   * Wait for mobile device to connect
   */
  async waitForConnection(
    connectionId: string,
    timeoutMs: number = 300000, // 5 minutes
  ): Promise<MobilePairingResponse> {
    return new Promise((resolve, reject) => {
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

      // Start polling for connection (simulate mobile app connecting)
      this.startConnectionPolling(connectionId)
    })
  }

  /**
   * Simulate connection polling (in real implementation, this would be WebSocket/SSE)
   */
  private async startConnectionPolling(connectionId: string) {
    const pollInterval = setInterval(async () => {
      try {
        // Check if connection is still active
        if (!this.activeConnections.has(connectionId)) {
          clearInterval(pollInterval)
          return
        }

        // In a real implementation, this would:
        // 1. Check backend API for mobile connection
        // 2. Listen to WebSocket messages
        // 3. Process mobile app pairing requests

        // For now, we'll simulate a connection after some time for demo
        // This should be replaced with actual mobile app integration

        const primaryDevice = await DevicesStore.getPrimaryDevice()

        // Check if we have a new primary device (mobile connected)
        const currentDevice = await DevicesStore.getCurrentDeviceInfo()
        if (primaryDevice && primaryDevice.deviceId !== currentDevice.deviceId) {
          // Mobile device connected
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
          clearInterval(pollInterval)
        }
      } catch (error) {
        console.error('Error polling for connection:', error)
      }
    }, 2000)

    // Clean up after 5 minutes
    setTimeout(() => {
      clearInterval(pollInterval)
    }, 300000)
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
    generatePairingData: () => devicePairingService.generatePairingData(),
    waitForConnection: (connectionId: string, timeout?: number) =>
      devicePairingService.waitForConnection(connectionId, timeout),
    getConnectionStatus: () => devicePairingService.getConnectionStatus(),
    disconnect: () => devicePairingService.disconnect(),
  }
}
