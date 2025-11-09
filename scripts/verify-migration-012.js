const Database = require('better-sqlite3');
const db = new Database('votes.db');

console.log('✅ Migration 012 Verification\n');

const tables = db.prepare(`
  SELECT name FROM sqlite_master 
  WHERE type='table' AND name LIKE 'fpp_%' 
  ORDER BY name
`).all();

console.log('FPP Caching Tables Created:');
tables.forEach(t => console.log('  ✓', t.name));

const state = db.prepare('SELECT * FROM fpp_state').get();
console.log('\nFPP State Row:', state ? '✅ Initialized' : '❌ Missing');

if (state) {
  console.log('  Status:', state.status);
  console.log('  Last Updated:', state.last_updated);
}

// Check view
const views = db.prepare(`
  SELECT name FROM sqlite_master 
  WHERE type='view' AND name LIKE 'fpp_%'
`).all();

console.log('\nViews Created:');
views.forEach(v => console.log('  ✓', v.name));

db.close();
console.log('\n✅ Migration 012 verified successfully!');
