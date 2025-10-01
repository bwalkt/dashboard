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
  await fastify.listen({ port: 8080, host: "0.0.0.0" });
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}
