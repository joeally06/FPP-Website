import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'fpp-control.db');
const db = new Database(dbPath);

// Initialize rate limiting tables
db.exec(`
  CREATE TABLE IF NOT EXISTS rate_limits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    identifier TEXT NOT NULL,
    limiter TEXT NOT NULL,
    points INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_rate_limits_lookup 
  ON rate_limits(identifier, limiter, expires_at);

  CREATE TABLE IF NOT EXISTS rate_limit_blocks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    identifier TEXT NOT NULL,
    limiter TEXT NOT NULL,
    blocked_until INTEGER NOT NULL,
    blocked_at INTEGER NOT NULL,
    reason TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_rate_limit_blocks_lookup
  ON rate_limit_blocks(identifier, limiter, blocked_until);
`);

interface RateLimitConfig {
  points: number;        // Number of requests allowed
  duration: number;      // Time window in seconds
  blockDuration: number; // How long to block after exceeding (seconds)
}

interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetAt: Date;
  blocked?: boolean;
  blockedUntil?: Date;
}

export class RateLimiter {
  constructor(
    private name: string,
    private config: RateLimitConfig
  ) {}

  /**
   * Check if request is allowed
   * @param identifier - Unique identifier (usually IP address)
   * @returns Rate limit result
   */
  check(identifier: string): RateLimitResult {
    const now = Date.now();
    const expiresAt = now + (this.config.duration * 1000);

    // Check if currently blocked
    const block = db.prepare(`
      SELECT blocked_until 
      FROM rate_limit_blocks 
      WHERE identifier = ? 
        AND limiter = ? 
        AND blocked_until > ?
      ORDER BY blocked_until DESC
      LIMIT 1
    `).get(identifier, this.name, now) as { blocked_until: number } | undefined;

    if (block) {
      const blockedUntil = new Date(block.blocked_until);
      console.warn(`[RATE LIMIT] Blocked request from ${identifier} (limiter: ${this.name}, blocked until: ${blockedUntil.toISOString()})`);
      
      return {
        success: false,
        remaining: 0,
        resetAt: blockedUntil,
        blocked: true,
        blockedUntil
      };
    }

    // Clean up expired entries
    db.prepare(`
      DELETE FROM rate_limits 
      WHERE expires_at < ?
    `).run(now);

    // Count current points
    const currentPoints = db.prepare(`
      SELECT COALESCE(SUM(points), 0) as total
      FROM rate_limits
      WHERE identifier = ?
        AND limiter = ?
        AND expires_at > ?
    `).get(identifier, this.name, now) as { total: number };

    const consumed = currentPoints.total;
    const remaining = Math.max(0, this.config.points - consumed - 1);

    // Check if limit exceeded
    if (consumed >= this.config.points) {
      // Create block
      const blockedUntil = now + (this.config.blockDuration * 1000);
      
      db.prepare(`
        INSERT INTO rate_limit_blocks (identifier, limiter, blocked_until, blocked_at, reason)
        VALUES (?, ?, ?, ?, ?)
      `).run(
        identifier, 
        this.name, 
        blockedUntil, 
        now,
        `Exceeded ${this.config.points} requests in ${this.config.duration}s`
      );

      console.warn(`[RATE LIMIT] Blocking ${identifier} for ${this.config.blockDuration}s (limiter: ${this.name})`);

      return {
        success: false,
        remaining: 0,
        resetAt: new Date(blockedUntil),
        blocked: true,
        blockedUntil: new Date(blockedUntil)
      };
    }

    // Add new entry
    db.prepare(`
      INSERT INTO rate_limits (identifier, limiter, points, created_at, expires_at)
      VALUES (?, ?, 1, ?, ?)
    `).run(identifier, this.name, now, expiresAt);

    // Find earliest expiration for reset time
    const earliestExpiry = db.prepare(`
      SELECT MIN(expires_at) as earliest
      FROM rate_limits
      WHERE identifier = ?
        AND limiter = ?
        AND expires_at > ?
    `).get(identifier, this.name, now) as { earliest: number };

    return {
      success: true,
      remaining,
      resetAt: new Date(earliestExpiry.earliest || expiresAt)
    };
  }

  /**
   * Manually reset rate limit for an identifier
   */
  reset(identifier: string): void {
    const now = Date.now();
    
    db.prepare(`
      DELETE FROM rate_limits
      WHERE identifier = ? AND limiter = ?
    `).run(identifier, this.name);

    db.prepare(`
      DELETE FROM rate_limit_blocks
      WHERE identifier = ? AND limiter = ?
    `).run(identifier, this.name);

    console.log(`[RATE LIMIT] Reset limits for ${identifier} (limiter: ${this.name})`);
  }

  /**
   * Get current status for an identifier
   */
  status(identifier: string): { consumed: number; remaining: number; blocked: boolean } {
    const now = Date.now();

    const block = db.prepare(`
      SELECT COUNT(*) as count
      FROM rate_limit_blocks
      WHERE identifier = ?
        AND limiter = ?
        AND blocked_until > ?
    `).get(identifier, this.name, now) as { count: number };

    const currentPoints = db.prepare(`
      SELECT COALESCE(SUM(points), 0) as total
      FROM rate_limits
      WHERE identifier = ?
        AND limiter = ?
        AND expires_at > ?
    `).get(identifier, this.name, now) as { total: number };

    return {
      consumed: currentPoints.total,
      remaining: Math.max(0, this.config.points - currentPoints.total),
      blocked: block.count > 0
    };
  }
}

// Pre-configured rate limiters for different endpoints
export const songRequestLimiter = new RateLimiter('song-request', {
  points: 3,              // 3 requests
  duration: 60 * 60,      // per hour
  blockDuration: 60 * 60  // block for 1 hour
});

export const santaLetterLimiter = new RateLimiter('santa-letter', {
  points: 2,              // 2 letters
  duration: 24 * 60 * 60, // per day
  blockDuration: 24 * 60 * 60 // block for 24 hours
});

export const votingLimiter = new RateLimiter('voting', {
  points: 10,             // 10 votes
  duration: 60 * 60,      // per hour
  blockDuration: 30 * 60  // block for 30 minutes
});

export const apiGeneralLimiter = new RateLimiter('api-general', {
  points: 100,            // 100 requests
  duration: 60,           // per minute
  blockDuration: 5 * 60   // block for 5 minutes
});

/**
 * Cleanup old rate limit entries (run periodically)
 */
export function cleanupRateLimits(): void {
  const now = Date.now();
  const oneDayAgo = now - (24 * 60 * 60 * 1000);

  const limitsDeleted = db.prepare(`
    DELETE FROM rate_limits WHERE expires_at < ?
  `).run(oneDayAgo);

  const blocksDeleted = db.prepare(`
    DELETE FROM rate_limit_blocks WHERE blocked_until < ?
  `).run(now);

  console.log(`[RATE LIMIT] Cleanup: removed ${limitsDeleted.changes} expired limits, ${blocksDeleted.changes} expired blocks`);
}

// Run cleanup on module load
cleanupRateLimits();

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
