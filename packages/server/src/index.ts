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
import { emailRoutes } from "./routes/email.js";
import { faqRoutes } from "./routes/faq.js";
import { gatewayRoutes } from "./routes/gateway.js";
import { proxyRoutes } from "./routes/proxy.js";
import { smsRoutes } from "./routes/sms.js";
import { termsRoutes } from "./routes/terms.js";

import { policyRoutes } from "./routes/policy";
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
    return { status: "ok", timestamp: new Date().toISOString() };
  });

  // Register routes
  await fastify.register(authRoutes);
  await fastify.register(centrifugoRoutes);
  await fastify.register(emailRoutes);
  await fastify.register(faqRoutes);
  await fastify.register(gatewayRoutes);
  await fastify.register(proxyRoutes);
  await fastify.register(smsRoutes);
  await fastify.register(termsRoutes);
  await fastify.register(policyRoutes);
  // Console log when server starts
  fastify.addHook("onReady", async () => {});
  await db.initialize();
  await redis.initialize();

  // Close resources on server shutdown
  fastify.addHook("onClose", async () => {
    await Promise.allSettled([db.close(), redis.close()]);
  });
}
