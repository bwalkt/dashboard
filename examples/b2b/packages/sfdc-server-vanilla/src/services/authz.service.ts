export interface ChallengeResponse {
  challengeId: string
  challenge: string
}

export class AuthzService {
  private readonly authzServiceUrl: string

  constructor() {
    this.authzServiceUrl = process.env.AUTHZ_SERVICE_URL || 'http://authz-service:3000'
  }

  /**
   * Issue a new challenge from the authz-service
   * @returns Challenge response with challengeId and challenge, or null if failed
   */
  async issueChallenge(): Promise<ChallengeResponse | null> {
    try {
      const response = await fetch(`${this.authzServiceUrl}/issue-challenge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}), // Send empty body to satisfy Fastify
      })

      if (!response.ok) {
        const errorText = await response.text().catch(() => '')
        console.error('Failed to issue challenge from authz-service:', response.status, response.statusText, errorText)
        return null
      }

      return await response.json()
    } catch (error) {
      console.error('Error calling authz-service to issue challenge:', error)
      return null
    }
  }

  /**
   * Refresh a challenge from the authz-service
   * @param oldChallengeId - Optional old challenge ID to refresh
   * @returns Challenge response with challengeId and challenge, or null if failed
   */
  async refreshChallenge(oldChallengeId?: string | null): Promise<ChallengeResponse | null> {
    try {
      const response = await fetch(`${this.authzServiceUrl}/refresh-challenge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          challengeId: oldChallengeId || undefined,
        }),
      })

      if (!response.ok) {
        console.error('Failed to refresh challenge from authz-service:', response.status, response.statusText)
        return null
      }

      return await response.json()
    } catch (error) {
      console.error('Error calling authz-service to refresh challenge:', error)
      return null
    }
  }

  /**
   * Validate challenge headers via authz-service
   * @param challengeId - The challenge ID from the request headers
   * @param challengeAnswer - The challenge answer from the request headers
   * @param maxRetries - Maximum number of retry attempts (default: 2)
   * @param timeoutMs - Request timeout in milliseconds (default: 5000)
   * @returns true if validation succeeds, false otherwise
   */
  async validateChallenge(
    challengeId: string,
    challengeAnswer: string,
    maxRetries: number = 2,
    timeoutMs: number = 5000,
  ): Promise<boolean> {
    const url = `${this.authzServiceUrl}/authz`

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // Create AbortController for timeout
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

        try {
          const response = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-challenge-id': challengeId,
              'x-challenge-answer': challengeAnswer,
            },
            signal: controller.signal,
          })

          clearTimeout(timeoutId)

          if (!response.ok) {
            // If we get a 403, the challenge is invalid (not a service error)
            if (response.status === 403) {
              const errorData = await response.json().catch(() => ({}))
              console.warn(
                `Challenge validation failed (attempt ${attempt + 1}/${maxRetries + 1}):`,
                errorData.message || 'Invalid challenge',
              )
              return false
            }

            // For other errors, retry if we have attempts left
            if (attempt < maxRetries) {
              const errorText = await response.text().catch(() => '')
              console.warn(
                `Authz-service returned error ${response.status} (attempt ${attempt + 1}/${maxRetries + 1}):`,
                errorText,
              )
              continue
            }

            // Last attempt failed
            const errorText = await response.text().catch(() => '')
            console.error(
              `Failed to validate challenge from authz-service after ${maxRetries + 1} attempts:`,
              response.status,
              response.statusText,
              errorText,
            )
            return false
          }

          // Success - parse response
          const result = await response.json().catch(() => ({ ok: false }))
          return result.ok === true
        } catch (fetchError) {
          clearTimeout(timeoutId)

          // Handle abort (timeout)
          if (fetchError instanceof Error && fetchError.name === 'AbortError') {
            if (attempt < maxRetries) {
              console.warn(
                `Authz-service request timed out after ${timeoutMs}ms (attempt ${attempt + 1}/${maxRetries + 1}), retrying...`,
              )
              continue
            }
            console.error(`Authz-service request timed out after ${maxRetries + 1} attempts (${timeoutMs}ms each)`)
            return false
          }

          // Handle other fetch errors
          if (attempt < maxRetries) {
            console.warn(
              `Error calling authz-service (attempt ${attempt + 1}/${maxRetries + 1}):`,
              fetchError instanceof Error ? fetchError.message : String(fetchError),
            )
            continue
          }

          console.error('Error calling authz-service to validate challenge:', fetchError)
          return false
        }
      } catch (error) {
        // Unexpected error
        if (attempt < maxRetries) {
          console.warn(
            `Unexpected error validating challenge (attempt ${attempt + 1}/${maxRetries + 1}):`,
            error instanceof Error ? error.message : String(error),
          )
          continue
        }

        console.error('Unexpected error calling authz-service to validate challenge:', error)
        return false
      }
    }

    // Should not reach here, but return false as fallback
    return false
  }
}

// Export singleton instance
export const authzService = new AuthzService()
