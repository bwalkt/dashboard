import { type FastifyInstance, type FastifyPluginOptions } from "fastify";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import { salesforceRoutes } from "./routes/salesforce.js";
import { authRoutes } from "./routes/auth.js";
import { validateEnvironment } from "./config/env.js";
import { validateOpenZitiEnvironment } from "./config/openziti.js";
import { OpenZitiService } from "./services/openziti.service.js";
import {
  createOpenZitiAuthMiddleware,
  openzitiMonitoringMiddleware,
  openzitiHealthCheckMiddleware,
  createOpenZitiCleanupMiddleware,
} from "./middleware/openziti.js";

// Export a function that returns a Fastify instance
export default async function (fastify: FastifyInstance, opts: FastifyPluginOptions): Promise<void> {
  // Validate environment variables
  validateEnvironment();

  // Validate OpenZiti configuration
  const openzitiConfig = validateOpenZitiEnvironment();

  // Initialize OpenZiti service
  const openzitiService = new OpenZitiService(openzitiConfig);

  // Register CORS plugin
  await fastify.register(cors, {
    origin: true, // Allow all origins in development
    credentials: true, // Allow credentials (cookies, authorization headers)
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "X-OpenZiti-Connection-Id", "X-OpenZiti-Service"],
  });

  // Register cookie plugin for OAuth state management
  await fastify.register(cookie, {
    secret: process.env.JWT_SECRET || "default-cookie-secret",
  });

  // Add OpenZiti monitoring middleware to all routes
  fastify.addHook("preHandler", async (request, reply) => {
    await openzitiMonitoringMiddleware(request, reply, openzitiService);
  });

  // Add OpenZiti cleanup middleware
  const cleanupMiddleware = createOpenZitiCleanupMiddleware(openzitiService);
  fastify.addHook("onRequest", cleanupMiddleware);

  // Console log when server starts
  fastify.addHook("onReady", async () => {
    console.log("Server is ready");

    // Start OpenZiti service
    if (openzitiConfig.enabled) {
      try {
        await openzitiService.start();
        console.log("OpenZiti service started successfully");
      } catch (error) {
        console.error("Failed to start OpenZiti service:", error);
      }
    }
  });

  // Add OpenZiti health check endpoint
  fastify.get("/health/openziti", async (request, reply) => {
    await openzitiHealthCheckMiddleware(request, reply, openzitiService);
  });

  // Register authentication routes with OpenZiti middleware
  await fastify.register(authRoutes, {
    preHandler: createOpenZitiAuthMiddleware({
      openzitiService,
      config: openzitiConfig,
      requireSecureConnection: false, // Allow non-OpenZiti connections for auth
      allowedServices: ["sfdc-api-server", "auth-service"],
    }),
  });

  // Register Salesforce routes with OpenZiti middleware
  await fastify.register(salesforceRoutes, {
    preHandler: createOpenZitiAuthMiddleware({
      openzitiService,
      config: openzitiConfig,
      requireSecureConnection: openzitiConfig.enabled, // Require OpenZiti when enabled
      allowedServices: ["sfdc-api-server"],
    }),
  });

  // Graceful shutdown handling
  fastify.addHook("onClose", async () => {
    console.log("Server is shutting down...");
    if (openzitiConfig.enabled) {
      try {
        await openzitiService.stop();
        console.log("OpenZiti service stopped");
      } catch (error) {
        console.error("Error stopping OpenZiti service:", error);
      }
    }
  });
}
