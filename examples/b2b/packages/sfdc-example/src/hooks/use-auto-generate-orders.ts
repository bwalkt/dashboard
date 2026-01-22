import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { generateAndCreateOrders } from '@/lib/generate-order'

interface AutoGenerateConfig {
  intervalMs?: number
  minOrdersPerBatch?: number
  maxOrdersPerBatch?: number
}

interface AutoGenerateState {
  isRunning: boolean
  totalGenerated: number
  totalSuccessful: number
  totalFailed: number
  lastBatchResult?: {
    count: number
    successful: number
    failed: number
    timestamp: Date
  }
}

type StateChangeListener = (state: AutoGenerateState) => void

/**
 * Singleton manager for auto-generation to ensure only one instance runs globally
 * This prevents duplicate orders when multiple components use the hook
 */
class AutoGenerateManager {
  private static instance: AutoGenerateManager
  private intervalRef: NodeJS.Timeout | null = null
  private isRunning: boolean = false
  private isGenerating: boolean = false
  private state: AutoGenerateState = {
    isRunning: false,
    totalGenerated: 0,
    totalSuccessful: 0,
    totalFailed: 0,
  }
  private listeners: Set<StateChangeListener> = new Set()
  private config: Required<AutoGenerateConfig> = {
    intervalMs: 5000,
    minOrdersPerBatch: 1,
    maxOrdersPerBatch: 3,
  }
  private queryClient: any = null

  private constructor() {}

  static getInstance(): AutoGenerateManager {
    if (!AutoGenerateManager.instance) {
      AutoGenerateManager.instance = new AutoGenerateManager()
    }
    return AutoGenerateManager.instance
  }

  setQueryClient(queryClient: any) {
    this.queryClient = queryClient
  }

  /**
   * Normalizes and clamps config values to ensure valid ranges:
   * - Ensures minOrdersPerBatch is at least 1
   * - Enforces min <= max by swapping or setting max = min when needed
   */
  private normalizeConfig(config: AutoGenerateConfig): Required<AutoGenerateConfig> {
    const currentMin = config.minOrdersPerBatch ?? this.config.minOrdersPerBatch
    const currentMax = config.maxOrdersPerBatch ?? this.config.maxOrdersPerBatch

    // Ensure min is at least 1
    let normalizedMin = Math.max(1, currentMin)

    // Ensure max is at least 1
    let normalizedMax = Math.max(1, currentMax)

    // Enforce min <= max: if min > max, swap them or set max = min
    if (normalizedMin > normalizedMax) {
      normalizedMax = normalizedMin
    }

    return {
      intervalMs: config.intervalMs ?? this.config.intervalMs,
      minOrdersPerBatch: normalizedMin,
      maxOrdersPerBatch: normalizedMax,
    }
  }

  setConfig(config: AutoGenerateConfig) {
    this.config = this.normalizeConfig(config)
  }

