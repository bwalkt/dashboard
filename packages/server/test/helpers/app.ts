import Fastify, { FastifyInstance } from "fastify";
import appPlugin from "../../src/index";

export async function createTestApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: false, // Disable logging in tests
  });

  // Register the main app plugin
  await app.register(appPlugin);

  return app;
}

export async function createTestAppWithAuth(): Promise<FastifyInstance> {
  // Create app with auth middleware enabled for testing authenticated endpoints
  const app = await createTestApp();
  return app;
}
