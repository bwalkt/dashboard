import { FastifyRequest } from 'fastify';

// ============================================
// Core Fingerprint Types
// ============================================

export interface FingerprintComponents {
  network: NetworkFingerprint;
  tls: TLSFingerprint | null;
  http: HTTPFingerprint;
  http2: HTTP2Fingerprint | null;
  tcp: TCPFingerprint;
  timing: TimingFingerprint;
  behavioral: BehavioralFingerprint;
}

export interface FingerprintResult {
  visitorId: string;
  confidence: {
    score: number;
  };
  components: FingerprintComponents;
  intelligence: FingerprintIntelligence;
  history?: VisitorHistory;
  timestamp: number;
}

// ============================================
// Network Layer
// ============================================

export interface NetworkFingerprint {
  ip: string;
  ipHash: string;
  ipVersion: 4 | 6;
  port: number;
  family: string;
  geo: GeoLocation | null;
  asn: ASNInfo | null;
  proxies: ProxyDetection;
}

export interface GeoLocation {
  country: string;
  region: string;
  city?: string;
  timezone: string;
  coordinates: [number, number]; // [lat, lon]
  accuracyRadius?: number;
}

export interface ASNInfo {
  number: number;
  organization: string;
  isp?: string;
  domain?: string;
}

export interface ProxyDetection {
  isProxy: boolean;
  isVPN: boolean;
  isTor: boolean;
  isHosting: boolean; // Datacenter IP
  isRelay: boolean;
  headers: {
    xForwardedFor?: string;
    xRealIp?: string;
    via?: string;
    forwarded?: string;
  };
}

// ============================================
// TLS/SSL Layer
// ============================================

export interface TLSFingerprint {
  ja3: string; // MD5 hash of TLS parameters
  ja3Full: string; // Full JA3 string before hashing
  protocol: string; // TLS 1.2, TLS 1.3
  cipher: string;
  cipherSuite?: string;
  alpnProtocol?: string; // h2, http/1.1, etc.
  serverName?: string; // SNI
  extensions: number[];
  supportedGroups?: number[]; // Elliptic curves
  signatureAlgorithms?: number[];
  ecPointFormats?: number[];
}

// ============================================
// HTTP Layer
// ============================================

export interface HTTPFingerprint {
  version: string;
  method: string;
  headerOrder: string[];
  headers: HTTPHeaders;
  customHeaders: Record<string, string>;
  clientHints: ClientHints | null;
}

export interface HTTPHeaders {
  userAgent: string;
  acceptLanguage?: string;
  acceptEncoding?: string;
  accept?: string;
  dnt?: string;
  upgradeInsecureRequests?: string;
  connection?: string;
  cacheControl?: string;
  origin?: string;
  referer?: string;
}

export interface ClientHints {
  // Chrome/Edge Client Hints (very identifying!)
  ua?: string;
  mobile?: string;
  platform?: string;
  arch?: string;
  bitness?: string;
  fullVersionList?: string;
  model?: string;
  platformVersion?: string;
  uaFullVersion?: string;
}

// ============================================
// HTTP/2 Layer
// ============================================

export interface HTTP2Fingerprint {
  version: string;
  settings: HTTP2Settings;
  windowUpdate?: number;
  streamPriorities: StreamPriority[];
  pseudoHeaderOrder: string[];
  akamai: string; // AKAMAI fingerprint hash
}

export interface HTTP2Settings {
  headerTableSize?: number;
  enablePush?: boolean;
  maxConcurrentStreams?: number;
  initialWindowSize?: number;
  maxFrameSize?: number;
  maxHeaderListSize?: number;
}

export interface StreamPriority {
  streamId: number;
  weight: number;
  dependency: number;
  exclusive: boolean;
}

// ============================================
// TCP/IP Layer
// ============================================

export interface TCPFingerprint {
  ttl: number | null;
  windowSize: number | null;
  mss: number | null; // Maximum Segment Size
  windowScaling: number | null;
  timestamps: boolean;
  selectiveAck: boolean;
  options: TCPOption[];
  osGuess?: string; // p0f style OS detection
}

export interface TCPOption {
  kind: number;
  length?: number;
  value?: any;
}

// ============================================
// Timing & Behavioral
// ============================================

export interface TimingFingerprint {
  requestTime: number;
  serverProcessingTime: number;
  clockSkew?: number;
  requestPattern: RequestPattern;
}

export interface RequestPattern {
  intervalMs: number[];
  parallelRequests: number;
  resourceLoadOrder: string[];
  requestFrequency: number; // requests per second
}

export interface BehavioralFingerprint {
  sessionId?: string;
  pageSequence: string[];
  actionTimings: number[];
  mousePattern?: MousePattern;
  keyboardPattern?: KeyboardPattern;
  scrollPattern?: ScrollPattern;
  deviceMotion?: DeviceMotion;
}

