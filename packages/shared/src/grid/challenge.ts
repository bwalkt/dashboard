/**
 * Challenge-response handling for API requests
 * This module handles the grid-based challenge system
 */

import { evalFuncAsJSON } from './grid.js'

// Challenge headers (lowercase for WASM filter compatibility)
export const CHALLENGE_ID_HEADER = 'x-challenge-id'
export const CHALLENGE_QUESTION_HEADER = 'x-challenge'
export const CHALLENGE_PARAMS_HEADER = 'x-challenge-params'
export const CHALLENGE_ANSWER_HEADER = 'x-challenge-answer'
// TODO CONFIG AS ENV VAR
export const MAX_CHALLENGES = 5
export interface Challenge {
  id: string
  question: string
  params: { x: string; y: string } // These are "row,col" strings from server
  answer?: string | number
  solved?: boolean
  solved_at?: number
}

export interface Storage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
  readonly length: number
  key(index: number): string | null
}

export class ChallengeManager {
  private storage: Storage
  // TODO - we should not save grid in localstorage - instead ask /auth/next to return grid
  private grid: number[][] | null = null
  private challenges: Map<string, Challenge> = new Map()
  constructor(storage: Storage = typeof localStorage !== 'undefined' ? localStorage : new MemoryStorage()) {
    this.storage = storage
    const grid = this.storage.getItem('user:grid')
    this.grid = grid ? JSON.parse(grid) : null
    // Load challenges from storage
    try {
      if (storage instanceof MemoryStorage) {
        // For MemoryStorage, we can iterate over the internal store
        for (const [key, value] of storage.entries()) {
          if (key.startsWith('challenge:')) {
            try {
              const challenge: Challenge = JSON.parse(value)
              this.challenges.set(challenge.id, challenge)
            } catch (error) {
              console.error('Failed to parse stored challenge:', key, error)
            }
          }
        }
      } else {
        // For localStorage, we need to iterate through all keys
        for (let i = 0; i < storage.length; i++) {
          const key = storage.key(i)
          if (key && key.startsWith('challenge:')) {
            try {
              const value = storage.getItem(key)
              if (value) {
                const challenge: Challenge = JSON.parse(value)
                this.challenges.set(challenge.id, challenge)
              }
            } catch (error) {
              console.error('Failed to parse stored challenge:', key, error)
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to load challenges from storage:', error)
    }
  }
  setGrid(grid: number[][]): void {
    this.grid = grid
    this.storage.setItem('user:grid', JSON.stringify(grid))
  }

  /**
   * Store challenge data
   */
  storeChallenge(challenge: Challenge): string | null {
    this.challenges.set(challenge.id, challenge)
    const answer = this.solveChallenge(challenge.id)
    const updated = this.challenges.get(challenge.id) || challenge
    this.storage.setItem(`challenge:${challenge.id}`, JSON.stringify(updated))
    return answer?.toString() || null
  }
  /**
   * Get stored challenge
   */
  getChallenge(challengeId?: string): Challenge | null {
    if (challengeId) {
      const stored = this.challenges.get(challengeId)
      if (!stored) {
        return null
      }
      return stored as Challenge
    }
    // If no challengeId provided, return the first challenge in the record (if any)
    const keys = Array.from(this.challenges.keys())
    let max_prune = keys.length - MAX_CHALLENGES
    for (const key of keys) {
      const challenge = this.challenges.get(key)
      if (challenge) {
        if (challenge.solved !== true) {
          return challenge as Challenge
        }
        if (challenge.solved === true && max_prune > 0) {
          this.challenges.delete(key)
          max_prune--
          continue
        }
      }
    }
    return null
  }
  markSolved(challengeId?: string): void {
    const challenge = this.getChallenge(challengeId)
    const resolvedId = challenge?.id ?? challengeId
    if (challenge) {
      challenge.solved = true
      challenge.solved_at = Date.now()
      this.challenges.set(challenge.id, challenge)
    }
    if (resolvedId) {
      this.storage.removeItem(`challenge:${resolvedId}`)
    }
  }
  /**
   * Clear stored challenge
   */
  clearChallenge(challengeId: string): void {
    this.challenges.delete(challengeId)
    this.storage.removeItem(`challenge:${challengeId}`)
  }

  /**
   * Get user's grid
   */
  getUserGrid(): number[][] | null {
    return this.grid
  }
  /**
   * Clear user's grid
   */
  clearUserGrid(): void {
    this.grid = null
    this.storage.removeItem('user:grid')
  }
  logoff(): void {
    this.clearUserGrid()
    this.clearAllChallenges()
  }
  storeUserGrid(grid: number[][]): void {
    this.grid = grid
    this.storage.setItem('user:grid', JSON.stringify(grid))
  }
  /**
   * Parse challenge parameters from header string
   * Format: "x=row,col,y=row,col" -> { x: "row,col", y: "row,col" }
   */
  parseChallengeParams(paramsStr: string): { x: string; y: string } {
    const params: { x: string; y: string } = { x: '0,0', y: '0,0' }

    // Split by ,y= to separate x and y parts
    const parts = paramsStr.split(',y=')
    if (parts.length === 2) {
      // Extract x value (remove "x=" prefix)
      params.x = parts[0].replace('x=', '')
      // y value is the second part
      params.y = parts[1]
    } else {
      // Fallback to old parsing if format is different
      const pairs = paramsStr.split(',')
      for (const pair of pairs) {
        const [key, ...valueParts] = pair.split('=')
        const value = valueParts.join('=') // Rejoin in case value contains '='
        if (key === 'x') params.x = value
        if (key === 'y') params.y = value
      }
    }

    return params
  }

  /**
   * Extract and store challenge from response headers
   * Returns the challenge if successfully extracted
   */
  extractChallengeFromHeaders(response: Response): Challenge | null {
    const challengeId = response.headers.get(CHALLENGE_ID_HEADER)
    const challengeQuestion = response.headers.get(CHALLENGE_QUESTION_HEADER)
    const challengeParams = response.headers.get(CHALLENGE_PARAMS_HEADER)

    if (!challengeId || !challengeQuestion || !challengeParams) {
      return null
    }

    const challenge: Challenge = {
      id: challengeId,
      question: challengeQuestion,
      params: this.parseChallengeParams(challengeParams),
    }

    // Store the challenge
    this.storeChallenge(challenge)

    console.log('[Challenge Client] Received new challenge:', {
      id: challengeId,
      question: challengeQuestion,
      params: challenge.params,
      rawParams: challengeParams,
    })

    return challenge
  }

  /**
   * Solve the current challenge using the stored grid
   * Returns the calculated answer or null if unable to solve
   */
  solveChallenge(challengeId?: string): string | number | null {
    // Use provided challenge or get from storage
    const activeChallenge = this.getChallenge(challengeId)
    if (!activeChallenge) {
      console.warn('[Challenge] No challenge found')
      return null
    }
    if (activeChallenge.answer) {
      console.log('[Challenge] Challenge already solved:', {
        challengeId: activeChallenge.id,
        answer: activeChallenge.answer,
      })
      return activeChallenge.answer
    }
    if (activeChallenge.solved) {
      console.log('[Challenge] Challenge already marked as solved:', {
        challengeId: activeChallenge.id,
      })
      return activeChallenge.answer || null
    }
    // Use provided grid or get from storage
    if (!this.grid) {
      console.error('[Challenge] No user grid found')
      return null
    }

    try {
      // Use evalFuncAsJSON to solve the challenge
      // The params are already in "row,col" format as strings
      const result = evalFuncAsJSON({
        expression: activeChallenge.question,
        parameters: {
          x: activeChallenge.params.x, // Already in "row,col" format
          y: activeChallenge.params.y, // Already in "row,col" format
        },
        id: activeChallenge.id,
        grid: this.grid,
      })

      const answer = result.result.value

      if (answer === null) {
        console.warn('[Challenge] Evaluation returned null:', result.result.error)
        return null
      }

      // Update the stored challenge with the answer if using stored challenge
      activeChallenge.answer = answer
      this.challenges.set(activeChallenge.id, activeChallenge)

      console.log('[Challenge Client] Solved:', {
        activeChallengeId: activeChallenge.id,
        question: activeChallenge.question,
        params: activeChallenge.params,
        answer,
        answerType: typeof answer,
      })

      return answer
    } catch (error) {
      console.error('[Challenge] Failed to solve:', error)
      return null
    }
  }

  /**
   * Add challenge headers to a request
   * Returns updated headers with challenge ID and answer if available
   */
  addChallengeHeaders(headers: Record<string, string>, challengeId?: string): Record<string, string> {
    let attempts = 0
    while (attempts < MAX_CHALLENGES) {
      const challenge = this.getChallenge(challengeId)
      if (!challenge) {
        return headers
      }
      const challengeIdValue = challenge.id
      if (challenge.solved) {
        console.warn('[Challenge Client] Challenge already solved, skipping adding headers:', {
          challengeId: challengeIdValue,
        })
        return headers
      }
      // Solve the challenge if we haven't already
      if (challenge.answer === undefined) {
        const answer = this.solveChallenge(challenge.id)
        if (answer === null) {
          console.warn('[Challenge] Unable to solve challenge, clearing and trying next')
          this.clearChallenge(challenge.id)
          attempts++
          challengeId = undefined
          continue
        }
        challenge.answer = answer
        this.markSolved(challenge.id)
      }

      const updatedHeaders = {
        ...headers,
        [CHALLENGE_ID_HEADER]: challengeIdValue,
        [CHALLENGE_ANSWER_HEADER]: String(challenge.answer),
      }

      console.log('[Challenge Client] Adding headers to request:', {
        challengeId: challengeIdValue,
        answer: challenge.answer,
        answerType: typeof challenge.answer,
      })

      return updatedHeaders
    }

    return headers
  }
  clearAllChallenges(): void {
    const keys: string[] = []
    for (let i = 0; i < this.storage.length; i++) {
      const key = this.storage.key(i)
      if (key && key.startsWith('challenge:')) {
        keys.push(key)
      }
    }
    for (const key of keys) {
      this.storage.removeItem(key)
    }
    this.challenges.clear()
  }
  /**
   * Handle challenge response from /auth/me endpoint
   * Extracts challenge, stores it, and attempts to solve immediately
   */
  handleResponse(response: Response, userData?: any): void {
    // Extract and store the challenge
    const challenge = this.extractChallengeFromHeaders(response)

    if (challenge) {
      // If grid is provided, store it
      if (userData?.grid) {
        this.setGrid(userData.grid)
      }
      // Challenge already stored and solved by extractChallengeFromHeaders
    }
  }

  /**
   * Clear all challenge-related data
   */
  clearAll(): void {
    this.clearAllChallenges()
    this.clearUserGrid()
  }
}

/**
 * In-memory storage implementation for environments without localStorage
 */
export class MemoryStorage implements Storage {
  private store: Map<string, string> = new Map()

  entries(): IterableIterator<[string, string]> {
    return this.store.entries()
  }

  getItem(key: string): string | null {
    return this.store.get(key) || null
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value)
  }

  removeItem(key: string): void {
    this.store.delete(key)
  }

  clear(): void {
    this.store.clear()
  }

  get length(): number {
    return this.store.size
  }

  key(index: number): string | null {
    const keys = Array.from(this.store.keys())
    return keys[index] || null
  }
}

// Export singleton instance for convenience
export const challengeManager = new ChallengeManager()

// Export legacy function names for backward compatibility
export const storeChallenge = (challenge: Challenge) => challengeManager.storeChallenge(challenge)
export const getChallenge = (challengeId: string) => challengeManager.getChallenge(challengeId)
export const clearAllChallenges = () => challengeManager.clearAllChallenges()
export const storeUserGrid = (grid: number[][]) => challengeManager.storeUserGrid(grid)
export const getUserGrid = () => challengeManager.getUserGrid()
export const extractChallengeFromHeaders = (response: Response) =>
  challengeManager.extractChallengeFromHeaders(response)
export const parseChallengeParams = (paramsStr: string) => challengeManager.parseChallengeParams(paramsStr)
export const clearChallenge = (challengeId: string) => challengeManager.clearChallenge(challengeId)
export const setGrid = (grid: number[][]) => challengeManager.setGrid(grid)
export const clearUserGrid = () => challengeManager.clearUserGrid()
export const logoff = () => challengeManager.logoff()
export const solveChallenge = (challengeId?: string) => challengeManager.solveChallenge(challengeId)
export const addChallengeHeaders = (headers: Record<string, string>) => challengeManager.addChallengeHeaders(headers)
export const handleResponse = (response: Response, userData?: any) =>
  challengeManager.handleResponse(response, userData)
export const markSolved = (challengeId?: string) => challengeManager.markSolved(challengeId)
