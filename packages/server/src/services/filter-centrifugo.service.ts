import { centrifugeServer } from "../centrifuge/server.js";
import { redis } from "../config/redis.js";
import { FilterAuthService } from "./filter-auth.service.js";
import { filterRedisService } from "./filter-redis.service.js";
import { headerInfoCache } from "./header-info-cache.service.js";

export interface FilterMessage {
  type: 'challenge_validation' | 'header_info_request' | 'filter_heartbeat' | 'filter_register' | 'filter_status';
  payload: any;
  messageId: string;
}

export interface ChallengeValidationRequest {
  challengeId: string;
  challengeAnswer: string;
  requestId: string;
  envoyRequestId?: string;
}

export interface ChallengeValidationResponse {
  challengeId: string;
  requestId: string;
  valid: boolean;
  reason?: string;
  cacheTtl?: number; // How long the filter should cache this result
}

export interface HeaderInfoRequest {
  requestId: string;
  dataTypes?: ('active_users' | 'active_endpoints' | 'next_functions')[];
}

export interface HeaderInfoResponse {
  requestId: string;
  data: {
    active_users?: Record<string, any>;
    active_endpoints?: Record<string, any>;
    next_functions?: Record<string, any>;
    error?: string;
    errorMessage?: string;
  };
  timestamp: number;
}

export interface FilterHeartbeat {
  filterId: string;
  instanceId: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  metrics?: {
    requestsProcessed: number;
    errorRate: number;
    avgResponseTime: number;
  };
}

export class FilterCentrifugoService {
  // Channel naming conventions
  private static readonly CHANNEL_PREFIX = "filter:";
  private static readonly REQUEST_CHANNEL = `${FilterCentrifugoService.CHANNEL_PREFIX}requests`;
  private static readonly RESPONSE_CHANNEL = `${FilterCentrifugoService.CHANNEL_PREFIX}responses`;
  private static readonly BROADCAST_CHANNEL = `${FilterCentrifugoService.CHANNEL_PREFIX}broadcast`;
  
  // Rate limiting
  private static readonly RATE_LIMIT_WINDOW = 60000; // 1 minute
  private static readonly MAX_REQUESTS_PER_FILTER = 1000; // per minute
  private static readonly RATE_LIMIT_TTL = 120; // 2 minutes (longer than window for safety)

  constructor() {
    this.setupMessageHandlers();
  }

  private setupMessageHandlers(): void {
    // Note: In a real implementation, you'd set up Centrifugo subscribers
    // For now, we'll handle this through direct API calls
    console.log("🔧 Filter Centrifugo service initialized");
  }

  // Send challenge validation response to specific filter
  async sendChallengeValidationResponse(
    filterId: string,
    instanceId: string,
    response: ChallengeValidationResponse
  ): Promise<void> {
    try {
      const message: FilterMessage = {
        type: 'challenge_validation',
        payload: response,
        messageId: `cv_${Date.now()}_${Math.random().toString(36).substring(7)}`
      };

      const signedMessage = FilterAuthService.createSignedMessage(filterId, instanceId, message);
      const channel = `${FilterCentrifugoService.RESPONSE_CHANNEL}:${filterId}:${instanceId}`;

      await centrifugeServer.publishToChannel(channel, signedMessage);
      
      console.log(`📤 Sent challenge validation response to filter ${filterId}:${instanceId}`);
    } catch (error) {
      console.error("Error sending challenge validation response:", error);
      throw error;
    }
  }

  // Send header info response to specific filter
  async sendHeaderInfoResponse(
    filterId: string,
    instanceId: string,
    response: HeaderInfoResponse
  ): Promise<void> {
    try {
      const message: FilterMessage = {
        type: 'header_info_request',
        payload: response,
        messageId: `hi_${Date.now()}_${Math.random().toString(36).substring(7)}`
      };

      const signedMessage = FilterAuthService.createSignedMessage(filterId, instanceId, message);
      const channel = `${FilterCentrifugoService.RESPONSE_CHANNEL}:${filterId}:${instanceId}`;

      await centrifugeServer.publishToChannel(channel, signedMessage);
      
      console.log(`📤 Sent header info response to filter ${filterId}:${instanceId}`);
    } catch (error) {
      console.error("Error sending header info response:", error);
      throw error;
    }
  }

