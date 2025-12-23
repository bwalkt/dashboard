import { centrifugeServer } from "../centrifuge/server.js";
import { FilterAuthService } from "./filter-auth.service.js";
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
  private requestCounts = new Map<string, { count: number; window: number }>();

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
      if (!this.checkRateLimit(filterId)) {
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
        reason: isValid ? undefined : "Invalid challenge answer",
        cacheTtl: isValid ? 300 : 0 // Cache valid results for 5 minutes
      };

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

  // Rate limiting implementation
  private checkRateLimit(filterId: string): boolean {
    const now = Date.now();
    const windowStart = Math.floor(now / FilterCentrifugoService.RATE_LIMIT_WINDOW) * FilterCentrifugoService.RATE_LIMIT_WINDOW;
    
    const current = this.requestCounts.get(filterId);
    
    if (!current || current.window !== windowStart) {
      // New window
      this.requestCounts.set(filterId, { count: 1, window: windowStart });
      return true;
    }
    
    if (current.count >= FilterCentrifugoService.MAX_REQUESTS_PER_FILTER) {
      return false;
    }
    
    current.count++;
    return true;
  }

  // Placeholder for challenge validation - integrate with your existing logic
  private async validateChallenge(challengeId: string, challengeAnswer: string): Promise<boolean> {
    // This should integrate with your existing challenge validation service
    // For now, returning true as placeholder
    console.log(`🔐 Validating challenge ${challengeId} with answer ${challengeAnswer}`);
    return true;
  }

  // Get filter statistics
  async getFilterStatistics(): Promise<any> {
    const activeFilters = await FilterAuthService.getActiveFilters();
    
    return {
      totalActiveFilters: activeFilters.length,
      filters: activeFilters.map(f => ({
        filterId: f.filterId,
        instanceId: f.instanceId,
        envoyNodeId: f.envoyNodeId,
        lastSeen: f.lastSeen,
        uptime: Date.now() - f.createdAt
      })),
      rateLimitStatus: Array.from(this.requestCounts.entries()).map(([filterId, stats]) => ({
        filterId,
        requestCount: stats.count,
        windowStart: stats.window
      }))
    };
  }
}

// Export singleton instance
export const filterCentrifugoService = new FilterCentrifugoService();