export interface ChallengeResponse {
  challengeId: string
  challenge: string // The challenge string that client needs to hash
}

export interface AuthzResponse {
  ok: boolean
  message?: string
}

export interface VerifyResult {
  ok: boolean
  reason?: string
}

export interface RefreshChallengeResponse {
  challengeId: string
  challenge: string
}
