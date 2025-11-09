/**
 * Validate Database Migration 011
 * Checks data integrity before and after normalization
 */

const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(process.cwd(), 'votes.db');
const db = new Database(dbPath);

console.log('🔍 MIGRATION 011 VALIDATION\n');
console.log('='.repeat(70));

// Check if sequences table exists
const tablesCheck = db.prepare(`
  SELECT name FROM sqlite_master 
  WHERE type='table' AND name='sequences'
`).all();

const migrationApplied = tablesCheck.length > 0;

if (migrationApplied) {
  console.log('\n✅ Migration 011 has been applied\n');
  validateAfterMigration();
} else {
  console.log('\n📋 Migration 011 NOT yet applied\n');
  validateBeforeMigration();
}

function validateBeforeMigration() {
  console.log('📊 PRE-MIGRATION STATE:\n');
  
  // Count existing metadata
  const spotifyCount = db.prepare('SELECT COUNT(*) as count FROM spotify_metadata').get();
  const sequenceCount = db.prepare('SELECT COUNT(*) as count FROM sequence_metadata').get();
  const queueCount = db.prepare('SELECT COUNT(*) as count FROM jukebox_queue').get();
  
  console.log(`  spotify_metadata: ${spotifyCount.count} rows`);
  console.log(`  sequence_metadata: ${sequenceCount.count} rows`);
  console.log(`  jukebox_queue: ${queueCount.count} rows`);
  
  // Check for duplicates across tables
  const overlap = db.prepare(`
    SELECT COUNT(*) as count
    FROM spotify_metadata sm
    INNER JOIN sequence_metadata sq ON sm.sequence_name = sq.sequence_name
  `).get();
  
  console.log(`\n  Overlap (in both tables): ${overlap.count} sequences`);
  
  // Total unique sequences
  const uniqueSequences = db.prepare(`
    SELECT COUNT(DISTINCT sequence_name) as count
    FROM (
      SELECT sequence_name FROM spotify_metadata
      UNION
      SELECT sequence_name FROM sequence_metadata
    )
  `).get();
  
  console.log(`  Total unique sequences: ${uniqueSequences.count}`);
  
  console.log('\n✅ Ready for migration!');
  console.log('\n💡 Run migration with:');
  console.log('   node -e "const db=require(\'better-sqlite3\')(\'votes.db\');const fs=require(\'fs\');db.exec(fs.readFileSync(\'migrations/011_normalize_database.sql\',\'utf8\'));console.log(\'✅ Migration complete\');db.close();"');
}

