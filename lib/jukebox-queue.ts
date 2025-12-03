import Database from 'better-sqlite3';

/**
 * Transactional insert of a jukebox queue item with rate-limit check.
 * Throws an error with code 'RATE_LIMIT_EXCEEDED' if limit reached.
 */
export function addToQueueTransactional(db: Database.Database, params: {
  sequence_name: string;
  media_name?: string | null;
  requester_name?: string | null;
  requester_ip: string;
  rateLimit: number;
  latitude?: number | null;
  longitude?: number | null;
  city?: string | null;
  region?: string | null;
  countryCode?: string | null;
  distanceFromShow?: number | null;
}) {
  const { 
    sequence_name, 
    media_name, 
    requester_name, 
    requester_ip, 
    rateLimit,
    latitude,
    longitude,
    city,
    region,
    countryCode,
    distanceFromShow
  } = params;

  const insert = db.prepare(`
    INSERT INTO jukebox_queue (
      sequence_name, media_name, requester_name, requester_ip,
      latitude, longitude, city, region, country_code, distance_from_show
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const countStmt = db.prepare(`SELECT COUNT(*) as count FROM jukebox_queue WHERE requester_ip = ? AND created_at >= datetime('now', '-1 hour')`);
  const duplicateStmt = db.prepare(`SELECT id FROM jukebox_queue WHERE requester_ip = ? AND sequence_name = ? AND created_at >= datetime('now', '-5 minutes') LIMIT 1`);

  const tx = db.transaction(() => {
    // Check duplicate first
    const duplicate = duplicateStmt.get(requester_ip, sequence_name);
    if (duplicate) {
      const err: any = new Error('DuplicateRequest');
      err.code = 'DUPLICATE_REQUEST';
      throw err;
    }

    const countRow = countStmt.get(requester_ip) as { count: number };
    const used = countRow.count;

    if (used >= rateLimit) {
      const err: any = new Error('RateLimitExceeded');
      err.code = 'RATE_LIMIT_EXCEEDED';
      err.requestsUsed = used;
      throw err;
    }

    // Insert the queue item with location data
    const res = insert.run(
      sequence_name, 
      media_name || null, 
      requester_name || 'Anonymous', 
      requester_ip,
      latitude || null,
      longitude || null,
      city || null,
      region || null,
      countryCode || null,
      distanceFromShow || null
    );
    return { id: res.lastInsertRowid, requestsUsed: used + 1 };
  });

  return tx();
}
