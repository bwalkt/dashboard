import { IncomingHttpHeaders } from 'http'
import { getExpectedAnswer } from './redis.js'
import type { VerifyResult } from './types.js'

/**
 * Verify challenge headers against stored challenge in Redis
 * Challenge is NOT deleted after validation - it persists until expired
 */
export async function verifyChallenge(headers: IncomingHttpHeaders): Promise<VerifyResult> {
  const challengeId = headers['x-challenge-id'] as string | undefined
  const challengeAnswer = headers['x-challenge-answer'] as string | undefined

  // Require both headers
  if (!challengeId || !challengeAnswer || !challengeId.length || !challengeAnswer.length) {
    return {
      ok: false,
      reason: 'Missing required headers: x-challenge-id and x-challenge-answer',
    }
  }

  // Look up expected answer in Redis
  const expectedAnswer = await getExpectedAnswer(challengeId)

  // If not found, deny
  if (expectedAnswer === null) {
    return {
      ok: false,
      reason: 'Challenge not found or expired',
    }
  }

  // If mismatch, deny
  if (expectedAnswer !== challengeAnswer) {
    return {
      ok: false,
      reason: 'Invalid challenge answer',
    }
  }

  // If match, allow (challenge persists until expired, not deleted)
  return { ok: true }
}
