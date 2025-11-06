const Database = require('better-sqlite3');

const db = new Database('votes.db');

console.log('📋 Verifying spotify_metadata table...\n');

// Check table exists
const tableExists = db.prepare(`
  SELECT name FROM sqlite_master 
  WHERE type='table' AND name='spotify_metadata'
`).get();

if (tableExists) {
  console.log('✅ Table "spotify_metadata" exists');
} else {
  console.log('❌ Table "spotify_metadata" not found');
  db.close();
  process.exit(1);
}

// Check columns
const columns = db.prepare('PRAGMA table_info(spotify_metadata)').all();
console.log(`\n📊 Columns (${columns.length}):`);
columns.forEach(col => {
  console.log(`   - ${col.name} (${col.type})${col.pk ? ' [PRIMARY KEY]' : ''}`);
});

// Check indexes
const indexes = db.prepare(`
  SELECT name FROM sqlite_master 
  WHERE type='index' AND tbl_name='spotify_metadata'
`).all();
console.log(`\n🔍 Indexes (${indexes.length}):`);
indexes.forEach(idx => {
  console.log(`   - ${idx.name}`);
});

// Check row count
const rowCount = db.prepare('SELECT COUNT(*) as count FROM spotify_metadata').get();
console.log(`\n📈 Current row count: ${rowCount.count}`);

console.log('\n✅ Verification complete!\n');

db.close();
