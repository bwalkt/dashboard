import { toCompactFunctions, toFullCompact, toFullVerbose } from './functionShorthand.js'
import { toCompactGrid, toVerboseGrid } from './gridShorthand.js'

/**
 * Configuration for function header validation
 */
export interface FunctionHeaderConfig {
  maxHeaderLength?: number // Maximum allowed header size (default: 8KB)
  includeHash?: boolean // Include hash in header for validation
  includeTruncated?: boolean // Include truncated expression
  truncateAt?: number // Truncation length (default: 100 chars)
  useCompactGrid?: boolean // Use g4.0 instead of grid[4][0] (default: true)
  useCompactFunctions?: boolean // Use s.hm instead of stats.harmonicMean (default: true)
}

/**
 * Result of function header processing
 */
export interface FunctionHeaderResult {
  hash: string // SHA256 hash of full expression
  truncated?: string // Truncated expression (optional)
  length: number // Original expression length
  headerValue: string // Final header value to send
  isValid: boolean // Whether expression fits in headers
}

const DEFAULT_CONFIG: FunctionHeaderConfig = {
  maxHeaderLength: 8192, // 8KB - common header size limit
  includeHash: true,
  includeTruncated: true,
  truncateAt: 100,
  useCompactGrid: true, // Default to compact grid format for space savings
  useCompactFunctions: true, // Default to compact function names for space savings
}

/**
 * Generates a hash for a function expression using Web Crypto API (browser-compatible)
 */
export async function hashExpression(expression: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(expression)

  // Handle both Node.js and browser environments
  let hashArray: number[]
  if (typeof globalThis.crypto !== 'undefined' && globalThis.crypto.subtle) {
    // Browser or Node.js 19+ with global crypto
    const hashBuffer = await globalThis.crypto.subtle.digest('SHA-256', data)
    hashArray = Array.from(new Uint8Array(hashBuffer))
  } else {
    // Node.js environment - use the crypto module
    const crypto = await import('crypto')
    const hashBuffer = crypto.createHash('sha256').update(data).digest()
    hashArray = Array.from(hashBuffer)
  }

  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  return hashHex
}

/**
 * Truncates a function expression intelligently
 */
export function truncateExpression(expression: string, maxLength: number = 100): string {
  if (expression.length <= maxLength) {
    return expression
  }

  // Try to truncate at a function boundary
  const truncatePoint = maxLength - 3 // Leave room for "..."
  let lastComma = expression.lastIndexOf(',', truncatePoint)
  let lastParen = expression.lastIndexOf(')', truncatePoint)

  // Find the best truncation point
  let cutPoint = Math.max(lastComma, lastParen)
  if (cutPoint <= 0 || cutPoint > truncatePoint) {
    cutPoint = truncatePoint
  }

  // If we're cutting at a comma, include it in the truncation
  if (expression[cutPoint] === ',') {
    return expression.substring(0, cutPoint + 1) + '...'
  } else if (expression[cutPoint] === ')') {
    return expression.substring(0, cutPoint + 1) + '...'
  }

  return expression.substring(0, cutPoint) + '...'
}

/**
 * Prepares a function expression for HTTP header transmission
 */
