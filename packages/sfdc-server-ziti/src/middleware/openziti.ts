import type { FastifyRequest, FastifyReply } from "fastify";
import { OpenZitiService } from "../services/openziti.service.js";
import type { OpenZitiConfig } from "../config/openziti.js";

export interface OpenZitiRequest extends FastifyRequest {
  openziti?: {
    connectionId?: string;
    remoteAddress?: string;
    isSecure?: boolean;
    serviceName?: string;
  };
}

export interface OpenZitiMiddlewareOptions {
  openzitiService: OpenZitiService;
  config: OpenZitiConfig;
  requireSecureConnection?: boolean;
  allowedServices?: string[];
}

/**
 * OpenZiti middleware for Fastify
 * Handles authentication and authorization through OpenZiti network
 */
export async function openzitiMiddleware(request: OpenZitiRequest, reply: FastifyReply, options: OpenZitiMiddlewareOptions): Promise<void> {
  const { openzitiService, config, requireSecureConnection = true, allowedServices = [] } = options;

  // Skip OpenZiti middleware if not enabled
  if (!config.enabled) {
    return;
  }

  try {
    // Extract OpenZiti connection information from request headers
    const connectionId = request.headers["x-openziti-connection-id"] as string;
    const serviceName = request.headers["x-openziti-service"] as string;
    const remoteAddress = (request.headers["x-forwarded-for"] as string) || request.socket.remoteAddress || "unknown";

    // Validate service name if allowed services are specified
    if (allowedServices.length > 0 && !allowedServices.includes(serviceName)) {
      reply.code(403).send({
        error: "Forbidden",
        message: "Service not allowed",
        service: serviceName,
      });
      return;
    }

    // Check if connection is secure (from OpenZiti network)
    const isSecureConnection = !!connectionId && !!serviceName;

    if (requireSecureConnection && !isSecureConnection) {
      reply.code(403).send({
        error: "Forbidden",
        message: "Connection must be through OpenZiti network",
      });
      return;
    }

    // Add OpenZiti context to request
    request.openziti = {
      connectionId,
      remoteAddress,
      isSecure: isSecureConnection,
      serviceName,
    };

    // Log the connection for monitoring
    if (isSecureConnection) {
      console.log(`OpenZiti connection: ${connectionId} from ${remoteAddress} via service ${serviceName}`);
    }
  } catch (error) {
    console.error("OpenZiti middleware error:", error);
    reply.code(500).send({
      error: "Internal Server Error",
      message: "OpenZiti middleware error",
    });
    return;
  }
}

/**
 * OpenZiti authentication middleware factory
 */
export function createOpenZitiAuthMiddleware(options: OpenZitiMiddlewareOptions) {
  return async (request: OpenZitiRequest, reply: FastifyReply) => {
    await openzitiMiddleware(request, reply, options);
  };
}

/**
 * OpenZiti monitoring middleware
 * Adds OpenZiti connection metrics to responses
 */
export async function openzitiMonitoringMiddleware(request: OpenZitiRequest, reply: FastifyReply, openzitiService: OpenZitiService): Promise<void> {
  // Add OpenZiti status headers to response
  const status = openzitiService.getStatus();

  reply.header("X-OpenZiti-Status", status.isConnected ? "connected" : "disconnected");
  reply.header("X-OpenZiti-Service", status.serviceName);
  reply.header("X-OpenZiti-Connections", status.activeConnections.toString());
  reply.header("X-OpenZiti-Uptime", status.uptime.toString());
}

/**
 * OpenZiti health check middleware
 * Provides health check endpoint for OpenZiti service
 */
export async function openzitiHealthCheckMiddleware(request: FastifyRequest, reply: FastifyReply, openzitiService: OpenZitiService): Promise<void> {
  const status = openzitiService.getStatus();
  const connections = openzitiService.getConnections();

  const healthData = {
    status: status.isConnected ? "healthy" : "unhealthy",
    openziti: {
      enabled: true,
      connected: status.isConnected,
      serviceName: status.serviceName,
      localAddress: status.localAddress,
      activeConnections: status.activeConnections,
      uptime: status.uptime,
      lastError: status.lastError,
    },
    connections: connections.map((conn) => ({
      id: conn.id,
      remoteAddress: conn.remoteAddress,
      connectedAt: conn.connectedAt,
      lastActivity: conn.lastActivity,
    })),
    timestamp: new Date().toISOString(),
  };

  reply.code(status.isConnected ? 200 : 503).send(healthData);
}

/**
 * OpenZiti connection cleanup middleware
 * Cleans up inactive connections
 */
export function createOpenZitiCleanupMiddleware(
  openzitiService: OpenZitiService,
  maxInactiveTime: number = 300000 // 5 minutes
) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const connections = openzitiService.getConnections();
    const now = Date.now();

    for (const connection of connections) {
      const inactiveTime = now - connection.lastActivity.getTime();
      if (inactiveTime > maxInactiveTime) {
        console.log(`Cleaning up inactive connection: ${connection.id}`);
        // In a real implementation, you would close the connection
        // For now, we'll just log it
      }
    }
  };
}
