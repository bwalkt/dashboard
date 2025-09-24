import { type FastifyInstance, type FastifyPluginOptions } from "fastify";
import cors from "@fastify/cors";
import { salesforceRoutes } from "./routes/salesforce.js";

// Export a function that returns a Fastify instance
export default async function (fastify: FastifyInstance, opts: FastifyPluginOptions): Promise<void> {
  // Register CORS plugin
  await fastify.register(cors, {
    origin: true, // Allow all origins in development
    credentials: true, // Allow credentials (cookies, authorization headers)
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  });

  // Console log when server starts
  fastify.addHook("onReady", async () => {
    console.log("🚀 Server is running on http://localhost:8080");
    console.log("📊 Salesforce integration available at /salesforce/*");
  });

  // Register Salesforce routes
  await fastify.register(salesforceRoutes);

  // Declare a route
  fastify.get("/", async () => {
    return {
      message: "Hello World",
    };
  });
}
