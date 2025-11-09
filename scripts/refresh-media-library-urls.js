/**
 * Refresh Spotify URLs for Media Library Entries
 * 
 * This script updates all Media Library records that have spotify_track_id 
 * but missing spotify_url by constructing the Spotify web URL.
 * 
 * Usage: node scripts/refresh-media-library-urls.js
 */

const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(process.cwd(), 'votes.db');
const db = new Database(dbPath);

console.log('🎵 Refreshing Spotify URLs for Media Library...\n');

try {
  // Count records that need updating
  const countStmt = db.prepare(`
    SELECT COUNT(*) as count 
    FROM spotify_metadata 
    WHERE spotify_track_id IS NOT NULL 
    AND spotify_url IS NULL
  `);
  const { count } = countStmt.get();
  
  console.log(`📊 Found ${count} Media Library records missing spotify_url\n`);
  
  if (count === 0) {
    console.log('✅ All Media Library entries already have Spotify URLs!');
    db.close();
    process.exit(0);
  }

  // Update records by constructing Spotify web URL from spotify_track_id
  const updateStmt = db.prepare(`
    UPDATE spotify_metadata 
    SET spotify_url = 'https://open.spotify.com/track/' || spotify_track_id
    WHERE spotify_track_id IS NOT NULL 
    AND spotify_url IS NULL
  `);

  const result = updateStmt.run();
  
  console.log(`✅ Updated ${result.changes} Media Library records with Spotify URLs\n`);
  
  // Show some examples
  const sampleStmt = db.prepare(`
    SELECT sequence_name, track_name, artist_name, spotify_url 
    FROM spotify_metadata 
    WHERE spotify_url IS NOT NULL 
    LIMIT 5
  `);
  
  const samples = sampleStmt.all();
  
  console.log('📝 Updated Media Library records:');
  samples.forEach((record, i) => {
    console.log(`\n${i + 1}. ${record.track_name} - ${record.artist_name}`);
    console.log(`   Sequence: ${record.sequence_name}`);
    console.log(`   🔗 ${record.spotify_url}`);
  });
  
  console.log('\n✅ Media Library Spotify URL refresh complete!');
  
} catch (error) {
  console.error('❌ Error refreshing Media Library Spotify URLs:', error.message);
  process.exit(1);
} finally {
  db.close();
}
