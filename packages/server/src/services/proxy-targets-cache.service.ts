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
 * If cache is expired or missing, fetches from database and refreshes cache
 * @returns Array of proxy targets or null if database fetch fails
 */
export async function getProxyTargetsFromCache(): Promise<ProxyTarget[] | null> {
  try {
    // Check if cache exists and is not expired
    const cacheExists = await redis.exists(PROXY_TARGETS_CACHE_KEY);
    const ttl = await redis.ttl(PROXY_TARGETS_CACHE_KEY);
    
    // If cache doesn't exist or is expired (TTL <= 0), refresh from database
    if (!cacheExists || ttl <= 0) {
      console.log('Proxy targets cache expired or missing, refreshing from database...');
      try {
        return await refreshProxyTargetsCache();
      } catch (error) {
        console.error('Failed to refresh proxy targets cache:', error);
        return null;
      }
    }
    
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
 * If cache is expired or missing, fetches from database and refreshes cache
 * @param id Proxy target ID
 * @returns Proxy target or null if not found
 */
export async function getProxyTargetById(
  id: string,
): Promise<ProxyTarget | null> {
  // Use getProxyTargetsFromCache which handles cache expiration automatically
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

