import { invoke } from '@tauri-apps/api/core'

/**
 * BLE Service UUIDs
 * These must match the mobile app's BLE service UUIDs
 */
export const BLE_SERVICE_UUID = '550e8400-e29b-41d4-a716-446655440000'
export const BLE_CHARACTERISTIC_GET_ENDPOINTS = '550e8400-e29b-41d4-a716-446655440001'
export const BLE_CHARACTERISTIC_GET_TOKEN = '550e8400-e29b-41d4-a716-446655440002'

/**
 * Endpoint type (matches mobile and Rust backend)
 */
export type Endpoint = {
  id: string
  name: string
  baseURI?: string
  status: string
  [key: string]: any
}

/**
 * BLE Service for Verifier (Acts as BLE Central/Client)
 *
 * This service scans for and connects to the mobile device,
 * then requests endpoints and tokens via BLE.
 *
 * Uses Tauri commands to communicate with the Rust backend
 * which handles BLE communication via btleplug.
 */
export class BLEService {
  private static instance: BLEService
  private initialized = false

  private constructor() {}

  static getInstance(): BLEService {
    if (!BLEService.instance) {
      BLEService.instance = new BLEService()
    }
    return BLEService.instance
  }

  /**
   * Initialize the BLE adapter (must be called before connect)
   */
  async initialize(): Promise<void> {
    try {
      console.log('Initializing BLE adapter...')
      await invoke('ble_initialize')
      this.initialized = true
      console.log('BLE adapter initialized')
    } catch (error) {
      console.error('Failed to initialize BLE adapter:', error)
      throw error
    }
  }

  /**
   * Scan for and connect to mobile device
   */
  async connect(): Promise<void> {
    try {
      if (!this.initialized) {
        await this.initialize()
      }

      console.log('Scanning for and connecting to BLE device...')
      await invoke('ble_connect')
      console.log('BLE connection established')
    } catch (error) {
      console.error('Failed to connect to BLE device:', error)
      throw error
    }
  }

  /**
   * Disconnect from mobile device
   */
  async disconnect(): Promise<void> {
    try {
      console.log('Disconnecting from BLE device...')
      await invoke('ble_disconnect')
      console.log('Disconnected from BLE device')
    } catch (error) {
      console.error('Failed to disconnect from BLE device:', error)
      throw error
    }
  }

  /**
   * Check if connected to mobile device
   */
  async isDeviceConnected(): Promise<boolean> {
    try {
      const connected = await invoke<boolean>('ble_is_connected')
      return connected
    } catch (error) {
      console.error('Failed to check BLE connection status:', error)
      return false
    }
  }

  /**
   * Request list of endpoints from mobile device
   */
  async getEndpoints(): Promise<Endpoint[]> {
    try {
      console.log('Requesting endpoints from mobile...')
      const endpoints = await invoke<Endpoint[]>('ble_get_endpoints')
      console.log('Received endpoints:', endpoints)
      return endpoints
    } catch (error) {
      console.error('Failed to get endpoints:', error)
      throw error
    }
  }

  /**
   * Request a token for a specific endpoint from mobile device
   */
  async getToken(endpointId: string): Promise<string> {
    try {
      console.log(`Requesting token for endpoint: ${endpointId}`)
      const token = await invoke<string>('ble_get_token', { endpoint_id: endpointId })
      console.log('Received token:', token)
      return token
    } catch (error) {
      console.error('Failed to get token:', error)
      throw error
    }
  }
}

export const bleService = BLEService.getInstance()
