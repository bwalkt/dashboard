import { randomInt } from 'node:crypto';
import { genFunctionAsJson } from '@pzero/shared/grid';
import { db } from '../config/database.js';
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
   * Fetch user's grid from database
   */
  private static async getUserGrid(userId: string): Promise<number[][] | null> {
    try {
      const query = 'SELECT data->\'grid\' as grid FROM pzero.all_users WHERE id = $1';
      const result = await db.query(query, [userId]);
      
      if (result.rows.length === 0) {
        console.warn(`No user found with id ${userId}`);
        return null;
      }
      
      const gridData = result.rows[0].grid;
      
      if (!gridData) {
        console.warn(`No grid data found for user ${userId}`);
        return null;
      }
      
      // Validate grid data structure
      if (!Array.isArray(gridData) || !Array.isArray(gridData[0])) {
        console.warn(`Invalid grid data structure for user ${userId}`);
        return null;
      }
      
      return gridData as number[][];
    } catch (error) {
      console.error(`Error fetching grid for user ${userId}:`, error);
      return null;
    }
  }

  /**
   * Generate default grid if database grid is not available
   */
  private static generateDefaultGrid(size: number = 5): number[][] {
    const grid: number[][] = [];
    for (let i = 0; i < size; i++) {
      const row: number[] = [];
      for (let j = 0; j < size; j++) {
        row.push(randomInt(1, 100));
      }
      grid.push(row);
    }
    return grid;
  }

  /**
   * Generate a grid-based challenge using genFunctionAsJson
   */
  private static async generateChallenge(grid: number[][]): Promise<{ id: string; func: string; answer: string }> {
    try {
      // Use genFunctionAsJson to create the challenge
      const functionData = genFunctionAsJson(grid);
      
      // Generate unique challenge ID
      const id = `challenge_${Date.now()}_${randomInt(1000, 9999)}`;
      
      return {
        id,
        func: functionData.function?.expression || 'Error: Unable to generate function',
        answer: functionData.result?.value?.toString() || '0'
      };
    } catch (error) {
      console.error('Error generating grid-based challenge:', error);
      
      // Fallback to simple math if grid generation fails
      const num1 = randomInt(1, 100);
      const num2 = randomInt(1, 50);
      const answer = num1 + num2;
      
      return {
        id: `challenge_${Date.now()}_${randomInt(1000, 9999)}`,
        func: `${num1} + ${num2}`,
        answer: answer.toString()
      };
    }
  }

  /**
   * Create challenges for a user
   */
  static async createChallenges(request: ChallengeGenerationRequest): Promise<Challenge[]> {
    const count = request.count || this.DEFAULT_CHALLENGE_COUNT;
    const challenges: Challenge[] = [];
    const now = Date.now();
    
    // Fetch user's grid from database
    let grid = await this.getUserGrid(request.userId);
    
    // Fallback to default grid if database grid is not available
    if (!grid) {
      console.log(`Using default grid for user ${request.userId} (database grid not available)`);
      grid = this.generateDefaultGrid();
    } else {
      console.log(`Using database grid for user ${request.userId}`);
    }
    
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
      const challengeData = await this.generateChallenge(grid);
      
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
      
      if (challengeData && !challengeData.a_at && challengeData.id && challengeData.func && challengeData.answer && challengeData.c_at) {
        const challenge: Challenge = {
          id: challengeData.id,
          func: challengeData.func,
          answer: challengeData.answer,
          c_at: parseInt(challengeData.c_at, 10)
        };
        if (challengeData.a_at) {
          challenge.a_at = parseInt(challengeData.a_at, 10);
        }
        return challenge;
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
      
      if (challengeData && challengeData.id && challengeData.func && challengeData.answer && challengeData.c_at) {
        const challenge: Challenge = {
          id: challengeData.id,
          func: challengeData.func,
          answer: challengeData.answer,
          c_at: parseInt(challengeData.c_at, 10)
        };
        if (challengeData.a_at) {
          challenge.a_at = parseInt(challengeData.a_at, 10);
        }
        challenges.push(challenge);
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