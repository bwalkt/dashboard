import { FastifyRequest } from 'fastify';
import crypto from 'crypto';
import {
  HTTPFingerprint,
  HTTP2Fingerprint,
  ClientHints,
  HTTPHeaders,
  HTTP2Settings,
  StreamPriority
} from '../types';

/**
 * HTTP Fingerprint Collector for Fastify
 * Collects HTTP headers, order, and client hints
 */

export class HTTPCollector {

  /**
   * Collect HTTP fingerprint from Fastify request
   */
  static collect(req: FastifyRequest): HTTPFingerprint {
    const headers = req.headers;
    const headerOrder = Object.keys(headers);

    return {
      version: req.raw.httpVersion,
      method: req.method,
      headerOrder,
      headers: this.extractStandardHeaders(req),
      customHeaders: this.extractCustomHeaders(req),
      clientHints: this.extractClientHints(req),
    };
  }

  /**
   * Collect HTTP/2 specific fingerprint
   */
  static collectHTTP2(req: FastifyRequest): HTTP2Fingerprint | null {
    if (!req.raw.httpVersion.startsWith('2')) {
      return null;
    }

    const stream = (req.raw as any).stream;
    if (!stream) return null;

    try {
      const settings = stream.session?.remoteSettings || {};
      const pseudoHeaders = this.extractPseudoHeaders(req);

      // Generate AKAMAI-style fingerprint
      const akamai = this.generateAkamaiFingerprint(settings, pseudoHeaders);

      return {
        version: req.raw.httpVersion,
        settings: {
          headerTableSize: settings.headerTableSize,
          enablePush: settings.enablePush,
          maxConcurrentStreams: settings.maxConcurrentStreams,
          initialWindowSize: settings.initialWindowSize,
          maxFrameSize: settings.maxFrameSize,
          maxHeaderListSize: settings.maxHeaderListSize,
        },
        windowUpdate: settings.initialWindowSize,
        streamPriorities: [],
        pseudoHeaderOrder: pseudoHeaders,
        akamai,
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Extract standard HTTP headers
   */
  private static extractStandardHeaders(req: FastifyRequest): HTTPHeaders {
    const h = req.headers;

    return {
      userAgent: h['user-agent'] || '',
      acceptLanguage: h['accept-language'],
      acceptEncoding: h['accept-encoding'],
      accept: h['accept'],
      dnt: h['dnt'],
      upgradeInsecureRequests: h['upgrade-insecure-requests'],
      connection: h['connection'],
      cacheControl: h['cache-control'],
      origin: h['origin'],
      referer: h['referer'],
    };
  }

  /**
   * Extract custom/non-standard headers
   */
  private static extractCustomHeaders(req: FastifyRequest): Record<string, string> {
    const standardHeaders = new Set([
      'host', 'connection', 'user-agent', 'accept', 'accept-encoding',
      'accept-language', 'cache-control', 'content-type', 'content-length',
      'referer', 'origin', 'cookie', 'authorization', ':method', ':path',
      ':scheme', ':authority', 'sec-ch-ua', 'sec-ch-ua-mobile',
      'sec-ch-ua-platform', 'sec-fetch-site', 'sec-fetch-mode',
      'sec-fetch-dest', 'dnt', 'upgrade-insecure-requests'
    ]);

    const customHeaders: Record<string, string> = {};

    for (const [key, value] of Object.entries(req.headers)) {
      if (!standardHeaders.has(key.toLowerCase()) && typeof value === 'string') {
        customHeaders[key] = value;
      }
    }

    return customHeaders;
  }

  /**
   * Extract Chrome/Edge Client Hints (very identifying!)
   */
  private static extractClientHints(req: FastifyRequest): ClientHints | null {
    const h = req.headers;

    const hints = {
      ua: h['sec-ch-ua'] as string | undefined,
      mobile: h['sec-ch-ua-mobile'] as string | undefined,
      platform: h['sec-ch-ua-platform'] as string | undefined,
      arch: h['sec-ch-ua-arch'] as string | undefined,
      bitness: h['sec-ch-ua-bitness'] as string | undefined,
      fullVersionList: h['sec-ch-ua-full-version-list'] as string | undefined,
      model: h['sec-ch-ua-model'] as string | undefined,
      platformVersion: h['sec-ch-ua-platform-version'] as string | undefined,
      uaFullVersion: h['sec-ch-ua-full-version'] as string | undefined,
    };

    // Return null if no client hints present
    if (!Object.values(hints).some(v => v)) {
      return null;
    }

    return hints;
  }

  /**
   * Extract HTTP/2 pseudo-headers order
   */
  private static extractPseudoHeaders(req: FastifyRequest): string[] {
    const headers = req.headers;
    const pseudoHeaders: string[] = [];

    const pseudoHeaderKeys = [':method', ':path', ':scheme', ':authority'];

    for (const key of Object.keys(headers)) {
      if (pseudoHeaderKeys.includes(key)) {
        pseudoHeaders.push(key);
      }
    }

    return pseudoHeaders;
  }

  /**
   * Generate AKAMAI-style HTTP/2 fingerprint
   */
  private static generateAkamaiFingerprint(
    settings: HTTP2Settings,
    pseudoHeaders: string[]
  ): string {
    const fingerprintString = [
      settings.headerTableSize || 0,
      settings.enablePush ? 1 : 0,
      settings.maxConcurrentStreams || 0,
      settings.initialWindowSize || 0,
      settings.maxFrameSize || 0,
      settings.maxHeaderListSize || 0,
      pseudoHeaders.join(',')
    ].join('|');

    return crypto
      .createHash('md5')
      .update(fingerprintString)
      .digest('hex');
  }

  /**
   * Get quality score for HTTP fingerprint
   */
  static getQualityScore(fingerprint: HTTPFingerprint): number {
    let score = 0.3; // Base score

    if (fingerprint.headerOrder.length > 5) score += 0.2;
    if (fingerprint.clientHints) score += 0.3; // Client hints are very identifying
    if (fingerprint.headers.userAgent) score += 0.1;
    if (Object.keys(fingerprint.customHeaders).length > 0) score += 0.1;

    return Math.min(score, 1.0);
  }
}