  // Broadcast header info updates to all filters
  async broadcastHeaderInfoUpdate(updateType: 'user' | 'endpoint' | 'function', data: any): Promise<void> {
    try {
      const message = {
        type: 'header_info_update',
        updateType,
        data,
        timestamp: Date.now(),
        messageId: `update_${Date.now()}_${Math.random().toString(36).substring(7)}`
      };

      await centrifugeServer.publishToChannel(FilterCentrifugoService.BROADCAST_CHANNEL, message);
      
      console.log(`📡 Broadcasted header info update: ${updateType}`);
    } catch (error) {
      console.error("Error broadcasting header info update:", error);
      throw error;
    }
  }

  // Handle incoming filter request
  async handleFilterRequest(filterId: string, instanceId: string, message: FilterMessage): Promise<void> {
    try {
      // Rate limiting check
      if (!(await this.checkRateLimit(filterId))) {
        console.warn(`⚠️ Rate limit exceeded for filter ${filterId}`);
        return;
      }

      switch (message.type) {
        case 'challenge_validation':
          await this.handleChallengeValidation(filterId, instanceId, message);
          break;
          
        case 'header_info_request':
          await this.handleHeaderInfoRequest(filterId, instanceId, message);
          break;
          
        case 'filter_heartbeat':
          await this.handleFilterHeartbeat(filterId, instanceId, message);
          break;
          
        case 'filter_register':
          await this.handleFilterRegistration(filterId, instanceId, message);
          break;
          
        default:
          console.warn(`Unknown filter message type: ${message.type}`);
      }
    } catch (error) {
      console.error(`Error handling filter request from ${filterId}:${instanceId}:`, error);
    }
  }

  private async handleChallengeValidation(
    filterId: string,
    instanceId: string,
    message: FilterMessage
  ): Promise<void> {
    const request = message.payload as ChallengeValidationRequest;
    
    try {
      // Validate challenge using your existing auth service
      // This would integrate with your existing challenge validation logic
      const isValid = await this.validateChallenge(request.challengeId, request.challengeAnswer);
      
      const response: ChallengeValidationResponse = {
        challengeId: request.challengeId,
        requestId: request.requestId,
        valid: isValid,
        cacheTtl: isValid ? 300 : 0 // Cache valid results for 5 minutes
      };
      
      if (!isValid) {
        response.reason = "Invalid challenge answer";
      }

      await this.sendChallengeValidationResponse(filterId, instanceId, response);
    } catch (error) {
      console.error("Challenge validation error:", error);
      
      const errorResponse: ChallengeValidationResponse = {
        challengeId: request.challengeId,
        requestId: request.requestId,
        valid: false,
        reason: "Validation service error"
      };

      await this.sendChallengeValidationResponse(filterId, instanceId, errorResponse);
    }
  }

