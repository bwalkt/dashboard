import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import type { FastifyInstance, FastifyPluginOptions } from "fastify";
import { validateEnvironment } from "./config/env.js";
import { authRoutes } from "./routes/auth.js";
import { salesforceRoutes } from "./routes/salesforce.js";

// Export a function that returns a Fastify instance
export default async function (fastify: FastifyInstance, opts: FastifyPluginOptions): Promise<void> {
  // Validate environment variables
  validateEnvironment();

  // Register CORS plugin
  await fastify.register(cors, {
    origin: true, // Allow all origins in development - you can restrict this in production
    credentials: true, // Allow credentials (cookies, authorization headers)
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept", "x-client-type"],
    exposedHeaders: ["Content-Range", "X-Content-Range"],
    maxAge: 86400, // Cache preflight response for 1 day
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });

  // Register cookie plugin for OAuth state management
  await fastify.register(cookie, {
    secret: process.env.JWT_SECRET || "default-cookie-secret",
  });

  // Console log when server starts
  fastify.addHook("onReady", async () => {});

  // Register authentication routes
  await fastify.register(authRoutes);

  // Register Salesforce routes
  await fastify.register(salesforceRoutes);
}
