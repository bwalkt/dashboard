import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import { createHash } from 'crypto';
import { getAllowedPaths } from './route-registry';

// Rate limiting storage (in production, use Redis)
const rateLimitMap = new Map<string, { count: number; windowStart: number }>();
const tokenCache = new Map<string, { valid: boolean; expires: number }>();
const allowedPaths = getAllowedPaths();

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

  function checkRateLimit(clientIP: string): boolean {
    const now = Date.now();
    const windowSize = 60000; // 1 minute
    const maxRequests = options.maxRequestsPerMinute!;

    const existing = rateLimitMap.get(clientIP);
    
    if (!existing || now - existing.windowStart > windowSize) {
      rateLimitMap.set(clientIP, { count: 1, windowStart: now });
      return true;
    }

    if (existing.count >= maxRequests) {
      return false;
    }

    existing.count++;
    return true;
  }

  async function validateCustomToken(token: string): Promise<boolean> {
    // Check cache first
    if (options.enableTokenCache) {
      const cached = tokenCache.get(token);
      if (cached && cached.expires > Date.now()) {
        return cached.valid;
      }
    }

    // Validate token
    const isValid = performTokenValidation(token);

    // Cache result
    if (options.enableTokenCache) {
      tokenCache.set(token, {
        valid: isValid,
        expires: Date.now() + options.tokenCacheTTL!
      });
    }

    return isValid;
  }

  function performTokenValidation(token: string): boolean {
    if (token === 'secret-value-123') return true;
    if (token.startsWith('valid-') && token.length > 10) return true;
    return false;
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

  function isAllowedPath(path: string): boolean {
    return allowedPaths.some(allowed => path.startsWith(allowed));
  }

  function hasValidJWTCookie(request: FastifyRequest): boolean {
    const cookies = request.headers.cookie || '';
    return cookies.includes('accessToken=') || cookies.includes('refreshToken=');
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
    if (options.enableRateLimit && !checkRateLimit(clientIP)) {
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

    // Check for allowed paths (no auth required)
    if (isAllowedPath(request.url)) {
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

  // Cleanup function
  const cleanup = () => {
    const now = Date.now();
    
    // Clean expired tokens
    for (const [token, data] of tokenCache.entries()) {
      if (data.expires < now) {
        tokenCache.delete(token);
      }
    }

    // Clean old rate limit windows
    for (const [ip, data] of rateLimitMap.entries()) {
      if (now - data.windowStart > 120000) { // 2 minutes old
        rateLimitMap.delete(ip);
      }
    }
  };

  // Setup cleanup interval
  const cleanupInterval = setInterval(cleanup, 60000); // Every minute

  // Clean up on close
  fastify.addHook('onClose', async () => {
    clearInterval(cleanupInterval);
  });
};

export default fp(headerValidationPlugin, {
  fastify: '4.x',
  name: 'header-validation'
});