  private async handleHeaderInfoRequest(
    filterId: string,
    instanceId: string,
    message: FilterMessage
  ): Promise<void> {
    const request = message.payload as HeaderInfoRequest;
    
    try {
      const headerInfo = await headerInfoCache.getFullHeaderInfo();
      
      // Filter requested data types
      const responseData: any = {};
      if (!request.dataTypes || request.dataTypes.includes('active_users')) {
        responseData.active_users = headerInfo.active_users;
      }
      if (!request.dataTypes || request.dataTypes.includes('active_endpoints')) {
        responseData.active_endpoints = headerInfo.active_endpoints;
      }
      if (!request.dataTypes || request.dataTypes.includes('next_functions')) {
        responseData.next_functions = headerInfo.next_functions;
      }

      const response: HeaderInfoResponse = {
        requestId: request.requestId,
        data: responseData,
        timestamp: Date.now()
      };

      await this.sendHeaderInfoResponse(filterId, instanceId, response);
    } catch (error) {
      console.error("Header info request error:", error);
      
      // Send error response so filter doesn't wait indefinitely
      try {
        const errorResponse: HeaderInfoResponse = {
          requestId: request.requestId,
          data: {
            error: "Failed to retrieve header info",
            errorMessage: error instanceof Error ? error.message : "Unknown error"
          },
          timestamp: Date.now()
        };
        
        await this.sendHeaderInfoResponse(filterId, instanceId, errorResponse);
        console.log(`📤 Sent error response to filter ${filterId}:${instanceId} for request ${request.requestId}`);
      } catch (responseError) {
        console.error("Failed to send error response to filter:", responseError);
        // At this point, the filter will timeout, but we've done our best to notify it
      }
    }
  }

  private async handleFilterHeartbeat(
    filterId: string,
    instanceId: string,
    message: FilterMessage
  ): Promise<void> {
    const heartbeat = message.payload as FilterHeartbeat;
    
    // Update filter activity and metrics
    await FilterAuthService.updateFilterActivity(filterId, instanceId);
    
    // Log metrics if provided
    if (heartbeat.metrics) {
      console.log(`💓 Filter ${filterId}:${instanceId} heartbeat:`, {
        status: heartbeat.status,
        metrics: heartbeat.metrics
      });
    }
  }

  private async handleFilterRegistration(
    filterId: string,
    instanceId: string,
    message: FilterMessage
  ): Promise<void> {
    const { envoyNodeId } = message.payload;
    
    try {
      await FilterAuthService.registerFilter(filterId, envoyNodeId, instanceId);
      console.log(`✅ Filter registered: ${filterId}:${instanceId} (envoy: ${envoyNodeId})`);
    } catch (error) {
      console.error("Filter registration error:", error);
    }
  }

  // Rate limiting implementation using Redis for distributed servers
  private async checkRateLimit(filterId: string): Promise<boolean> {
    try {
      const now = Date.now();
      const windowStart = Math.floor(now / FilterCentrifugoService.RATE_LIMIT_WINDOW) * FilterCentrifugoService.RATE_LIMIT_WINDOW;
      const key = `filter_rate_limit:${filterId}:${windowStart}`;
      
      // Atomically increment the counter and get the new value
      const count = await redis.getClient().incr(key);
      
      // Set TTL on first increment to ensure cleanup
      if (count === 1) {
        await redis.getClient().expire(key, FilterCentrifugoService.RATE_LIMIT_TTL);
      }
      
      // Check if we're within the limit
      const isWithinLimit = count <= FilterCentrifugoService.MAX_REQUESTS_PER_FILTER;
      
      if (!isWithinLimit) {
        console.warn(`🚫 Filter ${filterId} exceeded rate limit: ${count}/${FilterCentrifugoService.MAX_REQUESTS_PER_FILTER} requests in current window`);
      }
      
      return isWithinLimit;
    } catch (error) {
      console.error("Rate limiting error:", error);
      // On Redis error, allow the request (fail open for availability)
      return true;
    }
  }

