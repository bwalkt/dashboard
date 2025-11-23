import { v7 as uuid } from 'uuid'

/**
 * Normalize a UUID for BLE usage by removing dashes
 * BLE libraries like @abandonware/noble normalize UUIDs to 32-hex lowercase without dashes
 *
 * @param uuid - UUID with or without dashes
 * @returns UUID without dashes in lowercase
 * @example
 * normalizeBleUuid('550e8400-e29b-41d4-a716-446655440000') // '550e8400e29b41d4a716446655440000'
 */
export function normalizeBleUuid(uuid: string): string {
  return uuid.replace(/-/g, '').toLowerCase()
}

export { uuid }
