import type { AuthenticatedRequest, ErrorResponse } from '@pzero/shared'
import type { FastifyReply, FastifyRequest } from 'fastify'
import { VALIDATION_HEADER_NAME } from '../config/constants.js'
import { redis } from '../config/redis.js'
import { authService } from '../services/auth.service.js'
import { userService } from '../services/user.service.js'

/**
 * JWT Authentication middleware
 * Extracts and verifies JWT token from Authorization header or cookies
 * Attaches user info to request object
 */
export async function authenticateToken(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  try {
    const authHeader = request.headers.authorization
    const headerToken = authService.extractTokenFromHeader(authHeader)
    const cookieToken = authService.extractTokenFromCookies(request.cookies)

    // Try header token first, then cookie token
    const token = headerToken || cookieToken

    if (!token) {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Authorization header or access token cookie missing',
      })
    }

    const payload = authService.verifyAccessToken(token)

    if (!payload) {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Invalid or expired token',
      })
    }

    // Validate and convert userId to integer
    const userId = Number(payload.userId)
    if (!Number.isFinite(userId) || !Number.isInteger(userId) || userId <= 0) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Invalid user ID in token',
      })
    }

    // Get user from database
    const user = userService.getUserById(userId)

    if (!user) {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'User not found',
      })
    }
    // Validate header value
    // const expected = await redis.get(`user:${user.id}:header`)
    // const headerValue = request.headers[VALIDATION_HEADER_NAME]

    // const actual = Array.isArray(headerValue) ? headerValue[0] : headerValue || ''
    // if (expected !== actual) {
    //   return reply.status(401).send({
    //     error: 'Unauthorized',
    //     message: 'Invalid header value',
    //   } as ErrorResponse)
    // }
    // Attach user to request
    ;(request as unknown as AuthenticatedRequest).user = user
  } catch (error) {
    console.error('Authentication middleware error:', error)
    return reply.status(500).send({
      error: 'Internal Server Error',
      message: 'Authentication failed',
    })
  }
}
