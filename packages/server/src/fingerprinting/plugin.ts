import { FastifyInstance, FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import { FingerprintEngine } from './engine';
import { FingerprintStore } from './storage/fingerprint-store';
import { FingerprintConfig, FingerprintResult } from './types';

/**
 * Fastify Fingerprinting Plugin
 *
 * Usage:
 * ```typescript
 * import fingerprintPlugin from './fingerprinting/plugin';
 *
 * await fastify.register(fingerprintPlugin, {
 *   enableTLS: true,
 *   enableHTTP2: true,
 *   autoFingerprint: true, // Automatically fingerprint all requests
 *   storageEnabled: true,  // Store fingerprints in database
 *   centrifugoEnabled: true, // Publish events to Centrifugo
 * });
 * ```
 */

export interface FingerprintPluginOptions extends Partial<FingerprintConfig> {
  autoFingerprint?: boolean;
  storageEnabled?: boolean;
  centrifugoEnabled?: boolean;
  excludeRoutes?: string[];
  onFingerprint?: (req: FastifyRequest, result: FingerprintResult) => void | Promise<void>;
}

declare module 'fastify' {
  interface FastifyInstance {
    fingerprint: {
      engine: FingerprintEngine;
      store: FingerprintStore;
      generate: (req: FastifyRequest) => Promise<FingerprintResult>;
    };
  }
}

const fingerprintPlugin: FastifyPluginAsync<FingerprintPluginOptions> = async (
  fastify: FastifyInstance,
  options: FingerprintPluginOptions
) => {
  const {
    autoFingerprint = false,
    storageEnabled = true,
    centrifugoEnabled = false,
    excludeRoutes = [],
    onFingerprint,
    ...engineConfig
  } = options;

  // Initialize fingerprint engine
  const engine = new FingerprintEngine(engineConfig);

  // Initialize storage
  const store = new FingerprintStore(fastify);

  // Decorate fastify instance with fingerprint utilities
  fastify.decorate('fingerprint', {
    engine,
    store,
    generate: async (req: FastifyRequest): Promise<FingerprintResult> => {
      const result = await engine.generate(req);

      // Store if enabled
      if (storageEnabled) {
        const sessionId = (req.cookies as any)?.sessionId || req.id;
        await store.store(result, sessionId);
      }

      // Publish to Centrifugo if enabled
      if (centrifugoEnabled && (fastify as any).centrifugo) {
        await publishToCentrifugo(fastify, result);
      }

      // Call custom handler if provided
      if (onFingerprint) {
        await onFingerprint(req, result);
      }

      return result;
    },
  });

  // Auto-fingerprint hook
  if (autoFingerprint) {
    fastify.addHook('onRequest', async (req: FastifyRequest, reply: FastifyReply) => {
      // Skip excluded routes
      if (shouldExclude(req.url, excludeRoutes)) {
        return;
      }

      try {
        const result = await fastify.fingerprint.generate(req);

        // Attach to request object
        req.fingerprint = result;
        req.visitorId = result.visitorId;

        // Log high-risk requests
        if (result.intelligence.risk.level === 'high' || result.intelligence.risk.level === 'critical') {
          fastify.log.warn({
            visitorId: result.visitorId,
            ip: result.components.network.ip,
            riskScore: result.intelligence.risk.score,
            riskLevel: result.intelligence.risk.level,
            isBot: result.intelligence.bot.isBot,
            path: req.url,
          }, 'High-risk request detected');
        }

        // Log bot requests
        if (result.intelligence.bot.isBot) {
          fastify.log.info({
            visitorId: result.visitorId,
            ip: result.components.network.ip,
            botType: result.intelligence.bot.type,
            botProbability: result.intelligence.bot.probability,
            path: req.url,
          }, 'Bot request detected');
        }

      } catch (error) {
        // Don't fail requests due to fingerprinting errors
        fastify.log.error({ error, url: req.url }, 'Fingerprinting error');
      }
    });
  }

  // Add fingerprint endpoint for manual testing
  fastify.get('/api/fingerprint/test', async (req: FastifyRequest, reply: FastifyReply) => {
    const result = await fastify.fingerprint.generate(req);
    return reply.send(result);
  });

  // Add fingerprint history endpoint
  fastify.get<{ Params: { visitorId: string } }>(
    '/api/fingerprint/:visitorId',
    async (req, reply) => {
      const { visitorId } = req.params;
      const history = await store.getVisitorHistory(visitorId);

      if (!history) {
        return reply.status(404).send({ error: 'Visitor not found' });
      }

      return reply.send(history);
    }
  );

  // Add bot statistics endpoint
  fastify.get<{ Querystring: { range?: string } }>(
    '/api/fingerprint/stats/bots',
    async (req, reply) => {
      const range = req.query.range || '24h';
      const stats = await store.getBotStats(range);
      return reply.send(stats);
    }
  );

  // Add search endpoints
  fastify.get<{ Querystring: { ip: string } }>(
    '/api/fingerprint/search/ip',
    async (req, reply) => {
      const { ip } = req.query;
      if (!ip) {
        return reply.status(400).send({ error: 'IP parameter required' });
      }
      const results = await store.findByIP(ip);
      return reply.send(results);
    }
  );

  fastify.get<{ Querystring: { ja3: string } }>(
    '/api/fingerprint/search/ja3',
    async (req, reply) => {
      const { ja3 } = req.query;
      if (!ja3) {
        return reply.status(400).send({ error: 'JA3 parameter required' });
      }
      const results = await store.findByJA3(ja3);
      return reply.send(results);
    }
  );

  fastify.log.info('Fingerprinting plugin registered');
};

/**
 * Publish fingerprint event to Centrifugo
 */
async function publishToCentrifugo(
  fastify: FastifyInstance,
  result: FingerprintResult
): Promise<void> {
  const centrifugo = (fastify as any).centrifugo;
  if (!centrifugo) return;

  try {
    // Publish to general fingerprint channel
    await centrifugo.publishToChannel('fingerprints', {
      type: 'fingerprint',
      visitorId: result.visitorId,
      timestamp: result.timestamp,
      isBot: result.intelligence.bot.isBot,
      botType: result.intelligence.bot.type,
      riskScore: result.intelligence.risk.score,
      riskLevel: result.intelligence.risk.level,
      ip: result.components.network.ip,
    });

    // Publish to high-risk channel if applicable
    if (result.intelligence.risk.level === 'high' || result.intelligence.risk.level === 'critical') {
      await centrifugo.publishToChannel('fingerprints:high-risk', {
        type: 'high_risk_fingerprint',
        visitorId: result.visitorId,
        timestamp: result.timestamp,
        riskScore: result.intelligence.risk.score,
        riskLevel: result.intelligence.risk.level,
        factors: result.intelligence.risk.factors,
        ip: result.components.network.ip,
      });
    }

    // Publish to bot channel if applicable
    if (result.intelligence.bot.isBot) {
      await centrifugo.publishToChannel('fingerprints:bots', {
        type: 'bot_detected',
        visitorId: result.visitorId,
        timestamp: result.timestamp,
        botType: result.intelligence.bot.type,
        botProbability: result.intelligence.bot.probability,
        signals: result.intelligence.bot.signals,
        ip: result.components.network.ip,
      });
    }
  } catch (error) {
    fastify.log.error({ error }, 'Failed to publish fingerprint to Centrifugo');
  }
}

/**
 * Check if route should be excluded from fingerprinting
 */
function shouldExclude(url: string, excludeRoutes: string[]): boolean {
  return excludeRoutes.some(pattern => {
    if (pattern.includes('*')) {
      const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
      return regex.test(url);
    }
    return url.startsWith(pattern);
  });
}

export default fp(fingerprintPlugin, {
  name: 'fingerprint',
  fastify: '4.x',
});
