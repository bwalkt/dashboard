import { FastifyInstance } from 'fastify';
import crypto from 'crypto';
import {
  FingerprintResult,
  FingerprintComponents,
  FingerprintIntelligence,
  FingerprintRecord,
  VisitorHistory,
  FingerprintChange,
} from '../types';

/**
 * Fingerprint Storage Layer
 * Handles PostgreSQL and Redis storage for fingerprints
 */

export class FingerprintStore {
  private db: any; // PostgreSQL pool
  private redis: any; // Redis client

  constructor(private fastify: FastifyInstance) {
    this.db = fastify.pg;
    this.redis = fastify.redis;
  }

  /**
   * Store fingerprint result
   */
  async store(result: FingerprintResult, sessionId: string): Promise<void> {
    const visitorId = result.visitorId;
    const ip = result.components.network.ip;

    // Generate composite fingerprint hashes
    const fpServer = this.generateServerFingerprint(result.components);
    const fpCombined = crypto
      .createHash('sha256')
      .update(fpServer)
      .digest('hex');

    // Check if visitor exists
    const existing = await this.getVisitor(visitorId);

    if (existing) {
      // Update existing visitor
      await this.updateVisitor(visitorId, result, sessionId, fpServer, fpCombined);
    } else {
      // Create new visitor
      await this.createVisitor(visitorId, result, sessionId, fpServer, fpCombined);
    }

    // Cache in Redis
    await this.cacheFingerprint(visitorId, result);

    // Log visit
    await this.logVisit(visitorId, sessionId, ip, result);
  }

  /**
   * Get visitor by visitor ID
   */
  async getVisitor(visitorId: string): Promise<FingerprintRecord | null> {
    // Try Redis cache first
    const cached = await this.getCachedFingerprint(visitorId);
    if (cached) return cached;

    // Fallback to database
    const result = await this.db.query(
      `SELECT * FROM pzero.fingerprints WHERE visitor_id = $1`,
      [visitorId]
    );

    if (result.rows.length === 0) return null;

    const record = this.mapToRecord(result.rows[0]);

    // Cache for next time
    await this.cacheFingerprint(visitorId, this.mapRecordToResult(record));

    return record;
  }

  /**
   * Get visitor history
   */
  async getVisitorHistory(visitorId: string): Promise<VisitorHistory | null> {
    const visitor = await this.getVisitor(visitorId);
    if (!visitor) return null;

    // Get all sessions
    const sessionsResult = await this.db.query(
      `SELECT
        session_id,
        c_at as timestamp,
        ip,
        fp_components->>'http'->>'headers'->>'userAgent' as user_agent,
        visit_count as page_views
      FROM pzero.fingerprint_visits
      WHERE visitor_id = $1
      ORDER BY c_at DESC
      LIMIT 100`,
      [visitorId]
    );

    // Get fingerprint changes
    const changesResult = await this.db.query(
      `SELECT * FROM pzero.fingerprint_changes
      WHERE visitor_id = $1
      ORDER BY timestamp DESC
      LIMIT 50`,
      [visitorId]
    );

    return {
      visitorId,
      firstSeen: visitor.first_seen,
      lastSeen: visitor.last_seen,
      visitCount: visitor.visit_count,
      sessions: sessionsResult.rows.map((row: any) => ({
        sessionId: row.session_id,
        timestamp: row.timestamp,
        ip: row.ip,
        userAgent: row.user_agent || '',
        duration: 0, // TODO: Calculate from timing data
        pageViews: row.page_views || 1,
      })),
      changes: changesResult.rows.map((row: any) => ({
        timestamp: row.timestamp,
        component: row.component,
        oldValue: row.old_value,
        newValue: row.new_value,
        significance: row.significance,
      })),
    };
  }

  /**
   * Search fingerprints by IP
   */
  async findByIP(ip: string): Promise<FingerprintRecord[]> {
    const result = await this.db.query(
      `SELECT * FROM pzero.fingerprints
      WHERE ip = $1
      ORDER BY last_seen DESC
      LIMIT 100`,
      [ip]
    );

    return result.rows.map(this.mapToRecord);
  }

