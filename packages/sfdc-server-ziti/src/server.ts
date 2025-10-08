import Fastify from "fastify";
import app from "./index.js";

const fastify = Fastify({
  logger: {
    level: "info",
  },
});

// Register the plugin
await fastify.register(app);

// Start the server
try {
  const port = parseInt(process.env.PORT || "8081", 10);
  await fastify.listen({ port, host: "0.0.0.0" });
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}
