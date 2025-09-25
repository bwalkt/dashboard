import { JWTService } from "./jwt.service.js";
import type { AccessTokenPayload, RefreshTokenPayload } from "@dashboard/shared-types";

export class AuthService extends JWTService {
  private readonly jwtSecret: string;
  private readonly accessTokenExpiry = "1h";
  private readonly refreshTokenExpiry = "30d";

  constructor() {
    super();
    this.jwtSecret = process.env.JWT_SECRET || "default-secret-key";
  }

  /**
   * Generate access token with SHA-512 algorithm for GitHub OAuth2
   */
  public generateAccessToken(payload: Omit<AccessTokenPayload, "exp" | "iat">): string {
    const tokenPayload: AccessTokenPayload = {
      ...payload,
      exp: Math.floor(Date.now() / 1000) + 60 * 60, // 1 hour
      iat: Math.floor(Date.now() / 1000),
    };

    return this.createHMACToken(tokenPayload, this.jwtSecret, "HS512", this.accessTokenExpiry);
  }

  /**
   * Generate refresh token with SHA-512 algorithm for GitHub OAuth2
   */
  public generateRefreshToken(userId: number): string {
    const tokenPayload: RefreshTokenPayload = {
      userId,
      type: "refresh",
      exp: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60, // 30 days
      iat: Math.floor(Date.now() / 1000),
    };

    return this.createHMACToken(tokenPayload, this.jwtSecret, "HS512", this.refreshTokenExpiry);
  }

  /**
   * Verify access token and return payload for GitHub OAuth2
   */
  public verifyAccessToken(token: string): AccessTokenPayload | null {
    try {
      const decoded = this.verifyHMACToken(token, this.jwtSecret, "HS512") as AccessTokenPayload;

      // Additional validation
      if (typeof decoded.userId !== "number" || typeof decoded.githubId !== "string") {
        return null;
      }

      return decoded;
    } catch (error) {
      console.error("Token verification failed:", error);
      return null;
    }
  }

  /**
   * Verify refresh token and return payload for GitHub OAuth2
   */
  public verifyRefreshToken(token: string): RefreshTokenPayload | null {
    try {
      const decoded = this.verifyHMACToken(token, this.jwtSecret, "HS512") as RefreshTokenPayload;

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
   * Generate both access and refresh tokens
   */
  public generateTokenPair(
    userId: number,
    githubId: string,
    email: string
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
}

// Export singleton instance
export const authService = new AuthService();
