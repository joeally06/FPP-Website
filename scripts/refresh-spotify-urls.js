/**
 * Refresh Spotify URLs for Existing Cached Metadata
 * 
 * This script updates all cached metadata records that have spotify_id 
 * but missing spotify_url by constructing the Spotify web URL.
 * 
 * Usage: node scripts/refresh-spotify-urls.js
 */

const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(process.cwd(), 'votes.db');
const db = new Database(dbPath);

console.log('🎵 Refreshing Spotify URLs for cached metadata...\n');

try {
  // Count records that need updating
  const countStmt = db.prepare(`
    SELECT COUNT(*) as count 
    FROM sequence_metadata 
    WHERE spotify_id IS NOT NULL 
    AND spotify_url IS NULL
  `);
  const { count } = countStmt.get();
  
  console.log(`📊 Found ${count} records with spotify_id but missing spotify_url\n`);
  
  if (count === 0) {
    console.log('✅ All records already have Spotify URLs!');
    db.close();
    process.exit(0);
  }

  // Update records by constructing Spotify web URL from spotify_id
  const updateStmt = db.prepare(`
    UPDATE sequence_metadata 
    SET spotify_url = 'https://open.spotify.com/track/' || spotify_id
    WHERE spotify_id IS NOT NULL 
    AND spotify_url IS NULL
  `);

  const result = updateStmt.run();
  
  console.log(`✅ Updated ${result.changes} records with Spotify URLs\n`);
  
  // Show some examples
  const sampleStmt = db.prepare(`
    SELECT sequence_name, song_title, artist, spotify_url 
    FROM sequence_metadata 
    WHERE spotify_url IS NOT NULL 
    LIMIT 5
  `);
  
  const samples = sampleStmt.all();
  
  console.log('📝 Sample updated records:');
  samples.forEach((record, i) => {
    console.log(`\n${i + 1}. ${record.song_title} - ${record.artist}`);
    console.log(`   🔗 ${record.spotify_url}`);
  });
  
  console.log('\n✅ Spotify URL refresh complete!');
  
} catch (error) {
  console.error('❌ Error refreshing Spotify URLs:', error.message);
  process.exit(1);
} finally {
  db.close();
}
