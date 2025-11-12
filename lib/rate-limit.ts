import Database from 'better-sqlite3';
import path from 'path';

// Separate database for settings (votes.db)
const votesDbPath = path.join(process.cwd(), 'votes.db');

/**
 * Get the rate limit for song requests from settings
 * Opens a fresh connection each time to avoid caching stale values
 */
export function getSongRequestRateLimit(): number {
  let settingsDb: Database.Database | null = null;
  
  try {
    // Open fresh connection each time to get latest value
    settingsDb = new Database(votesDbPath, { readonly: true });
    
    const row = settingsDb.prepare('SELECT value FROM settings WHERE key = ?')
      .get('jukebox_rate_limit') as { value: string } | undefined;
    
    if (row) {
      const limit = parseInt(row.value, 10);
      if (!isNaN(limit) && limit >= 1 && limit <= 10) {
        console.log(`[RATE LIMIT] Current rate limit: ${limit} requests/hour`);
        return limit;
      }
    }
  } catch (error) {
    console.error('[RATE LIMIT] Error reading jukebox_rate_limit setting:', error);
  } finally {
    // Always close the connection
    if (settingsDb) {
      settingsDb.close();
    }
  }
  
  // Default to 3 if not set or error
  console.log('[RATE LIMIT] Using default rate limit: 3 requests/hour');
  return 3;
}

/**
 * Extract client IP from request headers
 */
export function getClientIP(request: Request): string {
  const headers = request.headers;
  
  // Check common proxy headers
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  const realIp = headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  const cfConnectingIp = headers.get('cf-connecting-ip');
  if (cfConnectingIp) {
    return cfConnectingIp;
  }

  // Fallback to a placeholder (shouldn't happen with Cloudflare)
  return 'unknown';
}
