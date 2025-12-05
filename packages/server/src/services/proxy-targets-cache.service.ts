import { db } from "../config/database.js";
import { redis } from "../config/redis.js";

const PROXY_TARGETS_CACHE_KEY = "proxy_targets:all";
const CACHE_TTL_SECONDS = 3600; // 1 hour

export interface ProxyTarget {
  id: string;
  name: string;
  url: string;
  port: number;
}

/**
 * Fetch all proxy targets from database and cache them in Redis
 * @returns Array of proxy targets
 */
export async function refreshProxyTargetsCache(): Promise<ProxyTarget[]> {
  try {
    // Fetch all proxy targets from database
    const query = `
      SELECT id, name, url, port
      FROM pzero.proxy_targets
      ORDER BY created_at ASC
    `;

    const result = await db.query(query);
    const proxyTargets: ProxyTarget[] = result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      url: row.url,
      port: row.port,
    }));

    // Cache in Redis with 1 hour TTL
    await redis.set(
      PROXY_TARGETS_CACHE_KEY,
      JSON.stringify(proxyTargets),
      CACHE_TTL_SECONDS,
    );

    console.log(
      `✅ Cached ${proxyTargets.length} proxy target(s) in Redis (TTL: ${CACHE_TTL_SECONDS}s)`,
    );

    return proxyTargets;
  } catch (error) {
    console.error("Error refreshing proxy targets cache:", error);
    throw error;
  }
}

/**
 * Get proxy targets from Redis cache
 * @returns Array of proxy targets or null if not cached
 */
export async function getProxyTargetsFromCache(): Promise<ProxyTarget[] | null> {
  try {
    const cachedData = await redis.get(PROXY_TARGETS_CACHE_KEY);
    if (!cachedData) {
      return null;
    }

    return JSON.parse(cachedData) as ProxyTarget[];
  } catch (error) {
    console.error("Error reading proxy targets from cache:", error);
    return null;
  }
}

/**
 * Get proxy target by ID from cache
 * @param id Proxy target ID
 * @returns Proxy target or null if not found
 */
export async function getProxyTargetById(
  id: string,
): Promise<ProxyTarget | null> {
  const targets = await getProxyTargetsFromCache();
  if (!targets) {
    return null;
  }

  return targets.find((target) => target.id === id) || null;
}

/**
 * Clear the proxy targets cache
 */
export async function clearProxyTargetsCache(): Promise<void> {
  try {
    await redis.delete(PROXY_TARGETS_CACHE_KEY);
    console.log("✅ Cleared proxy targets cache");
  } catch (error) {
    console.error("Error clearing proxy targets cache:", error);
    throw error;
  }
}

