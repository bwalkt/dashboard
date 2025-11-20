import { FastifyRequest } from 'fastify';
import crypto from 'crypto';
import {
  FingerprintResult,
  FingerprintComponents,
  FingerprintIntelligence,
  FingerprintConfig,
  RiskAssessment,
  DeviceIntelligence,
  NetworkIntelligence,
  OSInfo,
  BrowserInfo,
  TimingFingerprint,
  BehavioralFingerprint,
} from './types';
import { TLSCollector } from './collectors/tls-collector';
import { HTTPCollector } from './collectors/http-collector';
import { NetworkCollector } from './collectors/network-collector';
import { BotDetector } from './analyzers/bot-detector';

/**
 * Main Fingerprint Engine
 * Orchestrates all collectors and analyzers to generate complete fingerprint
 */

export class FingerprintEngine {
  private config: FingerprintConfig;

  constructor(config?: Partial<FingerprintConfig>) {
    this.config = {
      enableTLS: true,
      enableHTTP2: true,
      enableTCP: false, // Requires packet-level access
      enableBehavioral: true,
      enableML: false, // TODO: Implement ML model
      storageType: 'both',
      cacheTTL: 3600,
      confidenceThreshold: 0.7,
      botThreshold: 0.5,
      riskThreshold: 70,
      ...config,
    };
  }

  /**
   * Generate complete fingerprint from Fastify request
   */
  async generate(req: FastifyRequest): Promise<FingerprintResult> {
    // Collect all fingerprint components
    const components = await this.collectComponents(req);

    // Generate visitor ID
    const visitorId = this.generateVisitorId(components);

    // Analyze components for intelligence
    const intelligence = this.analyzeIntelligence(components);

    // Calculate confidence score
    const confidence = this.calculateConfidence(components);

    return {
      visitorId,
      confidence: { score: confidence },
      components,
      intelligence,
      timestamp: Date.now(),
    };
  }

  /**
   * Collect all fingerprint components
   */
  private async collectComponents(req: FastifyRequest): Promise<FingerprintComponents> {
    // Collect network fingerprint
    const network = await NetworkCollector.collect(req);

    // Collect TLS fingerprint (if enabled and available)
    const tls = this.config.enableTLS
      ? TLSCollector.collect(req)
      : null;

    // Collect HTTP fingerprint
    const http = HTTPCollector.collect(req);

    // Collect HTTP/2 fingerprint (if enabled and available)
    const http2 = this.config.enableHTTP2
      ? HTTPCollector.collectHTTP2(req)
      : null;

    // Collect TCP fingerprint (limited without packet access)
    const tcp = NetworkCollector.collectTCP(req);

    // Collect timing fingerprint
    const timing = this.collectTiming(req);

    // Collect behavioral fingerprint
    const behavioral = this.collectBehavioral(req);

    return {
      network,
      tls,
      http,
      http2,
      tcp,
      timing,
      behavioral,
    };
  }

  /**
   * Collect timing fingerprint
   */
  private collectTiming(req: FastifyRequest): TimingFingerprint {
    const requestTime = Date.now();
    const serverProcessingTime = 0; // Will be set at response time

    return {
      requestTime,
      serverProcessingTime,
      requestPattern: {
        intervalMs: [],
        parallelRequests: 0,
        resourceLoadOrder: [],
        requestFrequency: 0,
      },
    };
  }

  /**
   * Collect behavioral fingerprint
   */
  private collectBehavioral(req: FastifyRequest): BehavioralFingerprint {
    // Get session ID from cookie or create new one
    const sessionId = (req.cookies as any)?.sessionId || crypto.randomUUID();

    return {
      sessionId,
      pageSequence: [],
      actionTimings: [],
      // Client-side behavioral data would be sent via API
      mousePattern: undefined,
      keyboardPattern: undefined,
      scrollPattern: undefined,
      deviceMotion: undefined,
    };
  }

  /**
   * Analyze components for intelligence
   */
  private analyzeIntelligence(components: FingerprintComponents): FingerprintIntelligence {
    // Bot detection
    const bot = BotDetector.analyze(components);

    // Risk assessment
    const risk = this.assessRisk(components, bot);

    // Device intelligence
    const device = this.analyzeDevice(components);

    // Network intelligence
    const network = this.analyzeNetwork(components);

    return {
      bot,
      risk,
      device,
      network,
    };
  }

