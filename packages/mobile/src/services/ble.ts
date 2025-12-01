import type { Endpoint } from '@pzero/shared/pzero'
import { normalizeBleUuid, uuid } from '@pzero/shared/uuid'
import { NativeModules, PermissionsAndroid, Platform } from 'react-native'
import { BleManager, type State } from 'react-native-ble-plx'

const { BLEPeripheralModule } = NativeModules

interface BLEPeripheralNativeModule {
  initialize(): Promise<boolean>
  startAdvertising(endpointsJSON: string): Promise<boolean>
  stopAdvertising(): Promise<boolean>
  isAdvertising(): Promise<boolean>
  setTokenForEndpoint(endpointId: string, token: string): Promise<boolean>
}

/**
 * BLE Service UUIDs
 * These should match between mobile and verifier
 * Note: UUIDs are normalized (no dashes) to match BLE library behavior (@abandonware/noble)
 */
export const BLE_SERVICE_UUID = normalizeBleUuid('550e8400-e29b-41d4-a716-446655440000')
export const BLE_CHARACTERISTIC_GET_ENDPOINTS = normalizeBleUuid('550e8400-e29b-41d4-a716-446655440001')
export const BLE_CHARACTERISTIC_GET_TOKEN = normalizeBleUuid('550e8400-e29b-41d4-a716-446655440002')

/**
 * BLE Message Types
 */
export type BLERequest = {
  type: 'getEndpoints' | 'getToken'
  endpointId?: string // Required for getToken
}

export type BLEResponse = {
  type: 'endpoints' | 'token' | 'error'
  data?: Endpoint[] | string
  error?: string
}

/**
 * BLE Service for Mobile (Acts as BLE Peripheral/Server)
 *
 * This service makes the mobile device discoverable and allows
 * the verifier to request endpoints and tokens via BLE.
 *
 * Note: react-native-ble-plx is primarily for central mode (client).
 * For peripheral mode (server), this would typically require:
 * - iOS: Native module using CBPeripheralManager
 * - Android: Native module using BluetoothLeAdvertiser
 *
 * This implementation provides the business logic and can be integrated
 * with native peripheral modules when available.
 */
export class BLEService {
  private static instance: BLEService
  private manager: BleManager
  private isAdvertising = false
  private endpoints: Endpoint[] = []

  private constructor() {
    this.manager = new BleManager()
  }

  static getInstance(): BLEService {
    if (!BLEService.instance) {
      BLEService.instance = new BLEService()
    }
    return BLEService.instance
  }

  /**
   * Request necessary BLE permissions (Android)
   */
  private async requestPermissions(): Promise<boolean> {
    if (Platform.OS === 'android') {
      if (Platform.Version >= 31) {
        // Android 12+ requires new permissions
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE,
        ])

        return (
          granted['android.permission.BLUETOOTH_SCAN'] === PermissionsAndroid.RESULTS.GRANTED &&
          granted['android.permission.BLUETOOTH_CONNECT'] === PermissionsAndroid.RESULTS.GRANTED &&
          granted['android.permission.BLUETOOTH_ADVERTISE'] === PermissionsAndroid.RESULTS.GRANTED
        )
      } else {
        // Android 11 and below - only request location permission as BLUETOOTH permissions are granted automatically
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        )

