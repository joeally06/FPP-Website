const Database = require('better-sqlite3');
const db = new Database('votes.db');

const tables = db.prepare(`
  SELECT name FROM sqlite_master 
  WHERE type='table' 
  ORDER BY name
`).all();

console.log('\n📋 Database Tables:');
tables.forEach(table => {
  const count = db.prepare(`SELECT COUNT(*) as count FROM ${table.name}`).get();
  console.log(`   ✓ ${table.name.padEnd(35)} (${count.count} rows)`);
});

// Check specifically for our new tables
console.log('\n🔍 Checking new security cache tables:');
const hasFppStatus = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='fpp_status'`).get();
const hasCachedPlaylists = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='cached_playlists'`).get();

console.log(`   ${hasFppStatus ? '✅' : '❌'} fpp_status table`);
console.log(`   ${hasCachedPlaylists ? '✅' : '❌'} cached_playlists table\n`);

db.close();
