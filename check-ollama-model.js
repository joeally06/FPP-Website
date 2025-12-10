// Quick check of ollama_model setting
const Database = require('better-sqlite3');
const db = new Database('votes.db');

console.log('\n📋 Current ollama_model setting:');
const row = db.prepare('SELECT * FROM settings WHERE key = ?').get('ollama_model');
console.log(JSON.stringify(row, null, 2));

console.log('\n📋 All santa category settings:');
const santaSettings = db.prepare('SELECT * FROM settings WHERE category = ?').all('santa');
santaSettings.forEach(s => {
  console.log(`  ${s.key} = ${s.value}`);
});

db.close();
