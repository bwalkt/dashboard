import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import fastifyStatic from "@fastify/static";
import type { FastifyInstance, FastifyPluginOptions } from "fastify";
import { db } from "./config/database.js";
import { config, validateEnvironment } from "./config/env.js";
import { redis } from "./config/redis.js";
import headerValidationPlugin from "./middleware/header-validation.js";
import { authRoutes } from "./routes/auth.js";
import { centrifugoRoutes } from "./routes/centrifugo.js";
import { deviceRoutes } from "./routes/devices.js";
import { emailRoutes } from "./routes/email.js";
import { faqRoutes } from "./routes/faq.js";
import { gatewayRoutes } from "./routes/gateway.js";
import { orgRoutes } from "./routes/orgs.js";
import { privacyRoutes } from "./routes/privacy.js";
import { proxyRoutes } from "./routes/proxy.js";
import { proxyTargetsRoutes } from "./routes/proxy-targets.js";
import { signozRoutes } from "./routes/signoz.js";
import { smsRoutes } from "./routes/sms.js";
import { termsRoutes } from "./routes/terms.js";
import { refreshProxyTargetsCache } from "./services/proxy-targets-cache.service.js";
import { userRoutes } from "./routes/users.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Export a function that returns a Fastify instance
export default async function (
  fastify: FastifyInstance,
  opts: FastifyPluginOptions,
): Promise<void> {
  // Validate environment variables
  validateEnvironment();

  // Initialize database and Redis
  await db.initialize();
  await redis.initialize();

  // Load proxy targets into Redis cache on startup
  try {
    await refreshProxyTargetsCache();
  } catch (error) {
    console.warn(
      "⚠️  Failed to load proxy targets cache on startup:",
      error instanceof Error ? error.message : error,
    );
    console.warn("Server will continue, but proxy targets may not be available until cache is refreshed");
  }

  // Register CORS plugin
  await fastify.register(cors, {
    origin: config.CORS_ALLOWED_ORIGINS, // Allow all origins in development - you can restrict this in production
    credentials: true, // Allow credentials (cookies, authorization headers)
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: config.CORS_ALLOWED_HEADERS,
    exposedHeaders: config.CORS_EXPOSED_HEADERS,
    maxAge: 86400, // Cache preflight response for 1 day
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });
  // Security plugins
  await fastify.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
  });

  // Register cookie plugin for OAuth state management
  await fastify.register(cookie, {
    secret: config.JWT_SECRET,
  });

  // Register header validation plugin
  await fastify.register(headerValidationPlugin);

  // Register static file serving for assets (logo, etc.)
  const assetsPath = join(__dirname, "assets");
  await fastify.register(fastifyStatic, {
    root: assetsPath,
    prefix: "/assets/",
    decorateReply: false,
  });

  // Health check route
  fastify.get("/health", async (request, reply) => {
    const timestamp = new Date().toISOString();
    const healthCheck = {
      status: "ok",
      timestamp,
      uptime: process.uptime(),
      services: {
        database: "unknown",
        redis: "unknown",
      },
      version: process.env.npm_package_version || "unknown",
      environment: process.env.NODE_ENV || "development",
      memory: {
        nodejs: {
          used: process.memoryUsage().heapUsed,
          total: process.memoryUsage().heapTotal,
          external: process.memoryUsage().external,
        },
        database: null as any,
        redis: null as any,
      },
    };

    // Check database connection and get memory info
    try {
      await db.healthCheck();
      healthCheck.services.database = "healthy";
      
      try {
        healthCheck.memory.database = await db.getMemoryInfo();
      } catch (memError) {
        console.warn("Failed to get database memory info:", memError);
        healthCheck.memory.database = { error: "Unable to retrieve memory info" };
      }
    } catch (error) {
      healthCheck.services.database = "unhealthy";
      if (config.NODE_ENV !== "test") {
        healthCheck.status = "degraded";
      }
      healthCheck.memory.database = { error: "Database unavailable" };
    }

    // Check Redis connection and get memory info
    try {
      await redis.ping();
      healthCheck.services.redis = "healthy";
      
      try {
        if (typeof redis.getMemoryInfo === 'function') {
          healthCheck.memory.redis = await redis.getMemoryInfo();
        } else {
          healthCheck.memory.redis = { info: "Memory info not available in test environment" };
        }
      } catch (memError) {
        console.warn("Failed to get Redis memory info:", memError);
        healthCheck.memory.redis = { error: "Unable to retrieve memory info" };
      }
    } catch (error) {
      healthCheck.services.redis = "unhealthy";
      if (config.NODE_ENV !== "test") {
        healthCheck.status = "degraded";
      }
      healthCheck.memory.redis = { error: "Redis unavailable" };
    }

    // Set appropriate HTTP status code
    const statusCode = healthCheck.status === "ok" ? 200 : 503;
    reply.code(statusCode);

    return healthCheck;
  });

  // Register routes
  await fastify.register(authRoutes);
  await fastify.register(centrifugoRoutes);
  await fastify.register(deviceRoutes);
  await fastify.register(emailRoutes);
  await fastify.register(faqRoutes);
  await fastify.register(gatewayRoutes);
  await fastify.register(orgRoutes);
  await fastify.register(proxyRoutes);
  await fastify.register(proxyTargetsRoutes);
  await fastify.register(signozRoutes);
  await fastify.register(smsRoutes);
  await fastify.register(termsRoutes);
  await fastify.register(userRoutes);
  await fastify.register(privacyRoutes);

  // Close resources on server shutdown
  fastify.addHook("onClose", async () => {
    await Promise.allSettled([db.close(), redis.close()]);
  });
}
