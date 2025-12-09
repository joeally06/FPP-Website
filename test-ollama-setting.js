// Test script to verify ollama_model setting exists in database
const Database = require('better-sqlite3');
const path = require('path');

const dbPath = process.env.VOTES_DB_PATH || path.join(process.cwd(), 'votes.db');
const db = new Database(dbPath);

console.log('🔍 Checking for ollama_model setting...\n');

// Check if the setting exists
const setting = db.prepare('SELECT * FROM settings WHERE key = ?').get('ollama_model');

if (setting) {
  console.log('✅ ollama_model setting found:');
  console.log('   Key:', setting.key);
  console.log('   Value:', setting.value);
  console.log('   Description:', setting.description);
  console.log('   Category:', setting.category);
  console.log('   Updated:', setting.updated_at);
} else {
  console.log('❌ ollama_model setting NOT found');
  console.log('\n📝 Inserting setting now...');
  
  db.prepare(`
    INSERT OR IGNORE INTO settings (key, value, description, category) 
    VALUES (?, ?, ?, ?)
  `).run('ollama_model', 'deepseek-r1:latest', 'AI model for Santa letter replies', 'santa');
  
  const newSetting = db.prepare('SELECT * FROM settings WHERE key = ?').get('ollama_model');
  console.log('✅ Setting inserted:', newSetting);
}

// Show all settings in 'santa' category
console.log('\n📋 All settings in "santa" category:');
const santaSettings = db.prepare('SELECT * FROM settings WHERE category = ?').all('santa');
santaSettings.forEach(s => {
  console.log(`   - ${s.key}: ${s.value}`);
});

db.close();
console.log('\n✅ Test complete');
