const Database = require('better-sqlite3');
const db = new Database('votes.db');

console.log('\n📊 Jukebox Settings:\n');

const settings = db.prepare(`
  SELECT * FROM settings 
  WHERE key LIKE 'jukebox%'
`).all();

settings.forEach(setting => {
  console.log(`  ${setting.key}: ${setting.value}`);
  console.log(`  Updated: ${setting.updated_at}\n`);
});

db.close();
