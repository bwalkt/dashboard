import crypto from "crypto";
import fs from "fs";
import jwt, { type JwtPayload } from "jsonwebtoken";
import path from "path";
import { fileURLToPath } from "url";
import type { JWTAssertionParams, JWTPayload } from "../types/salesforce.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * JWT Service for Salesforce OAuth2 authentication
 * Handles JWT token creation using private key and certificate
 */
export class JWTService {
  private readonly privateKeyPath: string;
  private readonly certificatePath: string;

  constructor() {
    this.privateKeyPath = path.join(__dirname, "../keys/private.key");
    this.certificatePath = path.join(__dirname, "../keys/certificate.crt");
  }

  /**
   * Load private key from file
   * @returns {string} Private key content
   */
  loadPrivateKey(): string {
    try {
      return fs.readFileSync(this.privateKeyPath, "utf8");
    } catch (error) {
      throw new Error(`Failed to load private key: ${(error as Error).message}`);
    }
  }

  /**
   * Load certificate from file
   * @returns {string} Certificate content
   */
  loadCertificate(): string {
    try {
      return fs.readFileSync(this.certificatePath, "utf8");
    } catch (error) {
      throw new Error(`Failed to load certificate: ${(error as Error).message}`);
    }
  }

  /**
   * Create JWT assertion for Salesforce OAuth2
   * @param params - JWT parameters
   * @returns JWT token
   */
  createJWTAssertion({
    consumerKey,
    username,
    loginUrl = "https://login.salesforce.com",
    audience = "https://login.salesforce.com",
    expiresIn = 300,
  }: JWTAssertionParams): string {
    if (!consumerKey) {
      throw new Error("Consumer key is required");
    }
    if (!username) {
      throw new Error("Username is required");
    }

    const privateKey = this.loadPrivateKey();
    const now = Math.floor(Date.now() / 1000);

    const payload: JWTPayload = {
      iss: consumerKey, // Issuer (Consumer Key)
      sub: username, // Subject (Username)
      aud: audience, // Audience
      exp: now + expiresIn, // Expiration time
      iat: now, // Issued at
      jti: `jwt_${now}_${Math.random().toString(36).substr(2, 9)}`, // JWT ID
    };

    const options: jwt.SignOptions = {
      algorithm: "RS256",
      header: {
        alg: "RS256",
        typ: "JWT",
      },
    };

    try {
      return jwt.sign(payload, privateKey, options);
    } catch (error) {
      throw new Error(`Failed to create JWT assertion: ${(error as Error).message}`);
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
      console.debug(`Token is not a JWT or cannot be decoded: ${(error as Error).message}`);
      return null;
    }
  }

  /**
   * Generic JWT token creation with HMAC algorithm
   * @param payload - Token payload
   * @param secret - Secret key for signing
   * @param algorithm - Algorithm to use (default: HS256)
   * @param expiresIn - Token expiration time
   * @returns JWT token
   */
  createHMACToken(payload: JwtPayload, secret: string, algorithm: string = "HS256", expiresIn?: string | number): string {
    const options: jwt.SignOptions = {
      algorithm: algorithm as jwt.Algorithm,
    };

    if (expiresIn !== undefined) {
      options.expiresIn = expiresIn as any;
    }

    try {
      return jwt.sign(payload, secret, options);
    } catch (error) {
      throw new Error(`Failed to create HMAC JWT token: ${(error as Error).message}`);
    }
  }

  /**
   * Generic JWT token verification with HMAC algorithm
   * @param token - JWT token to verify
   * @param secret - Secret key for verification
   * @param algorithm - Algorithm to use (default: HS256)
   * @returns Decoded token payload
   */
  verifyHMACToken(token: string, secret: string, algorithm: string = "HS256"): any {
    try {
      return jwt.verify(token, secret, { algorithms: [algorithm as jwt.Algorithm] });
    } catch (error) {
      throw new Error(`HMAC JWT verification failed: ${(error as Error).message}`);
    }
  }
}