export interface MousePattern {
  movements: number;
  clicks: number;
  avgSpeed: number;
  straightness: number; // 0-1, how straight mouse moves
}

export interface KeyboardPattern {
  avgTypingSpeed: number;
  keyPressIntervals: number[];
  correctionRate: number;
}

export interface ScrollPattern {
  avgScrollSpeed: number;
  scrollDepth: number;
  scrollIntervals: number[];
}

export interface DeviceMotion {
  hasAccelerometer: boolean;
  hasGyroscope: boolean;
  patterns: number[];
}

// ============================================
// Intelligence & Analysis
// ============================================

export interface FingerprintIntelligence {
  bot: BotDetection;
  risk: RiskAssessment;
  device: DeviceIntelligence;
  network: NetworkIntelligence;
}

export interface BotDetection {
  isBot: boolean;
  probability: number; // 0-1
  type: BotType | null;
  signals: BotSignal[];
  ml: MLBotScore | null;
}

export enum BotType {
  SCRAPER = 'scraper',
  CRAWLER = 'crawler',
  AUTOMATION = 'automation',
  ATTACK = 'attack',
  LEGITIMATE = 'legitimate',
  UNKNOWN = 'unknown'
}

export interface BotSignal {
  type: string;
  weight: number;
  description: string;
}

export interface MLBotScore {
  score: number;
  model: string;
  version: string;
  features: Record<string, number>;
}

export interface RiskAssessment {
  score: number; // 0-100
  level: 'low' | 'medium' | 'high' | 'critical';
  factors: RiskFactor[];
  anomalies: Anomaly[];
}

export interface RiskFactor {
  type: string;
  weight: number;
  description: string;
}

export interface Anomaly {
  type: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
  timestamp: number;
}

export interface DeviceIntelligence {
  type: 'desktop' | 'mobile' | 'tablet' | 'bot' | 'unknown';
  os: OSInfo;
  browser: BrowserInfo;
  isEmulator: boolean;
  isVirtualMachine: boolean;
  isHeadless: boolean;
}

export interface OSInfo {
  name: string;
  version: string;
  family: 'windows' | 'mac' | 'linux' | 'ios' | 'android' | 'unknown';
}

export interface BrowserInfo {
  name: string;
  version: string;
  engine: string;
  isAutomated: boolean;
}

export interface NetworkIntelligence {
  type: 'residential' | 'business' | 'cellular' | 'datacenter' | 'unknown';
  threats: ThreatIndicator[];
  reputation: NetworkReputation;
}

export interface ThreatIndicator {
  type: string;
  severity: 'low' | 'medium' | 'high';
  source: string;
  timestamp: number;
}

export interface NetworkReputation {
  score: number; // 0-100
  blacklisted: boolean;
  blacklistSources: string[];
  abuseScore: number;
}

// ============================================
// Visitor History
// ============================================

export interface VisitorHistory {
  visitorId: string;
  firstSeen: Date;
  lastSeen: Date;
  visitCount: number;
  sessions: SessionSummary[];
  changes: FingerprintChange[];
}

export interface SessionSummary {
  sessionId: string;
  timestamp: Date;
  ip: string;
  userAgent: string;
  duration: number;
  pageViews: number;
}

export interface FingerprintChange {
  timestamp: Date;
  component: string;
  oldValue: any;
  newValue: any;
  significance: 'minor' | 'major' | 'critical';
}

// ============================================
// Database Models
// ============================================

export interface FingerprintRecord {
  id: string;
  visitor_id: string;
  session_id: string;
  ip: string;
  fp: string;
  fp_server: string;
  fp_client: string | null;
  fp_combined: string;
  fp_components: FingerprintComponents;
  ja3_hash: string | null;
  tls_fingerprint: string | null;
  http2_fingerprint: string | null;
  tcp_fingerprint: string | null;
  intelligence: FingerprintIntelligence;
  bot_score: number;
  risk_score: number;
  is_bot: boolean;
  is_vpn: boolean;
  is_proxy: boolean;
  is_tor: boolean;
  asn: string | null;
  visit_count: number;
  first_seen: Date;
  last_seen: Date;
  c_at: Date;
  u_at: Date;
}

// ============================================
// Configuration
// ============================================

export interface FingerprintConfig {
  enableTLS: boolean;
  enableHTTP2: boolean;
  enableTCP: boolean;
  enableBehavioral: boolean;
  enableML: boolean;
  storageType: 'postgres' | 'redis' | 'both';
  cacheTTL: number;
  confidenceThreshold: number;
  botThreshold: number;
  riskThreshold: number;
}

// ============================================
// Extended Request Type for Fastify
// ============================================

declare module 'fastify' {
  interface FastifyRequest {
    fingerprint?: FingerprintResult;
    visitorId?: string;
  }
}

export interface FingerprintRequest extends FastifyRequest {
  fingerprint: FingerprintResult;
  visitorId: string;
}