  /**
   * Search fingerprints by JA3 hash
   */
  async findByJA3(ja3Hash: string): Promise<FingerprintRecord[]> {
    const result = await this.db.query(
      `SELECT * FROM pzero.fingerprints
      WHERE ja3_hash = $1
      ORDER BY last_seen DESC
      LIMIT 100`,
      [ja3Hash]
    );

    return result.rows.map(this.mapToRecord);
  }

  /**
   * Get bot statistics
   */
  async getBotStats(timeRange: string = '24h'): Promise<any> {
    const interval = this.parseTimeRange(timeRange);

    const result = await this.db.query(
      `SELECT
        COUNT(*) as total_requests,
        COUNT(DISTINCT visitor_id) as unique_visitors,
        SUM(CASE WHEN is_bot THEN 1 ELSE 0 END) as bot_count,
        AVG(bot_score) as avg_bot_score,
        AVG(risk_score) as avg_risk_score
      FROM pzero.fingerprint_visits
      WHERE c_at > NOW() - INTERVAL '${interval}'`
    );

    return result.rows[0];
  }

  /**
   * Get top bot types
   */
  async getTopBotTypes(limit: number = 10): Promise<any[]> {
    const result = await this.db.query(
      `SELECT
        intelligence->'bot'->>'type' as bot_type,
        COUNT(*) as count
      FROM pzero.fingerprints
      WHERE is_bot = true
      GROUP BY bot_type
      ORDER BY count DESC
      LIMIT $1`,
      [limit]
    );

    return result.rows;
  }

  /**
   * Create new visitor record
   */
  private async createVisitor(
    visitorId: string,
    result: FingerprintResult,
    sessionId: string,
    fpServer: string,
    fpCombined: string
  ): Promise<void> {
    const components = result.components;
    const intelligence = result.intelligence;

    await this.db.query(
      `INSERT INTO pzero.fingerprints (
        id, visitor_id, session_id, ip, fp, fp_server, fp_combined,
        fp_components, ja3_hash, tls_fingerprint, http2_fingerprint,
        intelligence, bot_score, risk_score, is_bot, is_vpn, is_proxy,
        is_tor, asn, visit_count, first_seen, last_seen, c_at, u_at
      ) VALUES (
        gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16, $17, $18, 1, NOW(), NOW(), NOW(), NOW()
      )`,
      [
        visitorId,
        sessionId,
        components.network.ip,
        fpCombined, // fp (legacy)
        fpServer,
        fpCombined,
        JSON.stringify(components),
        components.tls?.ja3 || null,
        components.tls ? JSON.stringify(components.tls) : null,
        components.http2 ? JSON.stringify(components.http2) : null,
        JSON.stringify(intelligence),
        intelligence.bot.probability,
        intelligence.risk.score,
        intelligence.bot.isBot,
        components.network.proxies.isVPN,
        components.network.proxies.isProxy,
        components.network.proxies.isTor,
        components.network.asn?.number.toString() || null,
      ]
    );
  }

  /**
   * Update existing visitor record
   */
  private async updateVisitor(
    visitorId: string,
    result: FingerprintResult,
    sessionId: string,
    fpServer: string,
    fpCombined: string
  ): Promise<void> {
    const components = result.components;
    const intelligence = result.intelligence;

    // Get current record to detect changes
    const current = await this.getVisitor(visitorId);
    if (current) {
      await this.detectAndLogChanges(visitorId, current.fp_components, components);
    }

    await this.db.query(
      `UPDATE pzero.fingerprints SET
        session_id = $2,
        ip = $3,
        fp = $4,
        fp_server = $5,
        fp_combined = $6,
        fp_components = $7,
        ja3_hash = $8,
        tls_fingerprint = $9,
        http2_fingerprint = $10,
        intelligence = $11,
        bot_score = $12,
        risk_score = $13,
        is_bot = $14,
        is_vpn = $15,
        is_proxy = $16,
        is_tor = $17,
        asn = $18,
        visit_count = visit_count + 1,
        last_seen = NOW(),
        u_at = NOW()
      WHERE visitor_id = $1`,
      [
        visitorId,
        sessionId,
        components.network.ip,
        fpCombined,
        fpServer,
        fpCombined,
        JSON.stringify(components),
        components.tls?.ja3 || null,
        components.tls ? JSON.stringify(components.tls) : null,
        components.http2 ? JSON.stringify(components.http2) : null,
        JSON.stringify(intelligence),
        intelligence.bot.probability,
        intelligence.risk.score,
        intelligence.bot.isBot,
        components.network.proxies.isVPN,
        components.network.proxies.isProxy,
        components.network.proxies.isTor,
        components.network.asn?.number.toString() || null,
      ]
    );
  }

