import {
  BotDetection,
  BotType,
  BotSignal,
  FingerprintComponents,
  HTTPFingerprint,
  TLSFingerprint,
  NetworkFingerprint
} from '../types';

/**
 * Bot Detection Analyzer
 * Uses heuristics and patterns to detect automated clients
 */

export class BotDetector {

  /**
   * Analyze fingerprint components for bot indicators
   */
  static analyze(components: FingerprintComponents): BotDetection {
    const signals: BotSignal[] = [];

    // Check HTTP signals
    signals.push(...this.analyzeHTTP(components.http));

    // Check TLS signals
    if (components.tls) {
      signals.push(...this.analyzeTLS(components.tls));
    }

    // Check network signals
    signals.push(...this.analyzeNetwork(components.network));

    // Check behavioral signals
    signals.push(...this.analyzeBehavioral(components.behavioral));

    // Calculate bot probability from signals
    const probability = this.calculateBotProbability(signals);
    const isBot = probability > 0.5;
    const type = this.identifyBotType(signals, components);

    return {
      isBot,
      probability,
      type,
      signals,
      ml: null, // TODO: Add ML model scoring
    };
  }

  /**
   * Analyze HTTP fingerprint for bot signals
   */
  private static analyzeHTTP(http: HTTPFingerprint): BotSignal[] {
    const signals: BotSignal[] = [];

    // Check User-Agent
    const ua = http.headers.userAgent?.toLowerCase() || '';

    // Bot keywords in User-Agent
    const botKeywords = [
      'bot', 'crawler', 'spider', 'scraper', 'curl', 'wget',
      'python-requests', 'axios', 'okhttp', 'java/', 'go-http-client',
      'phantomjs', 'headless', 'selenium', 'puppeteer', 'playwright'
    ];

    for (const keyword of botKeywords) {
      if (ua.includes(keyword)) {
        signals.push({
          type: 'user_agent_bot_keyword',
          weight: 0.7,
          description: `User-Agent contains bot keyword: ${keyword}`
        });
      }
    }

    // Missing or suspicious User-Agent
    if (!http.headers.userAgent) {
      signals.push({
        type: 'missing_user_agent',
        weight: 0.5,
        description: 'No User-Agent header'
      });
    }

    // Suspicious header combinations
    if (!http.headers.accept || !http.headers.acceptLanguage) {
      signals.push({
        type: 'missing_standard_headers',
        weight: 0.3,
        description: 'Missing standard browser headers'
      });
    }

    // Chrome Client Hints presence (real browsers have these)
    if (!http.clientHints && ua.includes('chrome')) {
      signals.push({
        type: 'missing_client_hints',
        weight: 0.4,
        description: 'Chrome UA but no Client Hints'
      });
    }

    // Very few headers (bots often send minimal headers)
    if (http.headerOrder.length < 5) {
      signals.push({
        type: 'few_headers',
        weight: 0.3,
        description: `Only ${http.headerOrder.length} headers sent`
      });
    }

    // Automated tool headers
    const automatedHeaders = ['x-automated', 'x-bot', 'x-crawler'];
    for (const header of automatedHeaders) {
      if (http.customHeaders[header]) {
        signals.push({
          type: 'automated_header',
          weight: 0.8,
          description: `Has automated tool header: ${header}`
        });
      }
    }

    return signals;
  }

  /**
   * Analyze TLS fingerprint for bot signals
   */
  private static analyzeTLS(tls: TLSFingerprint): BotSignal[] {
    const signals: BotSignal[] = [];

    // Check for automation tool TLS fingerprints
    const knownBotJA3 = [
      '51c64c77e60f3980eea90869b68c58a8', // Python requests
      '6734f37431670b3ab4292b8f60f29984', // curl
      'ada70206e40642a3e4461f35503241d5', // wget
    ];

    if (knownBotJA3.includes(tls.ja3)) {
      signals.push({
        type: 'known_bot_ja3',
        weight: 0.9,
        description: 'TLS fingerprint matches known bot'
      });
    }

    // Old/unusual TLS versions
    if (tls.protocol && !tls.protocol.includes('TLSv1.2') && !tls.protocol.includes('TLSv1.3')) {
      signals.push({
        type: 'old_tls_version',
        weight: 0.4,
        description: `Unusual TLS version: ${tls.protocol}`
      });
    }

    return signals;
  }

  /**
   * Analyze network fingerprint for bot signals
   */
  private static analyzeNetwork(network: NetworkFingerprint): BotSignal[] {
    const signals: BotSignal[] = [];

    // Datacenter/hosting IP
    if (network.proxies.isHosting) {
      signals.push({
        type: 'datacenter_ip',
        weight: 0.6,
        description: 'IP belongs to datacenter/hosting provider'
      });
    }

    // VPN detected
    if (network.proxies.isVPN) {
      signals.push({
        type: 'vpn_detected',
        weight: 0.3,
        description: 'VPN connection detected'
      });
    }

    // Tor exit node
    if (network.proxies.isTor) {
      signals.push({
        type: 'tor_detected',
        weight: 0.5,
        description: 'Tor exit node detected'
      });
    }

    return signals;
  }

  /**
   * Analyze behavioral patterns for bot signals
   */
  private static analyzeBehavioral(behavioral: any): BotSignal[] {
    const signals: BotSignal[] = [];

    // TODO: Analyze timing patterns, mouse movements, etc.
    // Bots typically have:
    // - Very consistent timing
    // - No mouse movements
    // - Linear navigation patterns
    // - Fast page transitions

    return signals;
  }

  /**
   * Calculate bot probability from signals
   */
  private static calculateBotProbability(signals: BotSignal[]): number {
    if (signals.length === 0) return 0;

    // Weighted average of signal weights
    const totalWeight = signals.reduce((sum, sig) => sum + sig.weight, 0);
    const maxPossibleWeight = signals.length * 1.0;

    return Math.min(totalWeight / signals.length, 1.0);
  }

  /**
   * Identify bot type from signals
   */
  private static identifyBotType(
    signals: BotSignal[],
    components: FingerprintComponents
  ): BotType | null {
    const ua = components.http.headers.userAgent?.toLowerCase() || '';

    // Check for specific bot types
    if (ua.includes('googlebot') || ua.includes('bingbot')) {
      return BotType.CRAWLER;
    }

    if (ua.includes('scraper') || ua.includes('scrapy')) {
      return BotType.SCRAPER;
    }

    if (ua.includes('selenium') || ua.includes('puppeteer') || ua.includes('playwright')) {
      return BotType.AUTOMATION;
    }

    // Check for attack patterns
    const hasAttackSignals = signals.some(s =>
      s.type.includes('attack') || s.type.includes('malicious')
    );
    if (hasAttackSignals) {
      return BotType.ATTACK;
    }

    // If high bot probability but can't classify
    const probability = this.calculateBotProbability(signals);
    if (probability > 0.5) {
      return BotType.UNKNOWN;
    }

    return null;
  }

  /**
   * Check if bot is likely legitimate (search engine, monitoring, etc.)
   */
  static isLegitimateBot(detection: BotDetection, userAgent: string): boolean {
    if (!detection.isBot) return false;

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
    ];

    return legitimateBots.some(bot => ua.includes(bot));
  }
}
