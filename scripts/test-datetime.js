const Database = require('better-sqlite3');
const db = new Database('votes.db');

const result = db.prepare(`
  SELECT 
    datetime('now') as utc_now,
    datetime('now', '-1 hour') as utc_hour_ago,
    datetime('now', 'localtime') as local_now,
    datetime('now', 'localtime', '-1 hour') as local_hour_ago
`).get();

console.log('SQLite Datetime Functions:');
console.log('UTC Now:', result.utc_now);
console.log('UTC 1 Hour Ago:', result.utc_hour_ago);
console.log('Local Now:', result.local_now);
console.log('Local 1 Hour Ago:', result.local_hour_ago);

// Check latest entry
const latest = db.prepare(`
  SELECT id, sequence_name, created_at 
  FROM jukebox_queue 
  ORDER BY id DESC 
  LIMIT 1
`).get();

console.log('\nLatest Entry:');
console.log('  ID:', latest.id);
console.log('  Created At:', latest.created_at);

// Test comparisons
const countUtc = db.prepare(`
  SELECT COUNT(*) as count 
  FROM jukebox_queue 
  WHERE created_at > datetime('now', '-1 hour')
`).get();

const countLocal = db.prepare(`
  SELECT COUNT(*) as count 
  FROM jukebox_queue 
  WHERE created_at > datetime('now', 'localtime', '-1 hour')
`).get();

console.log('\nComparison Results:');
console.log('  Using UTC datetime:', countUtc.count, 'entries');
console.log('  Using LOCAL datetime:', countLocal.count, 'entries');

db.close();
