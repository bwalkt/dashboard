import { FastifyRequest } from 'fastify';
import crypto from 'crypto';
import { TLSSocket } from 'tls';
import { TLSFingerprint } from '../types';

/**
 * TLS/JA3 Fingerprint Collector for Fastify
 *
 * Note: Full JA3 requires packet-level inspection. This implementation
 * provides what's available from Node.js TLS APIs. For production JA3,
 * consider using a reverse proxy (nginx/caddy) or eBPF-based capture.
 */

export class TLSCollector {

  /**
   * Collect TLS fingerprint from Fastify request
   */
  static collect(req: FastifyRequest): TLSFingerprint | null {
    const socket = req.raw.socket as any;

    if (!socket.encrypted) {
      return null;
    }

    try {
      const tlsSocket = socket as TLSSocket;
      const cipher = tlsSocket.getCipher();
      const protocol = tlsSocket.getProtocol();
      const alpn = tlsSocket.alpnProtocol;
      const sni = tlsSocket.servername;

      // Generate simplified JA3 hash from available data
      const ja3Full = `${protocol},${cipher?.name || 'unknown'},${alpn || 'h1'}`;
      const ja3Hash = crypto
        .createHash('md5')
        .update(ja3Full)
        .digest('hex');

      return {
        ja3: ja3Hash,
        ja3Full,
        protocol: protocol || 'unknown',
        cipher: cipher?.name || 'unknown',
        cipherSuite: cipher?.standardName,
        alpnProtocol: alpn,
        serverName: sni,
        extensions: [],
      };

    } catch (error) {
      return null;
    }
  }

  /**
   * Get quality score for TLS fingerprint
   */
  static getQualityScore(fingerprint: TLSFingerprint | null): number {
    if (!fingerprint) return 0;

    let score = 0.5; // Base score for having TLS

    if (fingerprint.protocol.includes('TLSv1.3')) score += 0.2;
    if (fingerprint.alpnProtocol === 'h2') score += 0.15;
    if (fingerprint.serverName) score += 0.15;

    return Math.min(score, 1.0);
  }
}