  /**
   * Assess risk level
   */
  private assessRisk(components: FingerprintComponents, botDetection: any): RiskAssessment {
    let score = 0;
    const factors: any[] = [];
    const anomalies: any[] = [];

    // Bot score contributes to risk
    if (botDetection.isBot) {
      score += botDetection.probability * 40;
      factors.push({
        type: 'bot_detected',
        weight: botDetection.probability,
        description: `Bot detected: ${botDetection.type || 'unknown'}`,
      });
    }

    // Proxy/VPN increases risk
    if (components.network.proxies.isProxy) {
      score += 20;
      factors.push({
        type: 'proxy_detected',
        weight: 0.2,
        description: 'Proxy connection detected',
      });
    }

    // VPN increases risk
    if (components.network.proxies.isVPN) {
      score += 15;
      factors.push({
        type: 'vpn_detected',
        weight: 0.15,
        description: 'VPN connection detected',
      });
    }

    // Tor significantly increases risk
    if (components.network.proxies.isTor) {
      score += 30;
      factors.push({
        type: 'tor_detected',
        weight: 0.3,
        description: 'Tor exit node detected',
      });
    }

    // Datacenter IP increases risk
    if (components.network.proxies.isHosting) {
      score += 25;
      factors.push({
        type: 'datacenter_ip',
        weight: 0.25,
        description: 'IP from datacenter/hosting provider',
      });
    }

    // Missing standard headers is suspicious
    if (!components.http.headers.acceptLanguage || !components.http.headers.accept) {
      score += 10;
      anomalies.push({
        type: 'missing_headers',
        severity: 'medium' as const,
        description: 'Missing standard browser headers',
        timestamp: Date.now(),
      });
    }

    // Clamp score to 0-100
    score = Math.min(Math.max(score, 0), 100);

    // Determine risk level
    let level: 'low' | 'medium' | 'high' | 'critical';
    if (score < 30) level = 'low';
    else if (score < 60) level = 'medium';
    else if (score < 85) level = 'high';
    else level = 'critical';

    return {
      score,
      level,
      factors,
      anomalies,
    };
  }

  /**
   * Analyze device information
   */
  private analyzeDevice(components: FingerprintComponents): DeviceIntelligence {
    const ua = components.http.headers.userAgent?.toLowerCase() || '';

    // Parse OS
    const os = this.parseOS(ua);

    // Parse browser
    const browser = this.parseBrowser(ua, components);

    // Detect device type
    let type: 'desktop' | 'mobile' | 'tablet' | 'bot' | 'unknown';
    if (components.http.clientHints?.mobile === '?1') {
      type = 'mobile';
    } else if (ua.includes('mobile') || ua.includes('android')) {
      type = 'mobile';
    } else if (ua.includes('tablet') || ua.includes('ipad')) {
      type = 'tablet';
    } else if (ua.includes('bot') || ua.includes('crawler')) {
      type = 'bot';
    } else if (ua.includes('windows') || ua.includes('mac') || ua.includes('linux')) {
      type = 'desktop';
    } else {
      type = 'unknown';
    }

    // Detect headless browser
    const isHeadless = ua.includes('headless') ||
                      ua.includes('phantomjs') ||
                      ua.includes('selenium') ||
                      browser.isAutomated;

    return {
      type,
      os,
      browser,
      isEmulator: false, // TODO: Implement emulator detection
      isVirtualMachine: false, // TODO: Implement VM detection
      isHeadless,
    };
  }

  /**
   * Parse OS from User-Agent
   */
  private parseOS(ua: string): OSInfo {
    let name = 'Unknown';
    let version = '';
    let family: OSInfo['family'] = 'unknown';

    if (ua.includes('windows')) {
      name = 'Windows';
      family = 'windows';
      if (ua.includes('windows nt 10')) version = '10';
      else if (ua.includes('windows nt 11')) version = '11';
    } else if (ua.includes('mac os x')) {
      name = 'macOS';
      family = 'mac';
      const match = ua.match(/mac os x ([\d_]+)/);
      if (match) version = match[1].replace(/_/g, '.');
    } else if (ua.includes('linux')) {
      name = 'Linux';
      family = 'linux';
    } else if (ua.includes('iphone') || ua.includes('ipad')) {
      name = 'iOS';
      family = 'ios';
      const match = ua.match(/os ([\d_]+)/);
      if (match) version = match[1].replace(/_/g, '.');
    } else if (ua.includes('android')) {
      name = 'Android';
      family = 'android';
      const match = ua.match(/android ([\d.]+)/);
      if (match) version = match[1];
    }

    return { name, version, family };
  }

