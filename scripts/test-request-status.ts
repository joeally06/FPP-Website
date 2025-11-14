import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { getUtcSqlNow, getUtcSqlTimestampOffset } from '../lib/time-utils';

(async () => {
  const tmpDir = path.join(process.cwd(), 'tmp');
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

  const dbPath = path.join(tmpDir, 'test-request-status.db');
  if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);

  (process.env as any).VOTES_DB_PATH = dbPath;

  const db = new Database(dbPath);
  try {
    // Create settings and jukebox_queue
    db.exec(`
      CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT);
    `);

    db.exec(`
      CREATE TABLE jukebox_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sequence_name TEXT NOT NULL,
        media_name TEXT,
        requester_name TEXT,
        requester_ip TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Insert rate limit setting
    db.prepare(`INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)`)
      .run('jukebox_rate_limit', '4');

    const now = getUtcSqlNow();
    const thirtyMinAgo = getUtcSqlTimestampOffset(30, 'minutes');
    const twoHoursAgo = getUtcSqlTimestampOffset(2, 'hours');

    // Insert 2 recent items and 1 older item for the given IP
    db.prepare(`INSERT INTO jukebox_queue (sequence_name, requester_name, requester_ip, created_at) VALUES (?, ?, ?, ?)`)
      .run('song-1', 'Tester', '203.0.113.1', thirtyMinAgo);
    db.prepare(`INSERT INTO jukebox_queue (sequence_name, requester_name, requester_ip, created_at) VALUES (?, ?, ?, ?)`)
      .run('song-2', 'Tester', '203.0.113.1', now);
    db.prepare(`INSERT INTO jukebox_queue (sequence_name, requester_name, requester_ip, created_at) VALUES (?, ?, ?, ?)`)
      .run('song-old', 'Tester', '203.0.113.1', twoHoursAgo);

    // Now run a mini-simulation of the request-status SQL
    const oneHourAgo = getUtcSqlTimestampOffset(1, 'hours');
    const res = db.prepare(`SELECT COUNT(*) as count FROM jukebox_queue WHERE requester_ip = ? AND created_at >= ?`).get('203.0.113.1', oneHourAgo) as { count: number };

    const requestsUsed = res.count;
    const rateLimit = 4;
    const requestsRemaining = Math.max(0, rateLimit - requestsUsed);

    console.log('[test-request-status] used:', requestsUsed, 'remaining:', requestsRemaining);

    if (requestsUsed !== 2) {
      console.error('[test-request-status] ❌ Unexpected used count', requestsUsed);
      process.exit(2);
    }

    if (requestsRemaining !== 2) {
      console.error('[test-request-status] ❌ Unexpected remaining value', requestsRemaining);
      process.exit(3);
    }

    console.log('[test-request-status] ✅ Request-status SQL logic validated');
    process.exit(0);
  } catch (err) {
    console.error('[test-request-status] Error during test:', err);
    process.exit(1);
  } finally {
    db.close();
  }
})();
