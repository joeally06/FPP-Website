const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

console.log('📊 Database Statistics\n');
console.log('='.repeat(50));

const dbPath = path.join(process.cwd(), 'votes.db');

if (!fs.existsSync(dbPath)) {
  console.log('❌ Database not found. Run: npm run setup');
  process.exit(1);
}

const db = new Database(dbPath, { readonly: true });

// Get database configuration
const journalMode = db.pragma('journal_mode', { simple: true });
const syncMode = db.pragma('synchronous', { simple: true });
const cacheSize = db.pragma('cache_size', { simple: true });
const mmapSize = db.pragma('mmap_size', { simple: true });

// Get database size
const pageSize = db.pragma('page_size', { simple: true });
const pageCount = db.pragma('page_count', { simple: true });
const dbSizeMB = (pageSize * pageCount) / (1024 * 1024);

// Get table and index counts
const stats = db.prepare(`
  SELECT 
    (SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%') as table_count,
    (SELECT COUNT(*) FROM sqlite_master WHERE type='index' AND name NOT LIKE 'sqlite_%') as index_count
`).get();

console.log('\n📁 Database Configuration:');
console.log(`   Journal Mode: ${journalMode}`);
console.log(`   Synchronous: ${syncMode}`);
console.log(`   Cache Size: ${Math.abs(cacheSize) / 1024} MB`);
console.log(`   Memory-mapped I/O: ${(mmapSize / (1024 * 1024)).toFixed(0)} MB`);
console.log(`   Database Size: ${dbSizeMB.toFixed(2)} MB`);
console.log(`   Tables: ${stats.table_count}`);
console.log(`   Indexes: ${stats.index_count}`);

// Get record counts for each table
console.log('\n📊 Table Statistics:');

const tables = db.prepare(`
  SELECT name FROM sqlite_master 
  WHERE type='table' 
  AND name NOT LIKE 'sqlite_%'
  AND name NOT LIKE 'schema_migrations'
  ORDER BY name
`).all();

tables.forEach(({ name }) => {
  const count = db.prepare(`SELECT COUNT(*) as count FROM ${name}`).get();
  console.log(`   ${name.padEnd(25)} ${count.count.toLocaleString().padStart(10)} records`);
});

// Get migration history
console.log('\n🔄 Migration History:');
const migrations = db.prepare(`
  SELECT version, applied_at 
  FROM schema_migrations 
  ORDER BY applied_at DESC 
  LIMIT 10
`).all();

if (migrations.length === 0) {
  console.log('   No migrations applied yet');
} else {
  migrations.forEach(m => {
    console.log(`   ${m.version.padEnd(30)} ${m.applied_at}`);
  });
}

// Get recent activity (last 24 hours)
console.log('\n📈 Recent Activity (Last 24 Hours):');

const recentVotes = db.prepare(`
  SELECT COUNT(*) as count FROM votes 
  WHERE created_at >= datetime('now', '-1 day')
`).get();

const recentRequests = db.prepare(`
  SELECT COUNT(*) as count FROM jukebox_queue 
  WHERE created_at >= datetime('now', '-1 day')
`).get();

const recentLetters = db.prepare(`
  SELECT COUNT(*) as count FROM santa_letters 
  WHERE created_at >= datetime('now', '-1 day')
`).get();

const recentPageViews = db.prepare(`
  SELECT COUNT(*) as count FROM page_views 
  WHERE view_time >= datetime('now', '-1 day')
`).get();

console.log(`   Votes: ${recentVotes.count.toLocaleString()}`);
console.log(`   Song Requests: ${recentRequests.count.toLocaleString()}`);
console.log(`   Santa Letters: ${recentLetters.count.toLocaleString()}`);
console.log(`   Page Views: ${recentPageViews.count.toLocaleString()}`);

// Get top requested sequences
console.log('\n🎵 Top 10 Requested Sequences:');
const topSequences = db.prepare(`
  SELECT sequence_name, total_requests 
  FROM sequence_requests 
  ORDER BY total_requests DESC 
  LIMIT 10
`).all();

if (topSequences.length === 0) {
  console.log('   No requests yet');
} else {
  topSequences.forEach((seq, index) => {
    console.log(`   ${(index + 1).toString().padStart(2)}. ${seq.sequence_name.padEnd(40)} ${seq.total_requests.toString().padStart(6)} requests`);
  });
}

// Database health check
console.log('\n🔍 Database Health:');
const integrityCheck = db.pragma('integrity_check', { simple: true });
console.log(`   Integrity: ${integrityCheck === 'ok' ? '✅ OK' : '❌ ' + integrityCheck}`);

// WAL file size if exists
const walPath = dbPath + '-wal';
if (fs.existsSync(walPath)) {
  const walSizeMB = fs.statSync(walPath).size / (1024 * 1024);
  console.log(`   WAL File Size: ${walSizeMB.toFixed(2)} MB`);
}

console.log('\n' + '='.repeat(50));
console.log('');

db.close();
