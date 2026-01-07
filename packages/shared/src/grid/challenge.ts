/**
 * Challenge-response handling for API requests
 * This module handles the grid-based challenge system
 */

import { evalFuncAsJSON } from './index.js'

// Challenge headers (lowercase for WASM filter compatibility)
export const CHALLENGE_ID_HEADER = 'x-challenge-id'
export const CHALLENGE_QUESTION_HEADER = 'x-challenge-question'
export const CHALLENGE_PARAMS_HEADER = 'x-challenge-params'
export const CHALLENGE_ANSWER_HEADER = 'x-challenge-answer'

// Storage keys
const CHALLENGE_STORAGE_KEY = 'pzero_challenge'
const USER_GRID_KEY = 'user_grid'

export interface Challenge {
  id: string
  question: string
  params: { x: string; y: string } // These are "row,col" strings from server
  answer?: string | number
}

export interface Storage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

export class ChallengeManager {
  private storage: Storage
  grid: number[][] | null = null
  constructor(storage: Storage = typeof localStorage !== 'undefined' ? localStorage : new MemoryStorage()) {
    this.storage = storage
  }

  /**
   * Store challenge data
   */
  storeChallenge(challenge: Challenge): void {
    this.storage.setItem(CHALLENGE_STORAGE_KEY, JSON.stringify(challenge))
  }

  /**
   * Get stored challenge
   */
  getStoredChallenge(): Challenge | null {
    const stored = this.storage.getItem(CHALLENGE_STORAGE_KEY)
    if (!stored) return null

    try {
      return JSON.parse(stored) as Challenge
    } catch {
      return null
    }
  }

  /**
   * Clear stored challenge
   */
  clearChallenge(): void {
    this.storage.removeItem(CHALLENGE_STORAGE_KEY)
  }

  /**
   * Store user's grid (should be stored after decrypting from server)
   */
  storeUserGrid(grid: number[][]): void {
    this.grid = grid
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
  }

  /**
   * Parse challenge parameters from header string
   * Format: "x=row,col,y=row,col" -> { x: "row,col", y: "row,col" }
   */
  private parseChallengeParams(paramsStr: string): { x: string; y: string } {
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
  solveChallenge(challenge?: Challenge, grid?: number[][]): string | number | null {
    // Use provided challenge or get from storage
    const activeChallenge = challenge || this.getStoredChallenge()
    if (!activeChallenge) {
      console.warn('[Challenge] No challenge found')
      return null
    }

    // Use provided grid or get from storage
    const userGrid = grid || this.getUserGrid()
    if (!userGrid) {
      console.warn('[Challenge] No user grid found')
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
        grid: userGrid,
      })

      const answer = result.result.value

      if (answer === null) {
        console.warn('[Challenge] Evaluation returned null:', result.result.error)
        return null
      }

      // Update the stored challenge with the answer if using stored challenge
      if (!challenge) {
        activeChallenge.answer = answer
        this.storeChallenge(activeChallenge)
      }

      console.log('[Challenge Client] Solved:', {
        challengeId: activeChallenge.id,
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
  addChallengeHeaders(headers: Record<string, string>): Record<string, string> {
    const challenge = this.getStoredChallenge()
    if (!challenge || !challenge.id) {
      return headers
    }

    // Solve the challenge if we haven't already
    if (challenge.answer === undefined) {
      const answer = this.solveChallenge()
      if (answer === null) {
        console.warn('[Challenge] Unable to solve challenge, sending request without answer')
        return headers
      }
      challenge.answer = answer
    }

    const updatedHeaders = {
      ...headers,
      [CHALLENGE_ID_HEADER]: challenge.id,
      [CHALLENGE_ANSWER_HEADER]: String(challenge.answer),
    }

    console.log('[Challenge Client] Adding headers to request:', {
      challengeId: challenge.id,
      answer: challenge.answer,
      answerType: typeof challenge.answer,
    })

    return updatedHeaders
  }

  /**
   * Handle challenge response from /auth/me endpoint
   * Extracts challenge, stores it, and attempts to solve immediately
   */
  handleAuthMeResponse(response: Response, userData?: any): void {
    // Extract and store the challenge
    const challenge = this.extractChallengeFromHeaders(response)

    if (challenge) {
      // If grid is provided, store it
      if (userData?.grid) {
        this.storeUserGrid(userData.grid)
      }

      // Try to solve immediately
      const answer = this.solveChallenge()
      if (answer !== null) {
        console.log('[Challenge Client] Pre-solved challenge for future requests:', {
          challengeId: challenge.id,
          question: challenge.question,
          answer,
          answerType: typeof answer,
        })
      }
    }
  }

  /**
   * Extract and handle challenge from response headers
   * Stores the solution in localStorage for future requests
   * This is the async version that can be used in API responses
   */
  async handleChallengeHeaders(response: Response, userData?: any): Promise<void> {
    // Extract the grid-based challenge
    const challenge = this.extractChallengeFromHeaders(response)

    if (challenge) {
      // Store user grid if provided (from /auth/me response)
      if (userData?.grid) {
        this.storeUserGrid(userData.grid)
      }

      // Try to solve immediately
      const answer = this.solveChallenge()
      if (answer !== null) {
        console.log('[Challenge Client] Pre-solved challenge for future requests:', {
          challengeId: challenge.id,
          question: challenge.question,
          answer,
          answerType: typeof answer,
        })
      }
    }
  }

  /**
   * Clear all challenge-related data
   */
  clearAll(): void {
    this.clearChallenge()
    this.clearUserGrid()
  }
}

/**
 * In-memory storage implementation for environments without localStorage
 */
export class MemoryStorage implements Storage {
  private store: Map<string, string> = new Map()

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
}

// Export singleton instance for convenience
export const challengeManager = new ChallengeManager()

// Export legacy function names for backward compatibility
export const storeChallenge = (challenge: Challenge) => challengeManager.storeChallenge(challenge)
export const getStoredChallenge = () => challengeManager.getStoredChallenge()
export const clearChallenge = () => challengeManager.clearChallenge()
export const storeUserGrid = (grid: number[][]) => challengeManager.storeUserGrid(grid)
export const getUserGrid = () => challengeManager.getUserGrid()
export const extractChallengeFromHeaders = (response: Response) =>
  challengeManager.extractChallengeFromHeaders(response)
export const solveChallenge = () => challengeManager.solveChallenge()
export const addChallengeHeaders = (headers: Record<string, string>) => challengeManager.addChallengeHeaders(headers)
export const handleAuthMeResponse = (response: Response, userData?: any) =>
  challengeManager.handleAuthMeResponse(response, userData)
export const handleChallengeHeaders = (response: Response, userData?: any) =>
  challengeManager.handleChallengeHeaders(response, userData)
