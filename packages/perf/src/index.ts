import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import cors from "@fastify/cors";
import fastifyStatic from "@fastify/static";
import type { FastifyInstance, FastifyPluginOptions } from "fastify";
import k6Routes from "./routes/k6.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default async function app(
  fastify: FastifyInstance,
  _opts: FastifyPluginOptions
): Promise<void> {
  await fastify.register(cors, { origin: true });
  await fastify.register(k6Routes);

  const uiDist = join(__dirname, "..", "ui", "dist");
  await fastify.register(fastifyStatic, {
    root: uiDist,
    prefix: "/",
  });
  fastify.setNotFoundHandler((request, reply) => {
    if (request.method === "GET") {
      return reply.sendFile("index.html");
    }
    return reply.code(404).send();
  });
}
