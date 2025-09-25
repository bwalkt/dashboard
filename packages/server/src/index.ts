import { type FastifyInstance, type FastifyPluginOptions } from "fastify";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import { salesforceRoutes } from "./routes/salesforce.js";
import { authRoutes } from "./routes/auth.js";
import { validateEnvironment } from "./config/env.js";

// Export a function that returns a Fastify instance
export default async function (fastify: FastifyInstance, opts: FastifyPluginOptions): Promise<void> {
  // Validate environment variables
  validateEnvironment();

  // Register CORS plugin
  await fastify.register(cors, {
    origin: true, // Allow all origins in development
    credentials: true, // Allow credentials (cookies, authorization headers)
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  });

  // Register cookie plugin for OAuth state management
  await fastify.register(cookie, {
    secret: process.env.JWT_SECRET || "default-cookie-secret",
  });

  // Console log when server starts
  fastify.addHook("onReady", async () => {
    console.log("🚀 Server is running on http://localhost:8080");
  });

  // Register authentication routes
  await fastify.register(authRoutes);

  // Register Salesforce routes
  await fastify.register(salesforceRoutes);
}
