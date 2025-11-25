/**
 * Parses a Redis URL and extracts connection components
 * Supports formats:
 * - redis://[username]:[password]@host:port[/db]
 * - redis://:password@host:port[/db]
 * - redis://host:port[/db]
 */
export interface ParsedRedisUrl {
  host: string;
  port: number;
  username?: string;
  password?: string;
  db?: number;
}

export function parseRedisUrl(url: string): ParsedRedisUrl {
  try {
    const parsed = new URL(url);

    if (parsed.protocol !== "redis:") {
      throw new Error(`Invalid Redis URL protocol: ${parsed.protocol}`);
    }

    const result: ParsedRedisUrl = {
      host: parsed.hostname || "localhost",
      port: parsed.port ? parseInt(parsed.port, 10) : 6379,
    };

    // Extract username and password from userinfo
    if (parsed.username && parsed.username.length > 0) {
      result.username = decodeURIComponent(parsed.username);
    }
    if (parsed.password && parsed.password.length > 0) {
      result.password = decodeURIComponent(parsed.password);
    }

    // Extract database number from pathname (e.g., /0, /1)
    if (parsed.pathname && parsed.pathname.length > 1) {
      const dbMatch = parsed.pathname.match(/^\/(\d+)$/);
      if (dbMatch && dbMatch[1]) {
        result.db = parseInt(dbMatch[1], 10);
      }
    }

    return result;
  } catch (error) {
    throw new Error(
      `Failed to parse Redis URL: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