  // Challenge validation using Redis-based validation service
  private async validateChallenge(challengeId: string, challengeAnswer: string): Promise<boolean> {
    try {
      console.log(`🔐 Validating challenge ${challengeId}`);
      
      // Generate a unique request ID for this validation
      const requestId = `cv_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      
      // Queue the challenge for validation using the existing Redis service
      await filterRedisService.queueChallengeValidation(
        requestId,
        'centrifugo', // filterId for centrifugo service
        challengeId,
        challengeAnswer
      );
      
      // Poll for result (with timeout)
      const maxWaitTime = 5000; // 5 seconds
      const pollInterval = 100; // 100ms
      const startTime = Date.now();
      
      while (Date.now() - startTime < maxWaitTime) {
        const result = await filterRedisService.getChallengeResult(requestId);
        
        if (result) {
          if (result.status === 'success' && result.data?.valid === true) {
            console.log(`✅ Challenge ${challengeId} validation successful`);
            return true;
          } else {
            console.log(`❌ Challenge ${challengeId} validation failed: ${result.error || 'Invalid answer'}`);
            return false;
          }
        }
        
        // Wait before polling again
        await new Promise(resolve => setTimeout(resolve, pollInterval));
      }
      
      // Timeout
      console.warn(`⏰ Challenge ${challengeId} validation timed out`);
      return false;
      
    } catch (error) {
      console.error(`💥 Challenge validation error for ${challengeId}:`, error);
      return false;
    }
  }

  // Get filter statistics
  async getFilterStatistics(): Promise<any> {
    try {
      const activeFilters = await FilterAuthService.getActiveFilters();
      
      // Get rate limit statistics from Redis
      const rateLimitStatus = await this.getRateLimitStatistics(activeFilters);
      
      return {
        totalActiveFilters: activeFilters.length,
        filters: activeFilters.map(f => ({
          filterId: f.filterId,
          instanceId: f.instanceId,
          envoyNodeId: f.envoyNodeId,
          lastSeen: f.lastSeen,
          uptime: Date.now() - f.createdAt,
          isActive: Date.now() - f.lastSeen < 300000 // Active if seen within 5 minutes
        })),
        rateLimitStatus,
        rateLimitConfig: {
          maxRequestsPerFilter: FilterCentrifugoService.MAX_REQUESTS_PER_FILTER,
          windowSizeMs: FilterCentrifugoService.RATE_LIMIT_WINDOW,
          ttlSeconds: FilterCentrifugoService.RATE_LIMIT_TTL
        }
      };
    } catch (error) {
      console.error("Error getting filter statistics:", error);
      return {
        totalActiveFilters: 0,
        filters: [],
        rateLimitStatus: [],
        error: "Failed to retrieve statistics"
      };
    }
  }

  // Get rate limit statistics from Redis
  private async getRateLimitStatistics(activeFilters: any[]): Promise<any[]> {
    try {
      const now = Date.now();
      const currentWindowStart = Math.floor(now / FilterCentrifugoService.RATE_LIMIT_WINDOW) * FilterCentrifugoService.RATE_LIMIT_WINDOW;
      const prevWindowStart = currentWindowStart - FilterCentrifugoService.RATE_LIMIT_WINDOW;
      
      const rateLimitStats = [];
      
      for (const filter of activeFilters) {
        const currentKey = `filter_rate_limit:${filter.filterId}:${currentWindowStart}`;
        const prevKey = `filter_rate_limit:${filter.filterId}:${prevWindowStart}`;
        
        // Get counts for current and previous windows
        const [currentCount, prevCount] = await Promise.all([
          redis.getClient().get(currentKey),
          redis.getClient().get(prevKey)
        ]);
        
        rateLimitStats.push({
          filterId: filter.filterId,
          currentWindow: {
            windowStart: currentWindowStart,
            requestCount: parseInt(currentCount || '0', 10),
            limit: FilterCentrifugoService.MAX_REQUESTS_PER_FILTER
          },
          previousWindow: {
            windowStart: prevWindowStart,
            requestCount: parseInt(prevCount || '0', 10)
          },
          isThrottled: parseInt(currentCount || '0', 10) >= FilterCentrifugoService.MAX_REQUESTS_PER_FILTER
        });
      }
      
      return rateLimitStats;
    } catch (error) {
      console.error("Error getting rate limit statistics:", error);
      return [];
    }
  }
}

// Export singleton instance
export const filterCentrifugoService = new FilterCentrifugoService();