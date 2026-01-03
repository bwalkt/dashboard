import { randomInt } from 'node:crypto';
import { config } from '../config/env.js';
import { redis } from '../config/redis.js';

// Get the underlying Redis client for advanced operations
const redisClient = redis.getClient();

interface Challenge {
  id: string;           // Challenge ID
  func: string;          // Challenge question/function
  answer: string;        // Expected answer
  c_at: number;         // Created at timestamp
  a_at?: number;        // Answered at timestamp (optional)
}

interface ChallengeGenerationRequest {
  userId: string;
  count?: number;
}

export class ChallengeService {
  private static readonly CHALLENGE_TTL = 30 * 24 * 60 * 60; // 30 days in seconds
  private static readonly DEFAULT_CHALLENGE_COUNT = parseInt(config.CHALLENGE_COUNT || '10', 10);

  /**
   * Generate a simple math challenge
   * In production, this could call an external service or use more complex logic
   */
  private static generateChallenge(): { id: string; func: string; answer: string } {
    const operations = ['+', '-', '*'];
    const op = operations[Math.floor(Math.random() * operations.length)];
    const num1 = randomInt(1, 100);
    const num2 = randomInt(1, 50);
    
    let answer: number;
    let func: string;
    
    switch (op) {
      case '+':
        func = `${num1} + ${num2}`;
        answer = num1 + num2;
        break;
      case '-':
        func = `${num1} - ${num2}`;
        answer = num1 - num2;
        break;
      case '*':
        func = `${num1} * ${num2}`;
        answer = num1 * num2;
        break;
      default:
        func = `${num1} + ${num2}`;
        answer = num1 + num2;
    }
    
    // Generate unique challenge ID
    const id = `challenge_${Date.now()}_${randomInt(1000, 9999)}`;
    
    return {
      id,
      func,
      answer: answer.toString()
    };
  }

  /**
   * Create challenges for a user
   */
  static async createChallenges(request: ChallengeGenerationRequest): Promise<Challenge[]> {
    const count = request.count || this.DEFAULT_CHALLENGE_COUNT;
    const challenges: Challenge[] = [];
    const now = Date.now();
    
    // Get current max sequence number for user
    const existingKeys = await redisClient.keys(`next_funcs:${request.userId}:*`);
    let maxSeqNo = 0;
    
    for (const key of existingKeys) {
      const parts = key.split(':');
      const seqNo = parseInt(parts[2] || '0', 10);
      if (seqNo > maxSeqNo) {
        maxSeqNo = seqNo;
      }
    }
    
    // Generate new challenges
    const pipeline = redisClient.pipeline();
    
    for (let i = 0; i < count; i++) {
      const seqNo = maxSeqNo + i + 1;
      const challengeData = this.generateChallenge();
      
      const challenge: Challenge = {
        id: challengeData.id,
        func: challengeData.func,
        answer: challengeData.answer,
        c_at: now,
      };
      
      const key = `next_funcs:${request.userId}:${seqNo}`;
      
      // Store challenge in Redis
      pipeline.hset(key,
        'id', challenge.id,
        'func', challenge.func,
        'answer', challenge.answer,
        'c_at', challenge.c_at.toString()
      );
      
      // Set TTL
      pipeline.expire(key, this.CHALLENGE_TTL);
      
      challenges.push(challenge);
    }
    
    await pipeline.exec();
    
    return challenges;
  }

  /**
   * Get next unanswered challenge for a user
   */
  static async getNextChallenge(userId: string): Promise<Challenge | null> {
    const keys = await redisClient.keys(`next_funcs:${userId}:*`);
    
    if (keys.length === 0) {
      return null;
    }
    
    // Sort keys by sequence number
    keys.sort((a, b) => {
      const seqA = parseInt(a.split(':')[2] || '0', 10);
      const seqB = parseInt(b.split(':')[2] || '0', 10);
      return seqA - seqB;
    });
    
    // Find first unanswered challenge
    for (const key of keys) {
      const challengeData = await redisClient.hgetall(key);
      
      if (challengeData && !challengeData.a_at) {
        return {
          id: challengeData.id,
          func: challengeData.func,
          answer: challengeData.answer,
          c_at: parseInt(challengeData.c_at, 10),
          a_at: challengeData.a_at ? parseInt(challengeData.a_at, 10) : undefined
        };
      }
    }
    
    return null;
  }

  /**
   * Mark challenge as answered
   */
  static async markChallengeAnswered(userId: string, challengeId: string): Promise<boolean> {
    const keys = await redisClient.keys(`next_funcs:${userId}:*`);
    
    for (const key of keys) {
      const challengeData = await redisClient.hgetall(key);
      
      if (challengeData && challengeData.id === challengeId) {
        await redisClient.hset(key, 'a_at', Date.now().toString());
        return true;
      }
    }
    
    return false;
  }

  /**
   * Validate a challenge answer
   */
  static async validateChallenge(userId: string, challengeId: string, providedAnswer: string): Promise<boolean> {
    const keys = await redisClient.keys(`next_funcs:${userId}:*`);
    
    for (const key of keys) {
      const challengeData = await redisClient.hgetall(key);
      
      if (challengeData && challengeData.id === challengeId) {
        const isCorrect = challengeData.answer === providedAnswer;
        
        if (isCorrect) {
          // Mark as answered
          await redisClient.hset(key, 'a_at', Date.now().toString());
        }
        
        return isCorrect;
      }
    }
    
    return false;
  }

  /**
   * Get all challenges for a user
   */
  static async getUserChallenges(userId: string): Promise<Challenge[]> {
    const keys = await redisClient.keys(`next_funcs:${userId}:*`);
    const challenges: Challenge[] = [];
    
    // Sort keys by sequence number
    keys.sort((a, b) => {
      const seqA = parseInt(a.split(':')[2] || '0', 10);
      const seqB = parseInt(b.split(':')[2] || '0', 10);
      return seqA - seqB;
    });
    
    for (const key of keys) {
      const challengeData = await redisClient.hgetall(key);
      
      if (challengeData) {
        challenges.push({
          id: challengeData.id,
          func: challengeData.func,
          answer: challengeData.answer,
          c_at: parseInt(challengeData.c_at, 10),
          a_at: challengeData.a_at ? parseInt(challengeData.a_at, 10) : undefined
        });
      }
    }
    
    return challenges;
  }

  /**
   * Clear all challenges for a user
   */
  static async clearUserChallenges(userId: string): Promise<void> {
    const keys = await redisClient.keys(`next_funcs:${userId}:*`);
    
    if (keys.length > 0) {
      await redisClient.del(...keys);
    }
  }
}