import { FastifyInstance } from "fastify";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createTestApp } from "../helpers/app";

describe("Auth Routes", () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = await createTestApp();
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  describe("POST /auth/register", () => {
    it("should register a new user successfully", async () => {
      const userData = {
        name: "Test User",
        email: "test@example.com",
      };

      const response = await request(app.server)
        .post("/auth/register")
        .send(userData)
        .expect("Content-Type", /json/);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("message");
      expect(response.body.message).toBe("Verification code sent to email");
    });

    it("should reject registration with missing name", async () => {
      const userData = {
        email: "test@example.com",
      };

      const response = await request(app.server)
        .post("/auth/register")
        .send(userData)
        .expect("Content-Type", /json/);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
    });

    it("should reject registration with missing email", async () => {
      const userData = {
        name: "Test User",
      };

      const response = await request(app.server)
        .post("/auth/register")
        .send(userData)
        .expect("Content-Type", /json/);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
    });

    it("should reject registration with invalid email", async () => {
      const userData = {
        name: "Test User",
        email: "invalid-email",
      };

      const response = await request(app.server)
        .post("/auth/register")
        .send(userData)
        .expect("Content-Type", /json/);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
    });
  });

  describe("POST /auth/login", () => {
    it("should reject login with missing email", async () => {
      const loginData = {
        code: "123456",
      };

      const response = await request(app.server)
        .post("/auth/login")
        .send(loginData)
        .expect("Content-Type", /json/);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
    });

    it("should reject login with missing code", async () => {
      const loginData = {
        email: "test@example.com",
      };

      const response = await request(app.server)
        .post("/auth/login/verify")
        .send(loginData)
        .expect("Content-Type", /json/);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
    });

    it("should reject login with invalid verification code", async () => {
      const loginData = {
        email: "test@example.com",
        code: "invalid",
      };

      const response = await request(app.server)
        .post("/auth/login/verify")
        .send(loginData)
        .expect("Content-Type", /json/);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
    });
  });

  describe("GET /auth/me", () => {
    it("should reject unauthenticated request", async () => {
      const response = await request(app.server)
        .get("/auth/me")
        .expect("Content-Type", /json/);

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty("error");
    });

    it("should reject request with invalid token", async () => {
      const response = await request(app.server)
        .get("/auth/me")
        .set("Cookie", "accessToken=invalid-token")
        .expect("Content-Type", /json/);

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty("error");
    });
  });

  describe("POST /auth/refresh", () => {
    it("should reject refresh with no refresh token", async () => {
      const response = await request(app.server)
        .post("/auth/refresh")
        .send({})
        .expect("Content-Type", /json/);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
    });

    it("should reject refresh with invalid refresh token", async () => {
      const response = await request(app.server)
        .post("/auth/refresh")
        .set("Cookie", "refreshToken=invalid-token")
        .send({})
        .expect("Content-Type", /json/);

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty("error");
    });
  });

  describe("GET /auth/logout", () => {
    it("should logout successfully even without authentication", async () => {
      const response = await request(app.server)
        .get("/auth/logout")
        .expect("Content-Type", /json/);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("message");
      expect(response.body.message).toBe("Logged out successfully");
    });
  });
});
