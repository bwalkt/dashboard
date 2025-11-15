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

  // 🎯 CONDITIONAL HEADER VALIDATION LOGIC
  const useEnvoy = process.env.USE_ENVOY === 'true';
  const useHeaderValidation = process.env.ENABLE_HEADER_VALIDATION !== 'false';
  
  if (useEnvoy) {
    fastify.log.info('🌐 Running behind Envoy - header validation disabled in Fastify');
    
    // When behind Envoy, create a hook to read headers that Envoy added
    fastify.addHook('preHandler', async (request, reply) => {
      // Check if Envoy already validated and added headers
      const envoyValidated = request.headers['x-auth-validated'];
      const validationMethod = request.headers['x-validation-method'];
      
      if (envoyValidated === 'true') {
        // Envoy already validated - populate request.user
        request.user = {
          authenticated: true,
          method: validationMethod as string || 'envoy-validated',
          token: 'validated-by-envoy'
        };
      }
    });
    
  } else if (useHeaderValidation) {
    fastify.log.info('🔒 Header validation enabled in Fastify (no Envoy)');
    
    await fastify.register(headerValidationPlugin, {
      enableRateLimit: true,
      enableTokenCache: true,
      enableFingerprinting: true,
      maxRequestsPerMinute: parseInt(process.env.MAX_REQUESTS_PER_MINUTE || '100')
    });
    
  } else {
    fastify.log.info('⚠️  No header validation enabled');
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
      configuration: {
        useEnvoy,
        headerValidation: useHeaderValidation && !useEnvoy,
        envoyHeaders: useEnvoy ? {
          authValidated: request.headers['x-auth-validated'],
          validationMethod: request.headers['x-validation-method']
        } : undefined
      },
      memory: process.memoryUsage()
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
      configuration: {
        useEnvoy,
        headerValidation: useHeaderValidation && !useEnvoy
      },
      headers: {
        userAgent: request.headers['user-agent'],
        customAuth: request.headers['x-custom-auth'] ? '***' : undefined,
        fingerprint: request.headers['x-server-fingerprint'],
        // Show Envoy headers if present
        envoyValidated: request.headers['x-auth-validated'],
        envoyMethod: request.headers['x-validation-method'],
        envoyTimestamp: request.headers['x-validation-timestamp']
      }
    };
  });

  // Protected endpoint with conditional auth check
  fastify.get('/api/protected', {
    preHandler: async (request, reply) => {
      const user = request.user;
      
      if (useEnvoy) {
        // When using Envoy, check if Envoy validated the request
        const envoyValidated = request.headers['x-auth-validated'];
        if (envoyValidated !== 'true' && (!user || !user.authenticated)) {
          return reply.status(401).send({ 
            error: 'Authentication required',
            note: 'Envoy should have validated this request'
          });
        }
      } else {
        // When not using Envoy, check Fastify validation
        if (!user?.authenticated) {
          return reply.status(401).send({ 
            error: 'Authentication required',
            note: 'Fastify validation failed'
          });
        }
      }
    }
  }, async (request, reply) => {
    return {
      message: 'This is protected data',
      user: request.user,
      timestamp: Date.now(),
      validatedBy: useEnvoy ? 'envoy' : 'fastify',
      headers: useEnvoy ? {
        envoyValidated: request.headers['x-auth-validated'],
        envoyMethod: request.headers['x-validation-method'],
        envoyTimestamp: request.headers['x-validation-timestamp']
      } : undefined
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
      
      return { 
        success: true, 
        user: { email },
        validatedBy: useEnvoy ? 'envoy+fastify' : 'fastify'
      };
    } else {
      return reply.status(401).send({ error: 'Invalid credentials' });
    }
  });

  fastify.post('/auth/logout', async (request, reply) => {
    reply.clearCookie('accessToken');
    return { success: true };
  });

  // Configuration endpoint
  fastify.get('/config', async (request, reply) => {
    return {
      architecture: useEnvoy ? 'envoy+fastify' : 'fastify-only',
      headerValidation: {
        enabled: useHeaderValidation && !useEnvoy,
        handledBy: useEnvoy ? 'envoy-wasm-filter' : 'fastify-plugin'
      },
      environment: {
        USE_ENVOY: useEnvoy,
        ENABLE_HEADER_VALIDATION: useHeaderValidation,
        NODE_ENV: process.env.NODE_ENV
      }
    };
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
        version: fastify.version
      },
      configuration: {
        useEnvoy,
        headerValidation: useHeaderValidation && !useEnvoy,
        architecture: useEnvoy ? 'envoy+fastify' : 'fastify-only'
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
      
      const useEnvoy = process.env.USE_ENVOY === 'true';
      const useHeaderValidation = process.env.ENABLE_HEADER_VALIDATION !== 'false';
      
      fastify.log.info(`🚀 Fastify server running on http://${HOST}:${PORT}`);
      fastify.log.info(`📊 Architecture: ${useEnvoy ? 'Envoy + Fastify' : 'Fastify Only'}`);
      fastify.log.info(`🔒 Header validation: ${useEnvoy ? 'Envoy Wasm Filter' : (useHeaderValidation ? 'Fastify Plugin' : 'Disabled')}`);
      fastify.log.info(`📋 Config: http://${HOST}:${PORT}/config`);
      fastify.log.info(`❤️  Health: http://${HOST}:${PORT}/health`);
    } catch (err) {
      console.error('Error starting server:', err);
      process.exit(1);
    }
  };

  start();
}

export default build;