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
}

// Export singleton instance
export const authzService = new AuthzService()