  /**
   * Log individual visit
   */
  private async logVisit(
    visitorId: string,
    sessionId: string,
    ip: string,
    result: FingerprintResult
  ): Promise<void> {
    await this.db.query(
      `INSERT INTO pzero.fingerprint_visits (
        id, visitor_id, session_id, ip, fp_components,
        bot_score, risk_score, c_at
      ) VALUES (
        gen_random_uuid(), $1, $2, $3, $4, $5, $6, NOW()
      )`,
      [
        visitorId,
        sessionId,
        ip,
        JSON.stringify(result.components),
        result.intelligence.bot.probability,
        result.intelligence.risk.score,
      ]
    );
  }

  /**
   * Detect and log fingerprint changes
   */
  private async detectAndLogChanges(
    visitorId: string,
    oldComponents: FingerprintComponents,
    newComponents: FingerprintComponents
  ): Promise<void> {
    const changes: FingerprintChange[] = [];

    // Check IP change
    if (oldComponents.network.ip !== newComponents.network.ip) {
      changes.push({
        timestamp: new Date(),
        component: 'network.ip',
        oldValue: oldComponents.network.ip,
        newValue: newComponents.network.ip,
        significance: 'major',
      });
    }

    // Check User-Agent change
    if (oldComponents.http.headers.userAgent !== newComponents.http.headers.userAgent) {
      changes.push({
        timestamp: new Date(),
        component: 'http.userAgent',
        oldValue: oldComponents.http.headers.userAgent,
        newValue: newComponents.http.headers.userAgent,
        significance: 'major',
      });
    }

    // Check JA3 change
    if (oldComponents.tls?.ja3 && newComponents.tls?.ja3 &&
        oldComponents.tls.ja3 !== newComponents.tls.ja3) {
      changes.push({
        timestamp: new Date(),
        component: 'tls.ja3',
        oldValue: oldComponents.tls.ja3,
        newValue: newComponents.tls.ja3,
        significance: 'critical',
      });
    }

    // Store changes
    for (const change of changes) {
      await this.db.query(
        `INSERT INTO pzero.fingerprint_changes (
          id, visitor_id, timestamp, component, old_value, new_value, significance
        ) VALUES (
          gen_random_uuid(), $1, $2, $3, $4, $5, $6
        )`,
        [
          visitorId,
          change.timestamp,
          change.component,
          JSON.stringify(change.oldValue),
          JSON.stringify(change.newValue),
          change.significance,
        ]
      );
    }
  }

  /**
   * Generate server-side fingerprint hash
   */
  private generateServerFingerprint(components: FingerprintComponents): string {
    const fingerprintString = [
      components.network.ipHash,
      components.tls?.ja3 || '',
      components.http2?.akamai || '',
      components.http.headerOrder.join(','),
      components.http.headers.userAgent,
      components.network.asn?.number || '',
    ].join('|');

    return crypto
      .createHash('sha256')
      .update(fingerprintString)
      .digest('hex');
  }

