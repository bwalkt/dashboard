import { FastifyRequest, FastifyReply } from 'fastify';
import { FingerprintEngine } from './engine';
import { FingerprintStore } from './storage/fingerprint-store';
import { FingerprintResult } from './types';

/**
 * Fingerprint Middleware
 *
 * Standalone middleware for fingerprinting requests
 * Use this if you don't want to use the full plugin
 *
 * Usage:
 * ```typescript
 * import { createFingerprintMiddleware } from './fingerprinting/middleware';
 *
 * const fpMiddleware = createFingerprintMiddleware(fastify, {
 *   storeFingerprints: true,
 *   blockBots: false,
 *   blockHighRisk: false,
 * });
 *
 * fastify.addHook('onRequest', fpMiddleware);
 * ```
 */

export interface MiddlewareOptions {
  storeFingerprints?: boolean;
  blockBots?: boolean;
  blockHighRisk?: boolean;
  riskThreshold?: number;
  onFingerprint?: (req: FastifyRequest, result: FingerprintResult) => void | Promise<void>;
  onBlock?: (req: FastifyRequest, result: FingerprintResult, reason: string) => void | Promise<void>;
}

export function createFingerprintMiddleware(
  fastify: any,
  options: MiddlewareOptions = {}
) {
  const {
    storeFingerprints = true,
    blockBots = false,
    blockHighRisk = false,
    riskThreshold = 85,
    onFingerprint,
    onBlock,
  } = options;

  const engine = new FingerprintEngine();
  const store = storeFingerprints ? new FingerprintStore(fastify) : null;

  return async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      // Generate fingerprint
      const result = await engine.generate(req);

      // Attach to request
      req.fingerprint = result;
      req.visitorId = result.visitorId;

      // Store if enabled
      if (store) {
        const sessionId = (req.cookies as any)?.sessionId || req.id;
        await store.store(result, sessionId);
      }

      // Call custom handler
      if (onFingerprint) {
        await onFingerprint(req, result);
      }

      // Check if should block
      let shouldBlock = false;
      let blockReason = '';

      if (blockBots && result.intelligence.bot.isBot) {
        shouldBlock = true;
        blockReason = `Bot detected: ${result.intelligence.bot.type}`;
      }

      if (blockHighRisk && result.intelligence.risk.score >= riskThreshold) {
        shouldBlock = true;
        blockReason = `High risk score: ${result.intelligence.risk.score}`;
      }

      if (shouldBlock) {
        // Call custom block handler
        if (onBlock) {
          await onBlock(req, result, blockReason);
        }

        // Log block
        fastify.log.warn({
          visitorId: result.visitorId,
          ip: result.components.network.ip,
          reason: blockReason,
          path: req.url,
        }, 'Request blocked by fingerprint middleware');

        // Return 403
        return reply.status(403).send({
          error: 'Forbidden',
          message: 'Access denied',
          code: 'FINGERPRINT_BLOCKED',
        });
      }

    } catch (error) {
      // Don't fail requests due to fingerprinting errors
      fastify.log.error({ error, url: req.url }, 'Fingerprinting middleware error');
    }
  };
}

/**
 * Rate limiting middleware based on fingerprint
 */
