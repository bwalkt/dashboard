export interface AuthRequest {
  id: string
  endpoint: string
  method: string
  timestamp: number
}

export interface AuthResponse {
  id: string
  approved: boolean
}

export interface BluetoothDevice {
  id: string
  name: string
  connected: boolean
}
