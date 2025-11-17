import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import { createHash } from 'crypto';
import { isPublicPath } from './route-registry';
import { redis } from '../config/redis';
import { JWTService } from '../services/jwt.service';
import { config } from '../config/env';

// Route registry now uses declarative approach - no need to cache paths

interface HeaderValidationOptions {
  enableRateLimit?: boolean;
  enableTokenCache?: boolean;
  enableFingerprinting?: boolean;
  maxRequestsPerMinute?: number;
  tokenCacheTTL?: number;
  trustedProxies?: string[];
}

declare module 'fastify' {
  interface FastifyRequest {
    user?: {
      authenticated: boolean;
      method: string;
      token?: string;
    };
  }
}

const headerValidationPlugin: FastifyPluginAsync<HeaderValidationOptions> = async (fastify, opts) => {
  const options = {
    enableRateLimit: true,
    enableTokenCache: true,
    enableFingerprinting: false,
    maxRequestsPerMinute: 100,
    tokenCacheTTL: 300000, // 5 minutes
    trustedProxies: ['127.0.0.1', '::1'],
    ...opts
  };

  // Helper functions
  function getClientIP(request: FastifyRequest): string {
    const forwarded = request.headers['x-forwarded-for'] as string;
    if (forwarded) {
      const ips = forwarded.split(',').map(ip => ip.trim());
      return ips[0] ?? '';
    }
    
    return request.headers['x-real-ip'] as string ||
           request.ip ||
           'unknown';
  }

  async function checkRateLimit(clientIP: string): Promise<boolean> {
    const now = Date.now();
    const windowSize = 60000; // 1 minute
    const maxRequests = options.maxRequestsPerMinute!;
    const redisKey = `rate_limit:${clientIP}`;

    try {
      const existingData = await redis.get(redisKey);
      const existing = existingData ? JSON.parse(existingData) : null;
      
      if (!existing || now - existing.windowStart > windowSize) {
        const newData = { count: 1, windowStart: now };
        await redis.set(redisKey, JSON.stringify(newData), Math.ceil(windowSize / 1000));
        return true;
      }

      if (existing.count >= maxRequests) {
        return false;
      }

      existing.count++;
      await redis.set(redisKey, JSON.stringify(existing), Math.ceil((existing.windowStart + windowSize - now) / 1000));
      return true;
    } catch (error) {
      console.warn('Redis rate limit check failed, allowing request:', error);
      return true; // Fail open for availability
    }
  }

  async function validateCustomToken(token: string): Promise<boolean> {
    // Check cache first
    if (options.enableTokenCache) {
      try {
        const redisKey = `token_cache:${createHash('sha256').update(token).digest('hex').substring(0, 16)}`;
        const cachedData = await redis.get(redisKey);
        
        if (cachedData) {
          const cached = JSON.parse(cachedData);
          if (cached.expires > Date.now()) {
            return cached.valid;
          }
        }
      } catch (error) {
        console.warn('Redis token cache check failed:', error);
      }
    }

    // Validate token
    const isValid = performTokenValidation(token);

    // Cache result
    if (options.enableTokenCache) {
      try {
        const redisKey = `token_cache:${createHash('sha256').update(token).digest('hex').substring(0, 16)}`;
        const cacheData = {
          valid: isValid,
          expires: Date.now() + options.tokenCacheTTL!
        };
        await redis.set(redisKey, JSON.stringify(cacheData), Math.ceil(options.tokenCacheTTL! / 1000));
      } catch (error) {
        console.warn('Redis token cache set failed:', error);
      }
    }

    return isValid;
  }

  function performTokenValidation(token: string): boolean {
    try {
      const jwtService = new JWTService();
      
      // Verify JWT token using the JWT_SECRET from environment
      const decoded = jwtService.verifyHMACToken(token, config.JWT_SECRET);
      
      // Check if token is not expired
      const now = Math.floor(Date.now() / 1000);
      if (decoded.exp && decoded.exp < now) {
        return false;
      }
      
      return true;
    } catch (error) {
      // Invalid JWT token
      console.debug('Custom auth token validation failed:', error);
      return false;
    }
  }

  function generateFingerprint(request: FastifyRequest): string {
    const components = [
      request.headers['user-agent'] || '',
      request.headers['accept-language'] || '',
      request.headers['accept-encoding'] || '',
      request.headers['accept'] || '',
      request.headers['connection'] || '',
      request.headers['cache-control'] || '',
    ];

    const combined = components.join('|');
    return createHash('sha256').update(combined).digest('hex').substring(0, 16);
  }

  // isPublicPath is now imported from route-registry - no need for local function

  function hasValidJWTCookie(request: FastifyRequest): boolean {
    try {
      const cookieHeader = request.headers.cookie || '';
      
      // Parse cookies manually or use a cookie parser
      const cookies: { [key: string]: string } = {};
      cookieHeader.split(';').forEach(cookie => {
        const [name, value] = cookie.trim().split('=');
        if (name && value) {
          cookies[name] = decodeURIComponent(value);
        }
      });
      
      const jwtService = new JWTService();
      
      // Check accessToken first
      if (cookies.accessToken) {
        try {
          const decoded = jwtService.verifyHMACToken(cookies.accessToken, config.JWT_SECRET);
          const now = Math.floor(Date.now() / 1000);
          if (!decoded.exp || decoded.exp > now) {
            return true;
          }
        } catch (error) {
          console.debug('Access token validation failed:', error);
        }
      }
      
      // Fallback to refreshToken if accessToken is invalid/missing
      if (cookies.refreshToken) {
        try {
          const decoded = jwtService.verifyHMACToken(cookies.refreshToken, config.JWT_SECRET);
          const now = Math.floor(Date.now() / 1000);
          if (!decoded.exp || decoded.exp > now) {
            return true;
          }
        } catch (error) {
          console.debug('Refresh token validation failed:', error);
        }
      }
      
      return false;
    } catch (error) {
      console.debug('Cookie parsing failed:', error);
      return false;
    }
  }

  function isSuspiciousBot(request: FastifyRequest): boolean {
    const userAgent = (request.headers['user-agent'] || '').toLowerCase();
    const suspiciousPatterns = ['bot', 'spider', 'crawler', 'scraper', 'curl', 'wget'];
    return suspiciousPatterns.some(pattern => userAgent.includes(pattern));
  }

  // Register the validation hook
  fastify.addHook('preHandler', async (request: FastifyRequest, reply: FastifyReply) => {
    const startTime = Date.now();

    // Extract client information
    const clientIP = getClientIP(request);
    const userAgent = request.headers['user-agent'] || '';
    
    // Generate request fingerprint
    let fingerprint = '';
    if (options.enableFingerprinting) {
      fingerprint = generateFingerprint(request);
      request.headers['x-server-fingerprint'] = fingerprint;
    }

    // Rate limiting
    if (options.enableRateLimit && !(await checkRateLimit(clientIP))) {
      return reply.status(429).send({ 
        error: 'Rate limit exceeded',
        retryAfter: 60 
      });
    }

    // Custom header validation
    const customAuth = request.headers['x-custom-auth'] as string;
    if (customAuth) {
      const isValid = await validateCustomToken(customAuth);
      
      if (isValid) {
        // Add response headers for successful validation
        reply.header('x-auth-validated', 'true');
        reply.header('x-validation-method', 'custom-header');
        reply.header('x-validation-timestamp', Date.now().toString());
        
        if (fingerprint) {
          reply.header('x-client-fingerprint', fingerprint);
        }
        
        request.user = { 
          authenticated: true, 
          method: 'custom-header',
          token: customAuth.substring(0, 8) + '...' 
        };
        
        return; // Continue to handler
      } else {
        return reply.status(401).send({ error: 'Invalid custom auth token' });
      }
    }

    // Check for public paths (no auth required)
    if (isPublicPath(request.url)) {
      return; // Continue to handler
    }

    // JWT cookie fallback
    if (hasValidJWTCookie(request)) {
      reply.header('x-auth-validated', 'true');
      reply.header('x-validation-method', 'jwt-cookie');
      request.user = { authenticated: true, method: 'jwt-cookie' };
      return; // Continue to handler
    }

    // Bot detection
    if (isSuspiciousBot(request)) {
      return reply.status(403).send({ 
        error: 'Suspicious bot detected',
        reason: 'user-agent-pattern' 
      });
    }

    // No valid authentication found
    return reply.status(401).send({ 
      error: 'Authentication required',
      supportedMethods: ['x-custom-auth', 'jwt-cookie'] 
    });
  });

  // Redis handles TTL automatically, so no cleanup needed
  // Clean up on close
  fastify.addHook('onClose', async () => {
    // Redis cleanup is handled by TTL
  });
};

export default fp(headerValidationPlugin, {
  fastify: '>=4.0.0 <6.0.0',
  name: 'header-validation'
});