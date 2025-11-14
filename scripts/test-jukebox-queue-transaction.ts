import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { addToQueueTransactional } from '../lib/jukebox-queue';

(async () => {
  const tmpDir = path.join(process.cwd(), 'tmp');
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

  const dbPath = path.join(tmpDir, 'test-jukebox-queue.db');
  if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);

  const db = new Database(dbPath);
  try {
    // Create minimal schema
    db.exec(`
      CREATE TABLE IF NOT EXISTS jukebox_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sequence_name TEXT NOT NULL,
        media_name TEXT,
        requester_name TEXT,
        requester_ip TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        priority INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Set test rate limit
    const rateLimit = 3;
    const requesterIp = '192.0.2.1';

    // Insert rateLimit items to reach limit
    const stmt = db.prepare(`INSERT INTO jukebox_queue (sequence_name, media_name, requester_name, requester_ip) VALUES (?, ?, ?, ?)`);
    for (let i = 0; i < rateLimit; i++) {
      stmt.run(`song-${i}`, null, 'Tester', requesterIp);
    }

    console.log('[test] Inserted initial items to reach rate limit');

    // Attempt to insert one more using transactional helper
    try {
      addToQueueTransactional(db, {
        sequence_name: 'song-4',
        media_name: null,
        requester_name: 'Tester',
        requester_ip: requesterIp,
        rateLimit
      });
      console.error('[test] ❌ Expected rate limit to block, but insert succeeded');
      process.exit(2);
    } catch (err: any) {
      if (err.code === 'RATE_LIMIT_EXCEEDED') {
        console.log('[test] ✅ Rate limit enforced as expected');
      } else {
        console.error('[test] ❌ Unexpected error:', err);
        process.exit(3);
      }
    }

    // Now test concurrency: start with 2 items used, rate limit 3
    // Create fresh DB
  } catch (err) {
    console.error('[test] Error during test:', err);
    process.exit(1);
  } finally {
    db.close();
  }

  // Test concurrency scenario
  const db2Path = path.join(tmpDir, 'test-jukebox-queue-2.db');
  if (fs.existsSync(db2Path)) fs.unlinkSync(db2Path);
  const db2 = new Database(db2Path);
  try {
    db2.exec(`
      CREATE TABLE IF NOT EXISTS jukebox_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sequence_name TEXT NOT NULL,
        media_name TEXT,
        requester_name TEXT,
        requester_ip TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        priority INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    const rateLimit2 = 3;
    const ip2 = '192.0.2.2';
    const stmt2 = db2.prepare(`INSERT INTO jukebox_queue (sequence_name, media_name, requester_name, requester_ip) VALUES (?, ?, ?, ?)`);
    stmt2.run('a', null, 'Tester', ip2);
    stmt2.run('b', null, 'Tester', ip2); // 2 used

    // Concurrent attempts: attempt to insert two entries simultaneously
    const p1 = new Promise((resolve, reject) => {
      try {
        const res = addToQueueTransactional(db2, {
          sequence_name: 'concurrent-1',
          requester_ip: ip2,
          rateLimit: rateLimit2
        } as any);
        resolve(res);
      } catch (e) {
        reject(e);
      }
    });

    const p2 = new Promise((resolve, reject) => {
      try {
        const res = addToQueueTransactional(db2, {
          sequence_name: 'concurrent-2',
          requester_ip: ip2,
          rateLimit: rateLimit2
        } as any);
        resolve(res);
      } catch (e) {
        reject(e);
      }
    });

    try {
      const [r1, r2] = await Promise.all([p1, p2].map(p => p.catch(err => err)));
      const results = [r1, r2];
      const successCount = results.filter(r => !(r instanceof Error)).length;
      const errorCount = results.filter(r => r instanceof Error && (r as any).code === 'RATE_LIMIT_EXCEEDED').length;

      console.log(`[concurrency test] success: ${successCount}, rate-limited: ${errorCount}`);
      if (successCount === 1 && errorCount === 1) {
        console.log('[test] ✅ Concurrency: only one of the concurrent inserts succeeded, the other was rate-limited');
      } else {
        console.error('[test] ❌ Concurrency test failed');
        process.exit(4);
      }
    } catch (err) {
      console.error('[test] Unexpected concurrency error:', err);
      process.exit(5);
    }
  } finally {
    db2.close();
  }

  process.exit(0);
})();
