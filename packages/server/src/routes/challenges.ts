import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { authenticateToken } from '../middleware/auth.js';
import { ChallengeService } from '../services/challenge.service.js';

interface GenerateChallengesBody {
  userId?: string;
  count?: number;
}

interface ValidateChallengeBody {
  userId: string;
  challengeId: string;
  answer: string;
}

export async function challengeRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * POST /challenges/generate
   * Generate challenges for a user
   * This endpoint can be called by the WASM filter via HTTP/2
   */
  fastify.post('/challenges/generate', async (request: FastifyRequest<{ Body: GenerateChallengesBody }>, reply: FastifyReply) => {
    try {
      const { userId, count } = request.body;
      
      // Extract userId from token if not provided
      let targetUserId = userId;
      if (!targetUserId) {
        // Try to extract from authorization header or token
        const authHeader = request.headers.authorization;
        if (authHeader?.startsWith('Bearer ')) {
          // In production, verify and decode the token to get userId
          // For now, we'll require userId in the body
          return reply.status(400).send({
            error: 'Bad Request',
            message: 'userId is required'
          });
        }
      }
      
      // Generate challenges
      const challenges = await ChallengeService.createChallenges({
        userId: targetUserId,
        count
      });
      
      return reply.send({
        success: true,
        challenges,
        count: challenges.length
      });
    } catch (error) {
      console.error('Challenge generation error:', error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to generate challenges'
      });
    }
  });

  /**
   * GET /challenges/:userId
   * Get all challenges for a user
   */
  fastify.get('/challenges/:userId', async (request: FastifyRequest<{ Params: { userId: string } }>, reply: FastifyReply) => {
    try {
      const { userId } = request.params;
      
      const challenges = await ChallengeService.getUserChallenges(userId);
      
      return reply.send({
        success: true,
        userId,
        challenges,
        total: challenges.length,
        unanswered: challenges.filter(c => !c.a_at).length,
        answered: challenges.filter(c => c.a_at).length
      });
    } catch (error) {
      console.error('Get challenges error:', error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to get challenges'
      });
    }
  });

  /**
   * GET /challenges/:userId/next
   * Get next unanswered challenge for a user
   */
  fastify.get('/challenges/:userId/next', async (request: FastifyRequest<{ Params: { userId: string } }>, reply: FastifyReply) => {
    try {
      const { userId } = request.params;
      
      let challenge = await ChallengeService.getNextChallenge(userId);
      
      // If no challenges exist, generate new ones
      if (!challenge) {
        console.log(`No challenges found for user ${userId}, generating new ones...`);
        
        await ChallengeService.createChallenges({
          userId,
          count: undefined // Use default count
        });
        
        challenge = await ChallengeService.getNextChallenge(userId);
      }
      
      if (!challenge) {
        return reply.status(404).send({
          error: 'Not Found',
          message: 'No challenges available'
        });
      }
      
      // Don't send the answer to the client
      const { answer, ...challengeWithoutAnswer } = challenge;
      
      return reply.send({
        success: true,
        challenge: challengeWithoutAnswer
      });
    } catch (error) {
      console.error('Get next challenge error:', error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to get next challenge'
      });
    }
  });

  /**
   * POST /challenges/validate
   * Validate a challenge answer
   */
  fastify.post('/challenges/validate', async (request: FastifyRequest<{ Body: ValidateChallengeBody }>, reply: FastifyReply) => {
    try {
      const { userId, challengeId, answer } = request.body;
      
      if (!userId || !challengeId || !answer) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'userId, challengeId, and answer are required'
        });
      }
      
      const isValid = await ChallengeService.validateChallenge(userId, challengeId, answer);
      
      return reply.send({
        success: true,
        valid: isValid
      });
    } catch (error) {
      console.error('Challenge validation error:', error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to validate challenge'
      });
    }
  });

  /**
   * DELETE /challenges/:userId
   * Clear all challenges for a user (admin/debug endpoint)
   */
  fastify.delete(
    '/challenges/:userId',
    {
      preHandler: authenticateToken // Require authentication for this endpoint
    },
    async (request: FastifyRequest<{ Params: { userId: string } }>, reply: FastifyReply) => {
      try {
        const { userId } = request.params;
        
        await ChallengeService.clearUserChallenges(userId);
        
        return reply.send({
          success: true,
          message: `All challenges cleared for user ${userId}`
        });
      } catch (error) {
        console.error('Clear challenges error:', error);
        return reply.status(500).send({
          error: 'Internal Server Error',
          message: 'Failed to clear challenges'
        });
      }
    }
  );
}