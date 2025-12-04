import { FastifyInstance } from "fastify";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createTestApp } from "../helpers/app";
import { mockRedis } from "../mocks/redis";
import "../mocks/external-services";

describe("SMS Routes", () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    mockRedis._clear(); // Clear Redis mock storage before each test
    app = await createTestApp();
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  describe("POST /sms/verify", () => {
    it("should send SMS verification code for valid phone number", async () => {
      const phoneData = {
        phone: "+12125551234",
      };

      const response = await request(app.server)
        .post("/sms/verify")
        .send(phoneData)
        .expect("Content-Type", /json/);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("message");
      expect(response.body.message).toBe(
        "SMS verification code sent successfully",
      );
    });

    it("should reject SMS verification with missing phone", async () => {
      const response = await request(app.server)
        .post("/sms/verify")
        .send({})
        .expect("Content-Type", /json/);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
      expect(response.body.message).toBe("Phone number is required");
    });

    it("should reject SMS verification with invalid phone format", async () => {
      const phoneData = {
        phone: "invalid-phone",
      };

      const response = await request(app.server)
        .post("/sms/verify")
        .send(phoneData)
        .expect("Content-Type", /json/);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
      expect(response.body.message).toBe("Phone number format is not possible");
    });

    it("should reject SMS verification with non-US phone number", async () => {
      const phoneData = {
        phone: "+44123456789", // UK number
      };

      const response = await request(app.server)
        .post("/sms/verify")
        .send(phoneData)
        .expect("Content-Type", /json/);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
      expect(response.body.message).toBe("Phone number is not valid");
    });
  });

  describe("POST /sms/verify/confirm", () => {
    it("should reject verification with missing phone", async () => {
      const confirmData = {
        code: "123456",
      };

      const response = await request(app.server)
        .post("/sms/verify/confirm")
        .send(confirmData)
        .expect("Content-Type", /json/);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
      expect(response.body.message).toBe(
        "Phone number and verification code are required",
      );
    });

    it("should reject verification with missing code", async () => {
      const confirmData = {
        phone: "+12125551234",
      };

      const response = await request(app.server)
        .post("/sms/verify/confirm")
        .send(confirmData)
        .expect("Content-Type", /json/);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
      expect(response.body.message).toBe(
        "Phone number and verification code are required",
      );
    });

    it("should reject verification with invalid/expired code", async () => {
      const confirmData = {
        phone: "+12125551234",
        code: "123456",
      };

      const response = await request(app.server)
        .post("/sms/verify/confirm")
        .send(confirmData)
        .expect("Content-Type", /json/);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
      expect(response.body.message).toBe(
        "Verification code has expired or does not exist",
      );
    });
  });

  describe("POST /sms/verify/resend", () => {
    it("should resend SMS verification code for valid phone number", async () => {
      const phoneData = {
        phone: "+12125551234",
      };

      const response = await request(app.server)
        .post("/sms/verify/resend")
        .send(phoneData)
        .expect("Content-Type", /json/);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("message");
      expect(response.body.message).toBe(
        "SMS verification code sent successfully",
      );
    });

    it("should reject resend with missing phone", async () => {
      const response = await request(app.server)
        .post("/sms/verify/resend")
        .send({})
        .expect("Content-Type", /json/);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
      expect(response.body.message).toBe("Phone number is required");
    });

    it("should reject resend with invalid phone format", async () => {
      const phoneData = {
        phone: "invalid-phone",
      };

      const response = await request(app.server)
        .post("/sms/verify/resend")
        .send(phoneData)
        .expect("Content-Type", /json/);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
      expect(response.body.message).toBe("Phone number format is not possible");
    });

    it("should handle rate limiting", async () => {
      const phoneData = {
        phone: "+12125551234",
      };

      // First request should succeed
      const firstResponse = await request(app.server)
        .post("/sms/verify/resend")
        .send(phoneData);

      expect(firstResponse.status).toBe(200);

      // Small delay to ensure Redis write completes
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Second request immediately after should be rate limited (60 second window)
      const secondResponse = await request(app.server)
        .post("/sms/verify/resend")
        .send(phoneData);

      expect(secondResponse.status).toBe(429);
      expect(secondResponse.body).toHaveProperty("error");
      expect(secondResponse.body.message).toContain("wait");
    });
  });
});
