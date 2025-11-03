import jwt, { type JwtPayload } from "jsonwebtoken";

/**
 * JWT Service for Salesforce OAuth2 authentication
 * Handles JWT token creation using private key and certificate
 */
export class JWTService {
  /**
   * Generic JWT token creation with HMAC algorithm
   * @param payload - Token payload
   * @param secret - Secret key for signing
   * @param algorithm - Algorithm to use (default: HS256)
   * @param expiresIn - Token expiration time
   * @returns JWT token
   */
  createHMACToken(
    payload: JwtPayload,
    secret: string,
    algorithm: string = "HS256",
    expiresIn?: string | number,
  ): string {
    const options: jwt.SignOptions = {
      algorithm: algorithm as jwt.Algorithm,
    };

    if (expiresIn !== undefined) {
      options.expiresIn = expiresIn as any;
    }

    try {
      return jwt.sign(payload, secret, options);
    } catch (error) {
      throw new Error(
        `Failed to create HMAC JWT token: ${(error as Error).message}`,
      );
    }
  }

  /**
   * Generic JWT token verification with HMAC algorithm
   * @param token - JWT token to verify
   * @param secret - Secret key for verification
   * @param algorithm - Algorithm to use (default: HS256)
   * @returns Decoded token payload
   */
  verifyHMACToken(
    token: string,
    secret: string,
    algorithm: string = "HS256",
  ): any {
    try {
      return jwt.verify(token, secret, {
        algorithms: [algorithm as jwt.Algorithm],
      });
    } catch (error) {
      throw new Error(
        `HMAC JWT verification failed: ${(error as Error).message}`,
      );
    }
  }
  /**
   * Decode JWT token without verification (for reading payload)
   * @param token - JWT token to decode
   * @returns Decoded token payload
   */
  decodeJWT(token: string): jwt.JwtPayload | null {
    try {
      return jwt.decode(token) as jwt.JwtPayload;
    } catch (error) {
      console.warn(`Failed to decode JWT token: ${(error as Error).message}`);
      return null;
    }
  }

  /**
   * Get expiration time from JWT token
   * @param token - JWT token (or any token to attempt decoding)
   * @returns Expiration timestamp in milliseconds or null if not found
   */
  getTokenExpirationTime(token: string): number | null {
    try {
      const decoded = this.decodeJWT(token);
      if (!decoded || !decoded.exp) {
        return null;
      }
      // Convert from seconds to milliseconds
      return decoded.exp * 1000;
    } catch (error) {
      // Token might not be a JWT (Salesforce access tokens are typically opaque)
      console.debug(
        `Token is not a JWT or cannot be decoded: ${(error as Error).message}`,
      );
      return null;
    }
  }
}
