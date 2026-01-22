import { centrifugeServer } from "./server.js";

async function startCentrifugeApp(): Promise<void> {
  try {
    console.log("🚀 Starting Centrifuge application...");

    // Handle graceful shutdown
    const gracefulShutdown = async (signal: string) => {
      console.log(
        `\n📡 Received ${signal}. Shutting down Centrifuge gracefully...`,
      );
      try {
        await centrifugeServer.stop();
        console.log("✅ Centrifuge server stopped successfully");
        process.exit(0);
      } catch (error) {
        console.error("❌ Error during Centrifuge shutdown:", error);
        process.exit(1);
      }
    };

    // Register signal handlers
    process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
    process.on("SIGINT", () => gracefulShutdown("SIGINT"));

    // Handle uncaught errors
    process.on("uncaughtException", (error) => {
      console.error("💥 Uncaught exception in Centrifuge app:", error);
      process.exit(1);
    });

    process.on("unhandledRejection", (reason, promise) => {
      console.error(
        "💥 Unhandled rejection in Centrifuge app:",
        reason,
        "at",
        promise,
      );
      process.exit(1);
    });

    // Start the server
    await centrifugeServer.start();

    console.log("🎉 Centrifuge application started successfully!");
    console.log("📊 Server metrics:");
    console.log("  - gRPC server running for Envoy ext_proc");
    console.log("  - Ready to proxy authentication to Centrifugo");
  } catch (error) {
    console.error("❌ Failed to start Centrifuge application:", error);
    process.exit(1);
  }
}

// Start the application
if (import.meta.url === `file://${process.argv[1]}`) {
  startCentrifugeApp();
}
