const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'fpp-control.db');
const db = new Database(dbPath);

try {
  // Clear all rate limit entries
  const deleteRateLimits = db.prepare('DELETE FROM rate_limits');
  const result1 = deleteRateLimits.run();
  console.log(`✅ Cleared ${result1.changes} rate limit entries`);
  
  // Clear all rate limit blocks
  const deleteBlocks = db.prepare('DELETE FROM rate_limit_blocks');
  const result2 = deleteBlocks.run();
  console.log(`✅ Cleared ${result2.changes} rate limit blocks`);
  
  console.log('\n✅ All rate limits have been reset!');
  console.log('You can now make requests again.');
} catch (error) {
  console.error('Error clearing rate limits:', error);
} finally {
  db.close();
}