  /**
   * Cache fingerprint in Redis
   */
  private async cacheFingerprint(
    visitorId: string,
    result: FingerprintResult
  ): Promise<void> {
    if (!this.redis) return;

    const key = `fingerprint:${visitorId}`;
    const ttl = 3600; // 1 hour

    await this.redis.setex(
      key,
      ttl,
      JSON.stringify({
        visitorId: result.visitorId,
        components: result.components,
        intelligence: result.intelligence,
        timestamp: result.timestamp,
      })
    );
  }

  /**
   * Get cached fingerprint from Redis
   */
  private async getCachedFingerprint(visitorId: string): Promise<FingerprintRecord | null> {
    if (!this.redis) return null;

    const key = `fingerprint:${visitorId}`;
    const cached = await this.redis.get(key);

    if (!cached) return null;

    try {
      const data = JSON.parse(cached);
      // Convert cached result to record format
      return this.mapCachedToRecord(data);
    } catch {
      return null;
    }
  }

  /**
   * Map database row to FingerprintRecord
   */
  private mapToRecord(row: any): FingerprintRecord {
    return {
      id: row.id,
      visitor_id: row.visitor_id,
      session_id: row.session_id,
      ip: row.ip,
      fp: row.fp,
      fp_server: row.fp_server,
      fp_client: row.fp_client,
      fp_combined: row.fp_combined,
      fp_components: row.fp_components,
      ja3_hash: row.ja3_hash,
      tls_fingerprint: row.tls_fingerprint,
      http2_fingerprint: row.http2_fingerprint,
      tcp_fingerprint: row.tcp_fingerprint,
      intelligence: row.intelligence,
      bot_score: row.bot_score,
      risk_score: row.risk_score,
      is_bot: row.is_bot,
      is_vpn: row.is_vpn,
      is_proxy: row.is_proxy,
      is_tor: row.is_tor,
      asn: row.asn,
      visit_count: row.visit_count,
      first_seen: row.first_seen,
      last_seen: row.last_seen,
      c_at: row.c_at,
      u_at: row.u_at,
    };
  }

  /**
   * Map FingerprintRecord to FingerprintResult
   */
  private mapRecordToResult(record: FingerprintRecord): FingerprintResult {
    return {
      visitorId: record.visitor_id,
      confidence: {
        score: 0.85, // TODO: Calculate from components
      },
      components: record.fp_components,
      intelligence: record.intelligence,
      timestamp: record.u_at.getTime(),
    };
  }

  /**
   * Map cached data to FingerprintRecord
   */
  private mapCachedToRecord(data: any): FingerprintRecord {
    return {
      id: '',
      visitor_id: data.visitorId,
      session_id: '',
      ip: data.components.network.ip,
      fp: '',
      fp_server: '',
      fp_client: null,
      fp_combined: '',
      fp_components: data.components,
      ja3_hash: data.components.tls?.ja3 || null,
      tls_fingerprint: data.components.tls ? JSON.stringify(data.components.tls) : null,
      http2_fingerprint: data.components.http2 ? JSON.stringify(data.components.http2) : null,
      tcp_fingerprint: null,
      intelligence: data.intelligence,
      bot_score: data.intelligence.bot.probability,
      risk_score: data.intelligence.risk.score,
      is_bot: data.intelligence.bot.isBot,
      is_vpn: data.components.network.proxies.isVPN,
      is_proxy: data.components.network.proxies.isProxy,
      is_tor: data.components.network.proxies.isTor,
      asn: data.components.network.asn?.number.toString() || null,
      visit_count: 0,
      first_seen: new Date(data.timestamp),
      last_seen: new Date(data.timestamp),
      c_at: new Date(data.timestamp),
      u_at: new Date(data.timestamp),
    };
  }

  /**
   * Parse time range string to PostgreSQL interval
   */
  private parseTimeRange(range: string): string {
    const units: Record<string, string> = {
      h: 'hours',
      d: 'days',
      w: 'weeks',
      m: 'months',
    };

    const match = range.match(/^(\d+)([hdwm])$/);
    if (!match) return '24 hours';

    const [, value, unit] = match;
    return `${value} ${units[unit]}`;
  }
}