function validateAfterMigration() {
  console.log('📊 POST-MIGRATION VALIDATION:\n');
  
  let errors = 0;
  let warnings = 0;
  
  // Test 1: Check row counts
  console.log('1️⃣ Row Count Verification:');
  const sequencesCount = db.prepare('SELECT COUNT(*) as count FROM sequences').get();
  const spotifyCount = db.prepare('SELECT COUNT(*) as count FROM spotify_metadata').get();
  const seqMetaCount = db.prepare('SELECT COUNT(*) as count FROM sequence_metadata').get();
  
  const expectedTotal = spotifyCount.count + seqMetaCount.count;
  
  console.log(`   sequences table: ${sequencesCount.count} rows`);
  console.log(`   spotify_metadata: ${spotifyCount.count} rows`);
  console.log(`   sequence_metadata: ${seqMetaCount.count} rows`);
  
  // Account for duplicates (spotify_metadata takes priority)
  const overlap = db.prepare(`
    SELECT COUNT(*) as count
    FROM spotify_metadata sm
    INNER JOIN sequence_metadata sq ON sm.sequence_name = sq.sequence_name
  `).get();
  
  const expectedSequencesCount = spotifyCount.count + seqMetaCount.count - overlap.count;
  
  if (sequencesCount.count >= spotifyCount.count && sequencesCount.count >= seqMetaCount.count) {
    console.log(`   ✅ sequences table has ${sequencesCount.count} rows (expected ~${expectedSequencesCount})`);
  } else {
    console.log(`   ❌ Data loss detected! Only ${sequencesCount.count} rows (expected ~${expectedSequencesCount})`);
    errors++;
  }
  
  // Test 2: Check for orphaned queue entries
  console.log('\n2️⃣ Queue Foreign Key Integrity:');
  const orphanedQueue = db.prepare(`
    SELECT COUNT(*) as count
    FROM jukebox_queue
    WHERE sequence_id IS NULL
  `).get();
  
  if (orphanedQueue.count === 0) {
    console.log('   ✅ All queue entries have sequence_id');
  } else {
    console.log(`   ⚠️  ${orphanedQueue.count} queue entries without sequence_id`);
    warnings++;
    
    // Show them
    const orphans = db.prepare(`
      SELECT id, sequence_name, status
      FROM jukebox_queue
      WHERE sequence_id IS NULL
      LIMIT 5
    `).all();
    
    console.log('   First 5 orphans:');
    orphans.forEach(o => {
      console.log(`     - Queue #${o.id}: ${o.sequence_name} (${o.status})`);
    });
  }
  
  // Test 3: Verify metadata migration
  console.log('\n3️⃣ Metadata Migration Verification:');
  
  // Check custom vs auto metadata
  const metadataStats = db.prepare(`
    SELECT 
      metadata_source,
      is_custom_metadata,
      COUNT(*) as count
    FROM sequences
    GROUP BY metadata_source, is_custom_metadata
    ORDER BY metadata_source
  `).all();
  
  console.log('   Metadata by source:');
  metadataStats.forEach(stat => {
    const customLabel = stat.is_custom_metadata ? '(Custom)' : '(Auto)';
    console.log(`     - ${stat.metadata_source} ${customLabel}: ${stat.count} sequences`);
  });
  
  // Test 4: Check for sequences with data
  const withData = db.prepare(`
    SELECT COUNT(*) as count
    FROM sequences
    WHERE title IS NOT NULL AND artist IS NOT NULL
  `).get();
  
  console.log(`\n   Sequences with complete metadata: ${withData.count}/${sequencesCount.count}`);
  
  if (withData.count > 0) {
    console.log('   ✅ Metadata migrated successfully');
  } else {
    console.log('   ❌ No metadata found - migration may have failed');
    errors++;
  }
  
  // Test 5: Verify play statistics
  console.log('\n4️⃣ Play Statistics Migration:');
  const withStats = db.prepare(`
    SELECT COUNT(*) as count
    FROM sequences
    WHERE play_count > 0 OR request_count > 0
  `).get();
  
  if (withStats.count > 0) {
    console.log(`   ✅ ${withStats.count} sequences have play/request statistics`);
    
    // Show top 5
    const top = db.prepare(`
      SELECT sequence_name, title, play_count, request_count
      FROM sequences
      WHERE play_count > 0 OR request_count > 0
      ORDER BY play_count DESC
      LIMIT 5
    `).all();
    
    console.log('   Top 5 most played:');
    top.forEach((seq, i) => {
      const title = seq.title || seq.sequence_name;
      console.log(`     ${i+1}. ${title}: ${seq.play_count} plays, ${seq.request_count} requests`);
    });
  } else {
    console.log('   ⚠️  No play statistics found (might be normal if no songs played yet)');
    warnings++;
  }
  
  // Test 6: Check indexes
  console.log('\n5️⃣ Index Verification:');
  const indexes = db.prepare(`
    SELECT name FROM sqlite_master 
    WHERE type='index' 
    AND tbl_name='sequences'
    AND name NOT LIKE 'sqlite_%'
  `).all();
  
  console.log(`   ✅ ${indexes.length} indexes created on sequences table`);
  indexes.forEach(idx => {
    console.log(`     - ${idx.name}`);
  });
  
  // Test 7: Sample data check
  console.log('\n6️⃣ Sample Data Check:');
  const samples = db.prepare(`
    SELECT 
      id, sequence_name, title, artist, 
      is_custom_metadata, metadata_source, play_count
    FROM sequences
    LIMIT 3
  `).all();
  
  if (samples.length > 0) {
    console.log('   Sample entries:');
    samples.forEach((s, i) => {
      const custom = s.is_custom_metadata ? '🎨 Custom' : '🤖 Auto';
      console.log(`\n     ${i+1}. ${s.title || s.sequence_name}`);
      console.log(`        ID: ${s.id}`);
      console.log(`        Sequence: ${s.sequence_name}`);
      console.log(`        Artist: ${s.artist || 'N/A'}`);
      console.log(`        Source: ${custom} (${s.metadata_source})`);
      console.log(`        Plays: ${s.play_count}`);
    });
  }
  
  // Test 8: Backward compatibility view
  console.log('\n\n7️⃣ Backward Compatibility:');
  const viewExists = db.prepare(`
    SELECT name FROM sqlite_master 
    WHERE type='view' AND name='spotify_metadata_view'
  `).all();
  
  if (viewExists.length > 0) {
    console.log('   ✅ spotify_metadata_view created for backward compatibility');
    
    const viewCount = db.prepare('SELECT COUNT(*) as count FROM spotify_metadata_view').get();
    console.log(`   View has ${viewCount.count} rows`);
  } else {
    console.log('   ⚠️  Backward compatibility view not found');
    warnings++;
  }
  
  // Final summary
  console.log('\n' + '='.repeat(70));
  console.log('\n📋 VALIDATION SUMMARY:\n');
  
  if (errors === 0 && warnings === 0) {
    console.log('✅ Migration successful! No errors or warnings.');
    console.log('\n💡 Next steps:');
    console.log('   1. Test application functionality');
    console.log('   2. Update code to use sequences table');
    console.log('   3. After thorough testing, consider dropping old tables');
  } else if (errors === 0) {
    console.log(`⚠️  Migration completed with ${warnings} warning(s).`);
    console.log('   Review warnings above, but migration appears successful.');
  } else {
    console.log(`❌ Migration completed with ${errors} ERROR(S) and ${warnings} warning(s).`);
    console.log('   ⚠️  DO NOT DROP OLD TABLES - investigate errors first!');
  }
  
  console.log('\n' + '='.repeat(70));
}

db.close();
