import { get_shared_data, set_shared_data } from '@solo-io/proxy-runtime'
import { CHALLENGE_TTL_SECONDS, SHARED_DATA_KEY_PREFIX } from './constants'

// Helper function to generate a random string from a hash value
// Uses rotation and XOR operations to create pseudo-random character selection
function hashToString(
  hash: u32,
  contextId: u32,
  timestamp: u32,
  rotationShift: u32,
  useMultiplicativeXor: bool,
): string {
  let result = ''
  const chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'
  let currentHash = hash

  for (let i = 0; i < 16; i++) {
    // Use hash bits to select character
    const index = u32(currentHash % u32(chars.length))
    result += chars.charAt(index)
    // Rotate hash for next character
    const shiftAmount = rotationShift
    const oppositeShift = 32 - shiftAmount
    currentHash = (currentHash << shiftAmount) | (currentHash >> oppositeShift)
    // Apply XOR with different patterns for uniqueness
    if (useMultiplicativeXor) {
      currentHash = currentHash ^ (contextId * (i + 1) + timestamp)
    } else {
      currentHash = currentHash ^ (contextId + timestamp + i)
    }
  }

  return result
}

// Helper function to generate a pseudo-random string for challenge header
// Uses context_id and path hash since Math.random() requires env.seed which isn't available
export function generateRandomString(contextId: u32, path: string): string {
  // Use a simple hash-based approach to generate pseudo-random string
  // Combine context_id and path hash to create uniqueness
  let hash: u32 = contextId
  const pathLen = path.length

  // Simple hash of the path
  for (let i = 0; i < pathLen; i++) {
    hash = (hash << 5) - hash + u32(path.charCodeAt(i))
    hash = hash & hash // Convert to 32-bit integer
  }

  // Add some variation using bit manipulation
  hash = hash ^ (hash >> 16)
  hash = hash * 0x85ebca6b
  hash = hash ^ (hash >> 13)
  hash = hash * 0xc2b2ae35
  hash = hash ^ (hash >> 16)

  // Generate string from hash using shared function
  // Use contextId as timestamp substitute for randomness
  return hashToString(hash, contextId, contextId, 1, false)
}

// Helper function to generate a unique challenge-id
// Uses different seed than challenge generation to ensure uniqueness
export function generateChallengeId(contextId: u32, path: string): string {
  // Use a different hash seed by adding a constant offset
  let hash: u32 = contextId + 0x9e3779b9 // Golden ratio constant for better distribution
  const pathLen = path.length

  // Simple hash of the path with different multiplier
  for (let i = 0; i < pathLen; i++) {
    hash = (hash << 7) - hash + u32(path.charCodeAt(i)) // Different shift than challenge
    hash = hash & hash // Convert to 32-bit integer
  }

  // Add variation with different constants
  hash = hash ^ (hash >> 17)
  hash = hash * 0x9e3779b1
  hash = hash ^ (hash >> 11)
  hash = hash * 0xc2b2ae3d
  hash = hash ^ (hash >> 15)

  // Generate string from hash using shared function with different rotation pattern
  // Use contextId * 2 as timestamp substitute for uniqueness
  return hashToString(hash, contextId, contextId * 2, 3, true)
}

// Helper function to create JSON entry with TTL
// Note: TTL expiry checking is disabled since Date.now() is not available in proxy-wasm
// The expiresAt field is stored for future use but not currently validated
export function createChallengeEntry(value: string, ttlSeconds: u32): string {
  // Store TTL info but can't calculate actual expiry without time
  // Use 0 as placeholder - expiry checking is disabled
  const expiresAt: u32 = 0
  // Create simple JSON: {"value":"...","expiresAt":0}
  // Note: Expiry checking is disabled - challenges are stored permanently until manually deleted
  return '{"value":"' + value + '","expiresAt":' + expiresAt.toString() + '}'
}

// Helper function to parse challenge entry and check expiry
function parseChallengeEntry(entryJson: string): string | null {
  // Simple JSON parsing for {"value":"...","expiresAt":...}
  // Find the value field
  const valueStart = entryJson.indexOf('"value":"')
  if (valueStart < 0) {
    return null
  }
  const valueContentStart = valueStart + 9 // length of '"value":"'
  const valueEnd = entryJson.indexOf('"', valueContentStart)
  if (valueEnd < 0) {
    return null
  }
  const value = entryJson.substring(valueContentStart, valueEnd)

  // Find expiresAt
  const expiresAtStart = entryJson.indexOf('"expiresAt":')
  if (expiresAtStart < 0) {
    return null
  }
  const expiresAtContentStart = expiresAtStart + 11 // length of '"expiresAt":'
  const expiresAtEnd = entryJson.indexOf('}', expiresAtContentStart)
  if (expiresAtEnd < 0) {
    return null
  }
  const expiresAtStr = entryJson.substring(expiresAtContentStart, expiresAtEnd)
  const expiresAt = u32(parseInt(expiresAtStr))

  // Expiry checking disabled - Date.now() not available in proxy-wasm
  // Always return value if parsing succeeded
  return value
}

// Helper function to read challenge from shared data
export function getChallengeFromSharedData(challengeId: string): string | null {
  const sharedDataKey = SHARED_DATA_KEY_PREFIX + challengeId
  const result = get_shared_data(sharedDataKey)

  // Access the data - try using changetype to access the Uint8Array
  // The data should be stored in the result object
  const data = result.value
  if (data == null) {
    return null
  }

  // Decode the bytes back to string
  const entryStr = String.UTF8.decode(data)

  // Check if it's a JSON entry
  const expiresAtStart = entryStr.indexOf('"expiresAt":')
  if (expiresAtStart >= 0) {
    // It's a JSON entry, parse it
    const parsed = parseChallengeEntry(entryStr)
    if (parsed != null) {
      return parsed
    }
    // Entry invalid format, delete it from shared data
    const emptyBuffer = new ArrayBuffer(0)
    set_shared_data(sharedDataKey, emptyBuffer, result.cas)
    return null
  }

  // Fallback: treat as plain string for backward compatibility
  return entryStr
}
