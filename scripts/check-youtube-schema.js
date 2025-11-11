const Database = require('better-sqlite3');
const db = new Database('votes.db');

console.log('\n📋 youtube_videos table schema:');
const info = db.prepare('PRAGMA table_info(youtube_videos)').all();
info.forEach(col => {
  console.log(`   ${col.name.padEnd(20)} ${col.type.padEnd(10)} ${col.notnull ? 'NOT NULL' : ''}`);
});

db.close();