  /**
   * Parse browser from User-Agent
   */
  private parseBrowser(ua: string, components: FingerprintComponents): BrowserInfo {
    let name = 'Unknown';
    let version = '';
    let engine = 'Unknown';
    let isAutomated = false;

    // Check for automation tools
    if (ua.includes('headless') || ua.includes('phantomjs') ||
        ua.includes('selenium') || ua.includes('puppeteer') ||
        ua.includes('playwright')) {
      isAutomated = true;
    }

    // Parse browser
    if (ua.includes('edg/')) {
      name = 'Edge';
      engine = 'Chromium';
      const match = ua.match(/edg\/([\d.]+)/);
      if (match) version = match[1];
    } else if (ua.includes('chrome/')) {
      name = 'Chrome';
      engine = 'Chromium';
      const match = ua.match(/chrome\/([\d.]+)/);
      if (match) version = match[1];
    } else if (ua.includes('firefox/')) {
      name = 'Firefox';
      engine = 'Gecko';
      const match = ua.match(/firefox\/([\d.]+)/);
      if (match) version = match[1];
    } else if (ua.includes('safari/') && !ua.includes('chrome')) {
      name = 'Safari';
      engine = 'WebKit';
      const match = ua.match(/version\/([\d.]+)/);
      if (match) version = match[1];
    }

    return { name, version, engine, isAutomated };
  }

  /**
   * Analyze network intelligence
   */
  private analyzeNetwork(components: FingerprintComponents): NetworkIntelligence {
    const threats: any[] = [];
    let type: NetworkIntelligence['type'] = 'unknown';

    // Determine network type
    if (components.network.proxies.isHosting) {
      type = 'datacenter';
    } else if (components.network.asn) {
      // ISP indicates residential or business
      const isp = components.network.asn.organization.toLowerCase();
      if (isp.includes('mobile') || isp.includes('cellular')) {
        type = 'cellular';
      } else if (isp.includes('business') || isp.includes('enterprise')) {
        type = 'business';
      } else {
        type = 'residential';
      }
    }

    // Check for threats
    if (components.network.proxies.isTor) {
      threats.push({
        type: 'tor_exit_node',
        severity: 'high' as const,
        source: 'network_analysis',
        timestamp: Date.now(),
      });
    }

    return {
      type,
      threats,
      reputation: {
        score: 50, // Neutral by default
        blacklisted: false,
        blacklistSources: [],
        abuseScore: 0,
      },
    };
  }

  /**
   * Generate visitor ID from components
   */
  private generateVisitorId(components: FingerprintComponents): string {
    // Create composite fingerprint string
    const fingerprintString = [
      components.network.ipHash,
      components.tls?.ja3 || 'no-tls',
      components.http2?.akamai || 'no-http2',
      components.http.headerOrder.join(','),
      components.http.headers.userAgent || '',
      components.http.headers.acceptLanguage || '',
      components.http.clientHints?.platform || '',
      components.network.asn?.number || '',
    ].join('|');

    // Generate SHA-256 hash
    return crypto
      .createHash('sha256')
      .update(fingerprintString)
      .digest('hex')
      .substring(0, 32); // Use first 32 chars
  }

  /**
   * Calculate confidence score (0-1)
   */
  private calculateConfidence(components: FingerprintComponents): number {
    let score = 0;
    let maxScore = 0;

    // Network fingerprint (always available)
    score += NetworkCollector.getQualityScore(components.network);
    maxScore += 1;

    // TLS fingerprint (if available)
    if (components.tls) {
      score += TLSCollector.getQualityScore(components.tls);
      maxScore += 1;
    }

    // HTTP fingerprint
    score += HTTPCollector.getQualityScore(components.http);
    maxScore += 1;

    // HTTP/2 fingerprint (if available)
    if (components.http2) {
      score += 0.8; // HTTP/2 is very identifying
      maxScore += 1;
    }

    // Client hints (if available)
    if (components.http.clientHints) {
      score += 0.5;
      maxScore += 1;
    }

    return maxScore > 0 ? score / maxScore : 0;
  }

  /**
   * Get configuration
   */
  getConfig(): FingerprintConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<FingerprintConfig>): void {
    this.config = { ...this.config, ...config };
  }
}
