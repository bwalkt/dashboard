import Fastify from "fastify";
import { config } from "./config/env.js";
import app from "./index.js";

const fastify = Fastify({ logger: { level: "info" } });

await fastify.register(app);

try {
  await fastify.listen({ port: config.PORT, host: "0.0.0.0" });
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}
