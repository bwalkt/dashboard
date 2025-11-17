import { beforeEach, describe, expect, it } from "vitest";
import { JWTService } from "../../src/services/jwt.service";

describe("JWT Service", () => {
  let jwtService: JWTService;

  beforeEach(() => {
    jwtService = new JWTService();
  });

  describe("HMAC Token Operations", () => {
    it("should create and verify HMAC token successfully", () => {
      const payload = { userId: "123", email: "test@example.com" };
      const secret = "test-secret";

      const token = jwtService.createHMACToken(payload, secret);
      expect(token).toBeTruthy();
      expect(typeof token).toBe("string");

      const decoded = jwtService.verifyHMACToken(token, secret);
      expect(decoded).toHaveProperty("userId", "123");
      expect(decoded).toHaveProperty("email", "test@example.com");
    });

    it("should throw error for invalid HMAC token", () => {
      const secret = "test-secret";
      const invalidToken = "invalid.token.here";

      expect(() => {
        jwtService.verifyHMACToken(invalidToken, secret);
      }).toThrow("HMAC JWT verification failed");
    });

    it("should throw error when verifying with wrong secret", () => {
      const payload = { userId: "123" };
      const secret = "test-secret";
      const wrongSecret = "wrong-secret";

      const token = jwtService.createHMACToken(payload, secret);

      expect(() => {
        jwtService.verifyHMACToken(token, wrongSecret);
      }).toThrow("HMAC JWT verification failed");
    });

    it("should include expiration time when specified", () => {
      const payload = { userId: "123" };
      const secret = "test-secret";
      const expiresIn = "1h";

      const token = jwtService.createHMACToken(
        payload,
        secret,
        "HS256",
        expiresIn,
      );
      const decoded = jwtService.verifyHMACToken(token, secret);

      expect(decoded).toHaveProperty("exp");
      expect(decoded.exp).toBeGreaterThan(Date.now() / 1000);
    });

    it("should decode JWT token without verification", () => {
      const payload = { userId: "123", role: "admin" };
      const secret = "test-secret";

      const token = jwtService.createHMACToken(payload, secret);
      const decoded = jwtService.decodeJWT(token);

      expect(decoded).toBeTruthy();
      expect(decoded?.userId).toBe(payload.userId);
      expect(decoded?.role).toBe(payload.role);
    });

    it("should get token expiration time", () => {
      const payload = { userId: "123" };
      const secret = "test-secret";
      const expiresIn = "1h";

      const token = jwtService.createHMACToken(
        payload,
        secret,
        "HS256",
        expiresIn,
      );
      const expirationTime = jwtService.getTokenExpirationTime(token);

      expect(expirationTime).toBeTruthy();
      expect(typeof expirationTime).toBe("number");
      expect(expirationTime).toBeGreaterThan(Date.now());
    });
  });
});
