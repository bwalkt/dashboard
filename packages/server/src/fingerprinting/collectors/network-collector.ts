import { FastifyRequest } from 'fastify';
import crypto from 'crypto';
import {
  NetworkFingerprint,
  TCPFingerprint,
  GeoLocation,
  ASNInfo,
  ProxyDetection
} from '../types';

/**
 * Network Fingerprint Collector for Fastify
 * Collects IP, geolocation, ASN, and proxy detection
 */

export class NetworkCollector {

  /**
   * Collect network fingerprint from Fastify request
   */
  static async collect(req: FastifyRequest): Promise<NetworkFingerprint> {
    const ip = this.extractIP(req);
    const ipHash = this.hashIP(ip);
    const ipVersion = ip.includes(':') ? 6 : 4;

    return {
      ip,
      ipHash,
      ipVersion,
      port: req.socket.remotePort || 0,
      family: req.socket.remoteFamily || 'IPv4',
      geo: await this.getGeoLocation(ip),
      asn: await this.getASN(ip),
      proxies: this.detectProxies(req, ip),
    };
  }

  /**
   * Collect TCP fingerprint
   */
  static collectTCP(req: FastifyRequest): TCPFingerprint {
    const socket = req.socket as any;

    // These values would ideally come from packet-level inspection
    // For now, we collect what's available from Node.js
    return {
      ttl: null, // Requires raw packet access
      windowSize: socket.bufferSize || null,
      mss: null, // Requires TCP option inspection
      windowScaling: null,
      timestamps: false,
      selectiveAck: false,
      options: [],
    };
  }

  /**
   * Extract client IP address (handle proxies/load balancers)
   */
  private static extractIP(req: FastifyRequest): string {
    // Check X-Forwarded-For (added by proxies/load balancers)
    const xForwardedFor = req.headers['x-forwarded-for'];
    if (xForwardedFor) {
      // Take the first IP (client IP)
      const ips = typeof xForwardedFor === 'string'
        ? xForwardedFor.split(',')
        : xForwardedFor;
      const clientIP = ips[0].trim();
      if (clientIP) return clientIP;
    }

    // Check X-Real-IP
    const xRealIP = req.headers['x-real-ip'];
    if (xRealIP && typeof xRealIP === 'string') {
      return xRealIP;
    }

    // Check CF-Connecting-IP (Cloudflare)
    const cfIP = req.headers['cf-connecting-ip'];
    if (cfIP && typeof cfIP === 'string') {
      return cfIP;
    }

    // Fallback to socket remote address
    return req.socket.remoteAddress || '0.0.0.0';
  }

  /**
   * Hash IP for privacy (partial hash showing first 16 chars)
   */
  private static hashIP(ip: string): string {
    return crypto
      .createHash('sha256')
      .update(ip)
      .digest('hex')
      .substring(0, 16);
  }

  /**
   * Get geolocation from IP
   * In production, use MaxMind GeoIP2, IP2Location, or similar service
   */
  private static async getGeoLocation(ip: string): Promise<GeoLocation | null> {
    try {
      // Placeholder - integrate with your geo IP service
      // Example: const geoip = require('geoip-lite');
      // const geo = geoip.lookup(ip);

      // For now, return null
      // TODO: Integrate with MaxMind GeoIP2 or IP2Location
      return null;

    } catch (error) {
      return null;
    }
  }

  /**
   * Get ASN (Autonomous System Number) information
   * In production, use MaxMind ASN database or API
   */
  private static async getASN(ip: string): Promise<ASNInfo | null> {
    try {
      // Placeholder - integrate with ASN lookup service
      // TODO: Integrate with MaxMind ASN database
      return null;

    } catch (error) {
      return null;
    }
  }

  /**
   * Detect proxies, VPNs, Tor, and datacenter IPs
   */
  private static detectProxies(req: FastifyRequest, ip: string): ProxyDetection {
    const headers = req.headers;

    // Check for proxy headers
    const hasProxyHeaders = !!(
      headers['x-forwarded-for'] ||
      headers['via'] ||
      headers['forwarded'] ||
      headers['x-real-ip']
    );

    return {
      isProxy: hasProxyHeaders,
      isVPN: false, // TODO: Check against VPN IP database
      isTor: false, // TODO: Check against Tor exit node list
      isHosting: false, // TODO: Check if IP belongs to datacenter/hosting provider
      isRelay: !!headers['via'],
      headers: {
        xForwardedFor: headers['x-forwarded-for'] as string | undefined,
        xRealIp: headers['x-real-ip'] as string | undefined,
        via: headers['via'] as string | undefined,
        forwarded: headers['forwarded'] as string | undefined,
      },
    };
  }

  /**
   * Get quality score for network fingerprint
   */
  static getQualityScore(fingerprint: NetworkFingerprint): number {
    let score = 0.4; // Base score for having IP

    if (fingerprint.geo) score += 0.2;
    if (fingerprint.asn) score += 0.2;
    if (fingerprint.ipVersion === 6) score += 0.1; // IPv6 is more unique
    if (!fingerprint.proxies.isProxy) score += 0.1; // Direct connection is more reliable

    return Math.min(score, 1.0);
  }
}

/**
 * IP Intelligence Helper Functions
 */

export class IPIntelligence {

  /**
   * Check if IP is a known VPN provider
   * In production, use commercial VPN detection API
   */
  static async isVPN(ip: string): Promise<boolean> {
    // TODO: Integrate with VPN detection service
    // Examples: IPHub, IP2Proxy, Proxy Check, etc.
    return false;
  }

  /**
   * Check if IP is a Tor exit node
   */
  static async isTor(ip: string): Promise<boolean> {
    // TODO: Check against Tor exit node list
    // https://check.torproject.org/torbulkexitlist
    return false;
  }

  /**
   * Check if IP belongs to a datacenter/hosting provider
   */
  static async isDatacenter(ip: string): Promise<boolean> {
    // TODO: Check against datacenter IP ranges
    // Common providers: AWS, GCP, Azure, DigitalOcean, etc.
    return false;
  }

  /**
   * Get IP reputation score
   */
  static async getReputation(ip: string): Promise<number> {
    // TODO: Integrate with IP reputation service
    // Examples: AbuseIPDB, IPQualityScore, etc.
    return 50; // Neutral score
  }

  /**
   * Check if IP is blacklisted
   */
  static async isBlacklisted(ip: string): Promise<{ listed: boolean, sources: string[] }> {
    // TODO: Check against multiple blacklists
    // DNSBL, Spamhaus, etc.
    return { listed: false, sources: [] };
  }
}
