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

export async function createTestAppWithAuth(
  mockUserId: number = 1,
): Promise<FastifyInstance> {
  const app = await createTestApp();

  // Override auth middleware to bypass authentication in tests
  app.addHook("preHandler", async (request, reply) => {
    // Skip auth bypass for auth-related routes
    if (request.url.startsWith("/auth/")) {
      return;
    }

    // Mock authenticated user for protected routes
    if (request.url.startsWith("/api/")) {
      (request as any).user = {
        id: mockUserId,
        email: "test@example.com",
        firstName: "Test",
        lastName: "User",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }
  });

  return app;
}
