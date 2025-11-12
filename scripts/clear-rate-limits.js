const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'votes.db');
const db = new Database(dbPath);

try {
  // Clear all jukebox queue entries (this resets rate limits)
  const deleteQueue = db.prepare('DELETE FROM jukebox_queue');
  const result = deleteQueue.run();
  console.log(`✅ Cleared ${result.changes} jukebox queue entries`);
  
  console.log('\n✅ All rate limits have been reset!');
  console.log('All users can now make new song requests.');
} catch (error) {
  console.error('Error clearing rate limits:', error);
} finally {
  db.close();
}
