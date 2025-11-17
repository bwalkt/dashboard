import type { AccessTokenPayload, RefreshTokenPayload } from "@pzero/shared";
import { config } from "../config/env";
import { JWTService } from "./jwt.service";

export class AuthService extends JWTService {
  private readonly jwtSecret: string;
  private readonly accessTokenExpiry = "1h";
  private readonly refreshTokenExpiry = "30d";

  constructor() {
    super();
    this.jwtSecret = config.JWT_SECRET;
  }

  /**
   * Generate access token with SHA-512 algorithm for GitHub OAuth2
   */
  public generateAccessToken(
    payload: Omit<AccessTokenPayload, "exp" | "iat">,
  ): string {
    return this.createHMACToken(
      payload,
      this.jwtSecret,
      "HS512",
      this.accessTokenExpiry,
    );
  }

  /**
   * Generate refresh token with SHA-512 algorithm for GitHub OAuth2
   */
  public generateRefreshToken(userId: number): string {
    const tokenPayload: Omit<RefreshTokenPayload, "exp" | "iat"> = {
      userId,
      type: "refresh",
    };

    return this.createHMACToken(
      tokenPayload,
      this.jwtSecret,
      "HS512",
      this.refreshTokenExpiry,
    );
  }

  /**
   * Verify access token and return payload for GitHub OAuth2
   */
  public verifyAccessToken(token: string): AccessTokenPayload | null {
    try {
      const decoded = this.verifyHMACToken(
        token,
        this.jwtSecret,
        "HS512",
      ) as AccessTokenPayload;

      // Additional validation
      if (
        typeof decoded.userId !== "string" ||
        (decoded.githubId !== null && typeof decoded.githubId !== "string")
      ) {
        console.log(
          "Token validation failed - userId type:",
          typeof decoded.userId,
          "githubId type:",
          typeof decoded.githubId,
        );
        return null;
      }

      return decoded;
    } catch (error) {
      console.error("Token verification failed:", error);
      return null;
    }
  }
  /**
   * Extract token from Authorization header
   */
  public extractTokenFromHeader(authHeader: string | undefined): string | null {
    if (!authHeader) {
      return null;
    }

    const parts = authHeader.split(" ");
    if (parts.length !== 2 || parts[0] !== "Bearer") {
      return null;
    }

    return parts[1] || null;
  }

  /**
   * Verify refresh token and return payload for GitHub OAuth2
   */
  public verifyRefreshToken(token: string): RefreshTokenPayload | null {
    try {
      const decoded = this.verifyHMACToken(
        token,
        this.jwtSecret,
        "HS512",
      ) as RefreshTokenPayload;

      // Additional validation
      if (decoded.type !== "refresh" || typeof decoded.userId !== "number") {
        return null;
      }

      return decoded;
    } catch (error) {
      console.error("Refresh token verification failed:", error);
      return null;
    }
  }

  /**
   * Extract token from cookies
   */
  public extractTokenFromCookies(cookies: any): string | null {
    if (!cookies || !cookies.accessToken) {
      return null;
    }

    return cookies.accessToken;
  }

  /**
   * Extract refresh token from cookies
   */
  public extractRefreshTokenFromCookies(cookies: any): string | null {
    if (!cookies || !cookies.refreshToken) {
      return null;
    }

    return cookies.refreshToken;
  }

  /**
   * Generate both access and refresh tokens
   */
  public generateTokenPair(
    userId: number,
    githubId: string | null,
    email: string,
  ): {
    accessToken: string;
    refreshToken: string;
  } {
    const accessToken = this.generateAccessToken({
      userId,
      githubId,
      email,
    });

    const refreshToken = this.generateRefreshToken(userId);

    return {
      accessToken,
      refreshToken,
    };
  }

  /**
   * Validate any JWT token and return user information for Centrifuge
   */
  public async validateToken(token: string): Promise<{
    valid: boolean;
    user?: {
      id: number;
      email: string;
      name: string;
      role?: string[];
      verified?: boolean;
    };
    error?: string;
  }> {
    try {
      // Try to verify as access token first
      const accessTokenPayload = this.verifyAccessToken(token);
      if (accessTokenPayload) {
        return {
          valid: true,
          user: {
            id: Number(accessTokenPayload.userId), // Convert string to number
            email: accessTokenPayload.email,
            name: accessTokenPayload.email.split("@")[0], // Extract name from email as fallback
            verified: true, // Access tokens are for verified users
          },
        };
      }

      // Try to verify as refresh token
      const refreshTokenPayload = this.verifyRefreshToken(token);
      if (refreshTokenPayload) {
        // For refresh tokens, we need to fetch user details
        // This is a simplified version - in production you might need to fetch from database
        return {
          valid: true,
          user: {
            id: refreshTokenPayload.userId,
            email: `user${refreshTokenPayload.userId}@unknown.com`, // Placeholder
            name: `User ${refreshTokenPayload.userId}`, // Placeholder
            verified: true,
          },
        };
      }

      return {
        valid: false,
        error: "Invalid token signature or format",
      };
    } catch (error) {
      console.error("Token validation error:", error);
      return {
        valid: false,
        error:
          error instanceof Error ? error.message : "Token validation failed",
      };
    }
  }
}

// Export singleton instance
export const authService = new AuthService();
