import Fastify, { FastifyInstance } from 'fastify';
import helmet from '@fastify/helmet';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import rateLimit from '@fastify/rate-limit';

// Import our custom plugins and routes
import headerValidationPlugin from './plugins/header-validation';
import loggingRoutes from './routes/logging';

const PORT = parseInt(process.env.PORT || '8090');
const HOST = process.env.HOST || '0.0.0.0';

const build = async (): Promise<FastifyInstance> => {
  const fastify = Fastify({
    logger: {
      level: process.env.LOG_LEVEL || 'info',
      transport: process.env.NODE_ENV === 'development' ? {
        target: 'pino-pretty',
        options: {
          translateTime: 'HH:MM:ss Z',
          ignore: 'pid,hostname',
        },
      } : undefined,
    }
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

  await fastify.register(cors, {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true,
  });

  // Cookie support
  await fastify.register(cookie, {
    secret: process.env.COOKIE_SECRET || 'your-cookie-secret'
  });

  // Global rate limiting (backup to our custom validation)
  await fastify.register(rateLimit, {
    max: 1000,
    timeWindow: '1 minute',
    skipOnError: true,
  });

  // Conditional header validation plugin
  const useHeaderValidation = process.env.ENABLE_HEADER_VALIDATION !== 'false';
  if (useHeaderValidation) {
    fastify.log.info('🔒 Header validation enabled');
    await fastify.register(headerValidationPlugin, {
      enableRateLimit: true,
      enableTokenCache: true,
      enableFingerprinting: true,
      maxRequestsPerMinute: parseInt(process.env.MAX_REQUESTS_PER_MINUTE || '100')
    });
  } else {
    fastify.log.info('⚠️  Header validation disabled');
  }

  // Register logging routes (for Envoy async communication)
  await fastify.register(loggingRoutes, { prefix: '/internal' });

  // Health check route (always accessible)
  fastify.get('/health', async (request, reply) => {
    return {
      status: 'ok',
      timestamp: Date.now(),
      uptime: process.uptime(),
      env: process.env.NODE_ENV || 'development',
      headerValidation: useHeaderValidation,
      memory: process.memoryUsage(),
      fastify: {
        version: fastify.version,
        plugins: fastify.printPlugins()
      }
    };
  });

  // Test endpoint
  fastify.get('/api/test', async (request, reply) => {
    const user = request.user || { authenticated: false };
    
    return {
      message: 'Hello from Fastify server!',
      authenticated: user.authenticated,
      authMethod: user.method,
      timestamp: Date.now(),
      headers: {
        userAgent: request.headers['user-agent'],
        customAuth: request.headers['x-custom-auth'] ? '***' : undefined,
        fingerprint: request.headers['x-server-fingerprint']
      },
      fastify: {
        version: fastify.version,
        uptime: process.uptime()
      }
    };
  });

  // Protected endpoint
  fastify.get('/api/protected', {
    preHandler: async (request, reply) => {
      if (!request.user?.authenticated) {
        return reply.status(401).send({ error: 'Authentication required' });
      }
    }
  }, async (request, reply) => {
    return {
      message: 'This is protected data',
      user: request.user,
      timestamp: Date.now(),
      serverInfo: {
        version: fastify.version,
        uptime: process.uptime(),
        memory: process.memoryUsage()
      }
    };
  });

  // Auth routes (always accessible)
  fastify.post('/auth/login', {
    schema: {
      body: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 1 }
        }
      }
    }
  }, async (request, reply) => {
    const { email, password } = request.body as { email: string; password: string };
    
    // Mock authentication
    if (email === 'test@example.com' && password === 'password') {
      reply.setCookie('accessToken', 'mock-jwt-token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 3600000 // 1 hour
      });
      
      return { success: true, user: { email } };
    } else {
      return reply.status(401).send({ error: 'Invalid credentials' });
    }
  });

  fastify.post('/auth/logout', async (request, reply) => {
    reply.clearCookie('accessToken');
    return { success: true };
  });

  // Metrics endpoint
  fastify.get('/metrics', async (request, reply) => {
    const memUsage = process.memoryUsage();
    
    return {
      uptime: process.uptime(),
      memory: {
        rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
        heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
        external: `${Math.round(memUsage.external / 1024 / 1024)}MB`,
      },
      env: process.env.NODE_ENV,
      nodeVersion: process.version,
      fastify: {
        version: fastify.version,
        plugins: fastify.printPlugins()
      },
      headerValidation: useHeaderValidation,
      performance: {
        requestsPerSecond: 'Use load testing to measure',
        avgResponseTime: 'Use monitoring to track'
      }
    };
  });

  // 404 handler
  fastify.setNotFoundHandler(async (request, reply) => {
    return reply.status(404).send({
      error: 'Not found',
      path: request.url,
      method: request.method,
      timestamp: Date.now()
    });
  });

  // Error handler
  fastify.setErrorHandler(async (error, request, reply) => {
    fastify.log.error(error);
    
    const response: any = {
      error: 'Internal server error',
      statusCode: error.statusCode || 500,
      timestamp: Date.now(),
      path: request.url,
      method: request.method
    };

    if (process.env.NODE_ENV === 'development') {
      response.stack = error.stack;
      response.details = error.message;
    }

    return reply.status(error.statusCode || 500).send(response);
  });

  return fastify;
};

// Start server if this file is run directly
if (require.main === module) {
  const start = async () => {
    try {
      const fastify = await build();
      await fastify.listen({ port: PORT, host: HOST });
      fastify.log.info(`🚀 Fastify server running on http://${HOST}:${PORT}`);
      fastify.log.info(`📊 Metrics: http://${HOST}:${PORT}/metrics`);
      fastify.log.info(`❤️  Health: http://${HOST}:${PORT}/health`);
      fastify.log.info(`🔧 Test endpoint: http://${HOST}:${PORT}/api/test`);
      fastify.log.info(`🔒 Auth endpoint: http://${HOST}:${PORT}/auth/login`);
    } catch (err) {
      console.error('Error starting server:', err);
      process.exit(1);
    }
  };

  start();
}

export default build;