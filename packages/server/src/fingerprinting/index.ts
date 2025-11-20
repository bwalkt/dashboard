/**
 * Server-Side Fingerprinting System
 *
 * Complete fingerprinting solution for Fastify with:
 * - TLS/JA3 fingerprinting
 * - HTTP/2 AKAMAI fingerprinting
 * - Bot detection and risk assessment
 * - Network intelligence (VPN/Tor/proxy detection)
 * - Real-time Centrifugo integration
 * - PostgreSQL + Redis storage
 */

// Main plugin (recommended)
export { default as fingerprintPlugin } from './plugin';
export type { FingerprintPluginOptions } from './plugin';

// Core engine
export { FingerprintEngine } from './engine';

// Storage
export { FingerprintStore } from './storage/fingerprint-store';

// Collectors
export { TLSCollector } from './collectors/tls-collector';
export { HTTPCollector } from './collectors/http-collector';
export { NetworkCollector } from './collectors/network-collector';

// Analyzers
export { BotDetector } from './analyzers/bot-detector';

// Middleware helpers
export {
  createFingerprintMiddleware,
  createFingerprintRateLimiter,
  createBotDetectionMiddleware,
  createProxyDetectionMiddleware,
} from './middleware';

// Types
export * from './types';