export function createFingerprintRateLimiter(
  options: {
    maxRequests: number;
    windowMs: number;
    keyBy?: 'visitorId' | 'ip' | 'both';
  }
) {
  const { maxRequests, windowMs, keyBy = 'visitorId' } = options;
  const requests = new Map<string, number[]>();

  return async (req: FastifyRequest, reply: FastifyReply) => {
    if (!req.fingerprint) {
      // Fingerprint must be generated first
      return;
    }

    const now = Date.now();
    let key: string;

    if (keyBy === 'visitorId') {
      key = req.visitorId!;
    } else if (keyBy === 'ip') {
      key = req.fingerprint.components.network.ip;
    } else {
      key = `${req.visitorId}:${req.fingerprint.components.network.ip}`;
    }

    // Get request timestamps for this key
    let timestamps = requests.get(key) || [];

    // Remove expired timestamps
    timestamps = timestamps.filter(ts => now - ts < windowMs);

    // Check if limit exceeded
    if (timestamps.length >= maxRequests) {
      return reply.status(429).send({
        error: 'Too Many Requests',
        message: 'Rate limit exceeded',
        retryAfter: Math.ceil((timestamps[0] + windowMs - now) / 1000),
      });
    }

    // Add current timestamp
    timestamps.push(now);
    requests.set(key, timestamps);

    // Clean up old entries periodically
    if (Math.random() < 0.01) {
      const cutoff = now - windowMs;
      for (const [k, ts] of requests.entries()) {
        if (ts.every(t => t < cutoff)) {
          requests.delete(k);
        }
      }
    }
  };
}

/**
 * Bot detection middleware
 * Simpler alternative to full fingerprinting
 */
export function createBotDetectionMiddleware(
  options: {
    blockBots?: boolean;
    allowLegitimate?: boolean;
    onBotDetected?: (req: FastifyRequest, botType: string) => void | Promise<void>;
  } = {}
) {
  const { blockBots = false, allowLegitimate = true, onBotDetected } = options;

  return async (req: FastifyRequest, reply: FastifyReply) => {
    if (!req.fingerprint) return;

    const { bot } = req.fingerprint.intelligence;

    if (bot.isBot) {
      // Check if legitimate bot
      const ua = req.fingerprint.components.http.headers.userAgent || '';
      const isLegit = allowLegitimate && isLegitimateBot(ua);

      if (onBotDetected) {
        await onBotDetected(req, bot.type || 'unknown');
      }

      if (blockBots && !isLegit) {
        return reply.status(403).send({
          error: 'Forbidden',
          message: 'Automated requests not allowed',
          code: 'BOT_DETECTED',
        });
      }
    }
  };
}

/**
 * Check if bot is legitimate (search engines, monitoring, etc.)
 */
function isLegitimateBot(userAgent: string): boolean {
  const ua = userAgent.toLowerCase();
  const legitimateBots = [
    'googlebot',
    'bingbot',
    'slackbot',
    'twitterbot',
    'facebookexternalhit',
    'linkedinbot',
    'uptimerobot',
    'pingdom',
    'statuspage',
  ];

  return legitimateBots.some(bot => ua.includes(bot));
}

/**
 * Proxy/VPN detection middleware
 */
export function createProxyDetectionMiddleware(
  options: {
    blockVPN?: boolean;
    blockTor?: boolean;
    blockDatacenter?: boolean;
    allowlist?: string[]; // IPs to allow
    onProxyDetected?: (req: FastifyRequest, proxyType: string) => void | Promise<void>;
  } = {}
) {
  const {
    blockVPN = false,
    blockTor = true,
    blockDatacenter = false,
    allowlist = [],
    onProxyDetected,
  } = options;

  return async (req: FastifyRequest, reply: FastifyReply) => {
    if (!req.fingerprint) return;

    const { network } = req.fingerprint.components;
    const ip = network.ip;

    // Check allowlist
    if (allowlist.includes(ip)) {
      return;
    }

    let shouldBlock = false;
    let proxyType = '';

    if (blockTor && network.proxies.isTor) {
      shouldBlock = true;
      proxyType = 'tor';
    } else if (blockVPN && network.proxies.isVPN) {
      shouldBlock = true;
      proxyType = 'vpn';
    } else if (blockDatacenter && network.proxies.isHosting) {
      shouldBlock = true;
      proxyType = 'datacenter';
    }

    if (onProxyDetected && proxyType) {
      await onProxyDetected(req, proxyType);
    }

    if (shouldBlock) {
      return reply.status(403).send({
        error: 'Forbidden',
        message: `${proxyType.toUpperCase()} connections not allowed`,
        code: 'PROXY_DETECTED',
      });
    }
  };
}