        return granted === PermissionsAndroid.RESULTS.GRANTED
      }
    }
    return true
  }

  /**
   * Initialize BLE and check state
   */
  async initialize(): Promise<void> {
    try {
      // Request permissions
      const hasPermissions = await this.requestPermissions()
      if (!hasPermissions) {
        throw new Error('BLE permissions not granted')
      }

      // Check BLE state
      const state = await this.manager.state()
      console.log('BLE State:', state)

      if (state !== 'PoweredOn') {
        // Wait for state to change to PoweredOn
        await new Promise<void>((resolve, reject) => {
          const subscription = this.manager.onStateChange((newState: State) => {
            console.log('BLE State changed to:', newState)
            if (newState === 'PoweredOn') {
              subscription.remove()
              resolve()
            }
          }, true)

          // Timeout after 10 seconds
          setTimeout(() => {
            subscription.remove()
            reject(new Error('BLE did not power on in time'))
          }, 10000)
        })
      }

      // Initialize native peripheral module
      if (BLEPeripheralModule) {
        await (BLEPeripheralModule as BLEPeripheralNativeModule).initialize()
        console.log('BLE Peripheral module initialized')
      }

      console.log('BLE initialized successfully')
    } catch (error) {
      console.error('Failed to initialize BLE:', error)
      throw error
    }
  }

  /**
   * Initialize BLE peripheral and start advertising
   */
  async startAdvertising(): Promise<void> {
    try {
      await this.initialize()

      console.log('Starting BLE advertising...')

      if (!BLEPeripheralModule) {
        throw new Error('BLE Peripheral module not available')
      }

      // Prepare endpoints response
      const endpointsResponse: BLEResponse = {
        type: 'endpoints',
        data: this.endpoints,
      }

      const endpointsJSON = JSON.stringify(endpointsResponse)

      // Start advertising with native module
      const success = await (BLEPeripheralModule as BLEPeripheralNativeModule).startAdvertising(endpointsJSON)
      if (!success) {
        throw new Error('Native startAdvertising returned false')
      }

      // Sync state with native module to prevent drift
      try {
        this.isAdvertising = await (BLEPeripheralModule as BLEPeripheralNativeModule).isAdvertising()
      } catch {
        this.isAdvertising = success
      }
      console.log('BLE advertising started successfully')
    } catch (error) {
      console.error('Failed to start BLE advertising:', error)
      throw error
    }
  }

  /**
   * Stop BLE advertising
   */
  async stopAdvertising(): Promise<void> {
    try {
      console.log('Stopping BLE advertising...')

      if (BLEPeripheralModule) {
        await (BLEPeripheralModule as BLEPeripheralNativeModule).stopAdvertising()

        // Sync state with native module
        try {
          this.isAdvertising = await (BLEPeripheralModule as BLEPeripheralNativeModule).isAdvertising()
        } catch {
          this.isAdvertising = false
        }
      } else {
        this.isAdvertising = false
      }

      console.log('BLE advertising stopped')
    } catch (error) {
      console.error('Failed to stop BLE advertising:', error)
      throw error
    }
  }

  /**
   * Cleanup BLE manager
   */
  destroy(): void {
    this.manager.destroy()
  }

  /**
   * Check if currently advertising
   */
  isCurrentlyAdvertising(): boolean {
    return this.isAdvertising
  }

  /**
   * Set the endpoints that will be returned when requested
   */
  setEndpoints(endpoints: Endpoint[]): void {
    this.endpoints = endpoints
  }

  /**
   * Handle getEndpoints request from verifier
   */
  async handleGetEndpoints(): Promise<Endpoint[]> {
    console.log('BLE: Handling getEndpoints request')
    return this.endpoints
  }

  /**
   * Handle getToken request from verifier
   * For now, returns a UUID. In production, this would generate
   * or retrieve a proper authentication token for the endpoint.
   */
  async handleGetToken(endpointId: string): Promise<string> {
    console.log(`BLE: Handling getToken request for endpoint: ${endpointId}`)

    // Verify endpoint exists
    const endpoint = this.endpoints.find(e => e.id === endpointId)
    if (!endpoint) {
      throw new Error(`Endpoint not found: ${endpointId}`)
    }

    // For now, return a UUID
    // TODO: Implement proper token generation/retrieval
    const token = uuid()
    console.log(`BLE: Generated token for ${endpointId}: ${token}`)

    // Update the native module with the token
    if (BLEPeripheralModule) {
      await (BLEPeripheralModule as BLEPeripheralNativeModule).setTokenForEndpoint(endpointId, token)
    }

    return token
  }

  /**
   * Handle incoming BLE requests
   * This would be called by the BLE characteristic write handler
   */
  async handleRequest(request: BLERequest): Promise<BLEResponse> {
    try {
      switch (request.type) {
        case 'getEndpoints': {
          const endpoints = await this.handleGetEndpoints()
          return {
            type: 'endpoints',
            data: endpoints,
          }
        }
        case 'getToken': {
          if (!request.endpointId) {
            throw new Error('endpointId is required for getToken')
          }
          const token = await this.handleGetToken(request.endpointId)
          return {
            type: 'token',
            data: token,
          }
        }
        default:
          throw new Error(`Unknown request type: ${request.type}`)
      }
    } catch (error) {
      console.error('BLE request error:', error)
      return {
        type: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }
}

export const bleService = BLEService.getInstance()
