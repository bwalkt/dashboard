import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import helmet from '@fastify/helmet';
import fastifyStatic from "@fastify/static";
import type { FastifyInstance, FastifyPluginOptions } from "fastify";
import { db } from "./config/database";
import { validateEnvironment } from "./config/env";
import { redis } from "./config/redis";
import { authRoutes } from "./routes/auth";
import { emailRoutes } from "./routes/email";
import { proxyRoutes } from "./routes/proxy";

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
    origin: true, // Allow all origins in development - you can restrict this in production
    credentials: true, // Allow credentials (cookies, authorization headers)
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "Accept",
      "traceparent",
      "x-client-type",
      "x-auth-token",
      "tracestate",
    ],
    exposedHeaders: ["Content-Range", "X-Content-Range"],
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
    secret: process.env.JWT_SECRET || "default-cookie-secret",
  });

  // Register static file serving for assets (logo, etc.)
  const sharedAssetsPath = join(__dirname, "../../shared/src/assets");
  await fastify.register(fastifyStatic, {
    root: sharedAssetsPath,
    prefix: "/assets/",
    decorateReply: false,
  });

  // Register routes
  await fastify.register(authRoutes);
  await fastify.register(emailRoutes);
  await fastify.register(proxyRoutes);

  // Console log when server starts
  fastify.addHook("onReady", async () => {});
  await db.initialize();
  await redis.initialize();

  // Close resources on server shutdown
  fastify.addHook("onClose", async () => {
    await Promise.allSettled([db.close(), redis.close()]);
  });
}
