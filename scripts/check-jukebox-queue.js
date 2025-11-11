const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'votes.db');
const db = new Database(dbPath);

try {
  // Check all entries in the last hour
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  
  const allEntries = db.prepare(`
    SELECT id, sequence_name, requester_name, requester_ip, created_at, status
    FROM jukebox_queue 
    ORDER BY created_at DESC
    LIMIT 20
  `).all();
  
  console.log('\n📋 Last 20 entries in jukebox_queue:');
  console.log('=' .repeat(100));
  allEntries.forEach(entry => {
    console.log(`ID: ${entry.id} | ${entry.sequence_name} | IP: ${entry.requester_ip} | Status: ${entry.status} | ${entry.created_at}`);
  });
  
  console.log('\n⏰ Entries in the last hour:');
  console.log('=' .repeat(100));
  const recentEntries = db.prepare(`
    SELECT requester_ip, COUNT(*) as count, MAX(created_at) as last_request
    FROM jukebox_queue 
    WHERE created_at > ?
    GROUP BY requester_ip
  `).all(oneHourAgo);
  
  if (recentEntries.length === 0) {
    console.log('No entries in the last hour');
  } else {
    recentEntries.forEach(entry => {
      console.log(`IP: ${entry.requester_ip} | Count: ${entry.count} | Last: ${entry.last_request}`);
    });
  }
  
  console.log('\n✅ Current rate limit setting:');
  const setting = db.prepare('SELECT value FROM settings WHERE key = ?').get('jukebox_rate_limit');
  console.log(`Rate Limit: ${setting?.value || '3 (default)'} requests/hour`);
  
} catch (error) {
  console.error('Error:', error);
} finally {
  db.close();
}