export async function prepareFunctionHeader(
  expression: string,
  config: FunctionHeaderConfig = {},
): Promise<FunctionHeaderResult> {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config }
  const expressionLength = expression.length

  // Optionally convert to compact format to save space
  let processedExpression = expression
  if (mergedConfig.useCompactGrid && mergedConfig.useCompactFunctions) {
    // Use full compaction (grid + functions)
    processedExpression = toFullCompact(expression)
  } else if (mergedConfig.useCompactGrid) {
    // Grid compaction only
    processedExpression = toCompactGrid(expression)
  } else if (mergedConfig.useCompactFunctions) {
    // Function compaction only
    processedExpression = toCompactFunctions(expression)
  }

  // Generate hash from ORIGINAL expression (for validation consistency)
  const hash = mergedConfig.includeHash ? await hashExpression(expression) : ''

  // Build header components
  const headerParts: string[] = []

  // Include hash if configured
  if (mergedConfig.includeHash) {
    headerParts.push(`hash:${hash}`)
  }
  headerParts.push(`len:${expressionLength}`)

  // Indicate if compact format is used
  if (processedExpression !== expression) {
    if (mergedConfig.useCompactGrid && mergedConfig.useCompactFunctions) {
      headerParts.push('compact:full')
    } else if (mergedConfig.useCompactGrid) {
      headerParts.push('compact:grid')
    } else if (mergedConfig.useCompactFunctions) {
      headerParts.push('compact:functions')
    }
  }

  // Check if processed expression fits
  const baseHeaderLength = headerParts.join(';').length
  const remainingSpace = mergedConfig.maxHeaderLength! - baseHeaderLength - 20 // Buffer

  let truncated: string | undefined
  let isValid = true

  if (processedExpression.length <= remainingSpace) {
    // Full processed expression fits
    headerParts.push(`expr:${processedExpression}`)
  } else if (mergedConfig.includeTruncated) {
    // Include truncated version (of the processed expression)
    truncated = truncateExpression(processedExpression, mergedConfig.truncateAt!)
    headerParts.push(`expr:${truncated}`)
    headerParts.push('truncated:true')
  } else {
    // No expression included
    if (mergedConfig.includeHash) {
      headerParts.push('truncated:full')
    }
  }

  const headerValue = headerParts.join(';')

  // Final validation
  if (headerValue.length > mergedConfig.maxHeaderLength!) {
    isValid = false
  }

  return {
    hash,
    truncated,
    length: expressionLength,
    headerValue,
    isValid,
  }
}

/**
 * Parses a function header back to its components
 */
export function parseFunctionHeader(headerValue: string): {
  hash?: string
  expression?: string
  length?: number
  isTruncated?: boolean
  compactType?: 'full' | 'grid' | 'functions' | false
} {
  const parts = headerValue.split(';')
  const result: any = {}

  for (const part of parts) {
    const [key, ...valueParts] = part.split(':')
    const value = valueParts.join(':') // Handle colons in expression

    switch (key) {
      case 'hash':
        result.hash = value
        break
      case 'expr':
        result.expression = value
        break
      case 'len':
        result.length = parseInt(value, 10)
        break
      case 'truncated':
        result.isTruncated = value === 'true' || value === 'full'
        break
      case 'compact':
        if (value === 'true') {
          result.compactType = 'grid' // backward compatibility
        } else if (['full', 'grid', 'functions'].includes(value)) {
          result.compactType = value as 'full' | 'grid' | 'functions'
        } else {
          result.compactType = false
        }
        break
    }
  }

  return result
}

/**
 * Validates a function expression against a header hash
 */
export async function validateFunctionHeader(
  expression: string,
  headerValue: string,
): Promise<{ isValid: boolean; reason?: string }> {
  const parsed = parseFunctionHeader(headerValue)

  if (!parsed.hash) {
    return { isValid: false, reason: 'No hash in header' }
  }

  const actualHash = await hashExpression(expression)

  if (actualHash !== parsed.hash) {
    return { isValid: false, reason: 'Hash mismatch' }
  }

  // Note: We don't validate length because compact/verbose formats have different lengths
  // The hash validation is sufficient for integrity

  return { isValid: true }
}

/**
 * Creates a function registry for storing full expressions
 * This can be used server-side to store full expressions by hash
 */
export class FunctionRegistry {
  private registry: Map<string, string> = new Map()

  /**
   * Stores a function expression and returns its hash
   */
  async store(expression: string): Promise<string> {
    const hash = await hashExpression(expression)
    this.registry.set(hash, expression)
    return hash
  }

  /**
   * Retrieves a function expression by hash
   */
  get(hash: string): string | undefined {
    return this.registry.get(hash)
  }

  /**
   * Checks if a hash exists in the registry
   */
  has(hash: string): boolean {
    return this.registry.has(hash)
  }

  /**
   * Clears the registry
   */
  clear(): void {
    this.registry.clear()
  }

  /**
   * Gets the size of the registry
   */
  get size(): number {
    return this.registry.size
  }
}
