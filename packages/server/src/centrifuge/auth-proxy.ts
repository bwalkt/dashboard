import axios from "axios";
import { JWTService } from "../services/jwt.service";
import { centrifugeConfig } from "./config";
import type { AuthResult, AuthUser } from "@pzero/shared/grpc";

export class AuthProxy {
  private jwtService: JWTService;
  private fastifyBaseUrl: string;

  constructor() {
    this.jwtService = new JWTService();
    this.fastifyBaseUrl = centrifugeConfig.auth.fastify_base_url;
  }

  async validateToken(token: string): Promise<AuthResult> {
    try {
      // First try local JWT validation (faster)
      const localResult = await this.validateJWTLocally(token);
      if (localResult.valid) {
        return localResult;
      }

      // Fallback to Fastify validation endpoint
      return await this.validateViaFastify(token);
    } catch (error) {
      console.error("Token validation failed:", error);
      return {
        valid: false,
        error:
          error instanceof Error ? error.message : "Unknown validation error",
      };
    }
  }

  private async validateJWTLocally(token: string): Promise<AuthResult> {
    try {
      // Verify JWT token using the same secret as Fastify
      const decoded = this.jwtService.verifyHMACToken(
        token,
        centrifugeConfig.auth.jwt_secret,
      );

      // Check if token is not expired
      const now = Math.floor(Date.now() / 1000);
      if (decoded.exp && decoded.exp < now) {
        return {
          valid: false,
          error: "Token expired",
        };
      }

      // Extract user information from token
      const user: AuthUser = {
        id: decoded.userId || decoded.id,
        email: decoded.email,
        name: decoded.name,
        role: decoded.role
          ? Array.isArray(decoded.role)
            ? decoded.role
            : [decoded.role]
          : [],
        verified: decoded.verified,
      };

      return {
        valid: true,
        user,
      };
    } catch (error) {
      console.debug("Local JWT validation failed:", error);
      return {
        valid: false,
        error: "Invalid JWT token",
      };
    }
  }

  private async validateViaFastify(token: string): Promise<AuthResult> {
    try {
      const response = await axios.post(
        `${this.fastifyBaseUrl}${centrifugeConfig.auth.validation_endpoint}`,
        { token },
        {
          headers: {
            "Content-Type": "application/json",
            [centrifugeConfig.auth.token_header]: token,
          },
          timeout: 5000, // 5 second timeout
        },
      );

      if (response.data && response.data.valid) {
        return {
          valid: true,
          user: response.data.user,
        };
      }

      return {
        valid: false,
        error: response.data?.error || "Token validation failed",
      };
    } catch (error) {
      console.error("Fastify validation request failed:", error);

      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401 || error.response?.status === 403) {
          return {
            valid: false,
            error: "Token validation failed",
          };
        }

        if (error.code === "ECONNREFUSED") {
          console.warn(
            "Fastify server not available, falling back to local validation only",
          );
          return {
            valid: false,
            error: "Auth service unavailable",
          };
        }
      }

      return {
        valid: false,
        error: "Auth service error",
      };
    }
  }

  async getUserFromContext(clientContext: any): Promise<AuthUser | null> {
    // Extract user from client context (set during connection)
    if (clientContext && clientContext.user) {
      return clientContext.user;
    }

    // Try to extract from token if available
    const token = clientContext?.token;
    if (token) {
      const result = await this.validateToken(token);
      return result.valid ? result.user || null : null;
    }

    return null;
  }

  async checkChannelPermission(
    user: AuthUser,
    channel: string,
    action: "subscribe" | "publish",
  ): Promise<boolean> {
    try {
      // Validate user access to specific channels

      // Public channels (anyone can subscribe)
      if (channel.startsWith("public:")) {
        return true;
      }

      // User-specific channels
      if (channel.startsWith("user:")) {
        const userId = channel.split(":")[1];
        return userId === user.id.toString();
      }

      // Admin-only channels
      if (channel.startsWith("admin:")) {
        return (
          user.role?.includes("admin") ||
          user.role?.includes("super_admin") ||
          false
        );
      }

      // Organization channels (example: org:123:notifications)
      if (channel.startsWith("org:")) {
        const orgId = channel.split(":")[1];
        // You would implement org membership check here
        // For now, just check if user is verified
        return user.verified === true;
      }

      // Notification channels
      if (channel.startsWith("notifications:")) {
        const targetUserId = channel.split(":")[1];
        return targetUserId === user.id.toString();
      }

      // Default deny for unknown channel patterns
      console.warn(`Unknown channel pattern for ${action}: ${channel}`);
      return false;
    } catch (error) {
      console.error(
        `Error checking channel permission for ${action} on ${channel}:`,
        error,
      );
      return false;
    }
  }

  // Helper method to create channel names
  static createUserChannel(userId: string | number): string {
    return `user:${userId}`;
  }

  static createNotificationChannel(userId: string | number): string {
    return `notifications:${userId}`;
  }

  static createOrgChannel(orgId: string | number, suffix?: string): string {
    return suffix ? `org:${orgId}:${suffix}` : `org:${orgId}`;
  }

  static createAdminChannel(suffix?: string): string {
    return suffix ? `admin:${suffix}` : "admin:general";
  }
}

export function createAuthProxy(): AuthProxy {
  return new AuthProxy();
}