  subscribe(listener: StateChangeListener): () => void {
    this.listeners.add(listener)
    // Immediately notify the new subscriber of current state
    listener(this.state)
    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener)
    }
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.state))
  }

  private generateRandomCount(): number {
    // Use normalized values from config (already normalized in setConfig)
    const min = this.config.minOrdersPerBatch
    const max = this.config.maxOrdersPerBatch

    // Ensure we have valid normalized values (defensive check)
    const normalizedMin = Math.max(1, min)
    const normalizedMax = Math.max(normalizedMin, max)

    // Calculate random count using normalized values, ensuring result >= 1
    const count = Math.floor(Math.random() * (normalizedMax - normalizedMin + 1)) + normalizedMin
    return Math.max(1, count)
  }

  private async triggerGeneration() {
    // Prevent concurrent mutations - if already generating, skip this trigger
    if (!this.isRunning || this.isGenerating) {
      return
    }

    this.isGenerating = true
    const count = this.generateRandomCount()

    try {
      const result = await generateAndCreateOrders(count)
      const { summary } = result

      this.state = {
        ...this.state,
        totalGenerated: this.state.totalGenerated + count,
        totalSuccessful: this.state.totalSuccessful + summary.successful,
        totalFailed: this.state.totalFailed + summary.failed,
        lastBatchResult: {
          count,
          successful: summary.successful,
          failed: summary.failed,
          timestamp: new Date(),
        },
      }

      // Only show toast for significant failures (all orders failed)
      if (summary.failed === count && summary.successful === 0) {
        toast.error(`Failed to generate ${count} orders`)
      }

      // Invalidate orders query to refresh the list
      if (this.queryClient) {
        this.queryClient.invalidateQueries({ queryKey: ['orders'] })
      }

      this.notifyListeners()
    } catch (error) {
      this.state = {
        ...this.state,
        totalGenerated: this.state.totalGenerated + count,
        totalFailed: this.state.totalFailed + count,
        lastBatchResult: {
          count,
          successful: 0,
          failed: count,
          timestamp: new Date(),
        },
      }

      // Show error toast for API failures
      toast.error(`Failed to auto-generate ${count} orders`)
      console.error('Auto-generation error:', error)
      this.notifyListeners()
    } finally {
      this.isGenerating = false
    }
  }

  start() {
    if (this.isRunning) {
      return
    }

    // Clear any existing interval first (safety check)
    if (this.intervalRef) {
      clearInterval(this.intervalRef)
      this.intervalRef = null
    }

    this.isRunning = true
    this.state = { ...this.state, isRunning: true }
    this.notifyListeners()

    // Start the interval
    this.intervalRef = setInterval(() => {
      this.triggerGeneration()
    }, this.config.intervalMs)

    // Trigger first generation immediately
    this.triggerGeneration()

    toast.info('Auto-order generation started')
  }

  stop() {
    if (!this.isRunning) {
      return
    }

    this.isRunning = false
    this.state = { ...this.state, isRunning: false }
    this.notifyListeners()

    if (this.intervalRef) {
      clearInterval(this.intervalRef)
      this.intervalRef = null
    }

    toast.info('Auto-order generation stopped')
  }

  toggle() {
    if (this.isRunning) {
      this.stop()
    } else {
      this.start()
    }
  }

  reset() {
    this.isRunning = false
    this.isGenerating = false
    this.state = {
      isRunning: false,
      totalGenerated: 0,
      totalSuccessful: 0,
      totalFailed: 0,
    }

    if (this.intervalRef) {
      clearInterval(this.intervalRef)
      this.intervalRef = null
    }

    this.notifyListeners()
    toast.info('Auto-generation statistics reset')
  }

  getState(): AutoGenerateState {
    return this.state
  }

  getIsGenerating(): boolean {
    return this.isGenerating
  }
}

/**
 * Hook for automatically generating random orders at intervals
 * Uses a singleton manager to ensure only one instance runs globally
 * This prevents duplicate orders when multiple components use the hook
 */
export function useAutoGenerateOrders(config: AutoGenerateConfig = {}) {
  const {
    intervalMs = 5000, // 5 seconds
    minOrdersPerBatch = 1,
    maxOrdersPerBatch = 3,
  } = config

  const managerRef = useRef(AutoGenerateManager.getInstance())
  const queryClient = useQueryClient()
  const [state, setState] = useState<AutoGenerateState>(managerRef.current.getState())

  // Set query client and config on mount/update
  useEffect(() => {
    managerRef.current.setQueryClient(queryClient)
    managerRef.current.setConfig({ intervalMs, minOrdersPerBatch, maxOrdersPerBatch })
  }, [queryClient, intervalMs, minOrdersPerBatch, maxOrdersPerBatch])

  // Subscribe to state changes
  useEffect(() => {
    const unsubscribe = managerRef.current.subscribe(newState => {
      setState(newState)
    })
    return unsubscribe
  }, [])

  // Cleanup on unmount - don't stop the manager, just unsubscribe
  // This allows other components to continue using it
  useEffect(() => {
    return () => {
      // Component unmounting - just unsubscribe, don't stop the manager
      // The manager will continue running if other components are using it
    }
  }, [])

  const start = useCallback(() => {
    managerRef.current.start()
  }, [])

  const stop = useCallback(() => {
    managerRef.current.stop()
  }, [])

  const toggle = useCallback(() => {
    managerRef.current.toggle()
  }, [])

  const reset = useCallback(() => {
    managerRef.current.reset()
  }, [])

  return {
    // State
    ...state,
    isGenerating: managerRef.current.getIsGenerating(),

    // Actions
    start,
    stop,
    toggle,
    reset,

    // Statistics
    successRate: state.totalGenerated > 0 ? (state.totalSuccessful / state.totalGenerated) * 100 : 0,

    // Configuration
    config: {
      intervalMs,
      minOrdersPerBatch,
      maxOrdersPerBatch,
    },

    // Error handling
    error: null, // Errors are handled in the manager
  }
}
