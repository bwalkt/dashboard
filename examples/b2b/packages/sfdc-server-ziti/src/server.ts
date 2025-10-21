import ziti from "@openziti/ziti-sdk-nodejs";
import Fastify from "fastify";
import app from "./index.js";

const zitiIdentityFile = "./backend-service.json";
const zitiServiceName = "my-backend-service";

const fastify = Fastify({
  logger: {
    level: "info",
  },
});

// Register the plugin
await fastify.register(app);

const startServer = async () => {
  try {
    ziti.setLogLevel(4);
    console.log("Initializing Ziti connection", zitiIdentityFile);

    // Add some debugging
    console.log("Ziti SDK version:", ziti.version);
    console.log("Ziti SDK build info:", ziti.buildInfo);

    // Initialize Ziti connection with timeout
    const zitiInit = await Promise.race([
      ziti.init(zitiIdentityFile),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Ziti initialization timeout after 30 seconds")), 30000)),
    ]).catch((err) => {
      console.error("Failed to initialize Ziti:", err);
      console.error("Error details:", err.message);
      console.error("Error stack:", err.stack);
      process.exit(1);
    });

    console.log("✓ Ziti initialized", zitiInit);
    console.log("✓ Connected to OpenZiti network");

    // Check if service is available
    const serviceAvailable = await new Promise((resolve) => {
      ziti.serviceAvailable(zitiServiceName, (status) => {
        resolve(status === 0);
      });
    });

    if (!serviceAvailable) {
      throw new Error(`Service ${zitiServiceName} is not available on the Ziti network`);
    }

    console.log(`✓ Service ${zitiServiceName} is available`);

    // Start Fastify listening on the Ziti network
    // Note: The port parameter is ignored when using Ziti
    await fastify.listen({ port: 0 }, async (err, address) => {
      if (err) {
        fastify.log.error(err);
        process.exit(1);
      }

      // Bind to Ziti service
      await ziti.listenForBindings(zitiServiceName, fastify.server);

      console.log(`✓ Fastify server bound to Ziti service: ${zitiServiceName}`);
      console.log("✓ Server is now dark (not exposed to internet)");
      console.log("✓ Only accessible via OpenZiti network");
    });
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
};

// Start the server
await startServer();

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("SIGTERM received, shutting down gracefully");
  await fastify.close();
  process.exit(0);
});
