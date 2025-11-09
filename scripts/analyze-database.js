/**
 * Analyze Database Schema
 * Shows all tables, columns, indexes, and relationships
 */

const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(process.cwd(), 'votes.db');
const db = new Database(dbPath);

console.log('📊 DATABASE SCHEMA ANALYSIS\n');
console.log('=' .repeat(70));

// Get all tables
const tables = db.prepare(`
  SELECT name FROM sqlite_master 
  WHERE type='table' 
  AND name NOT LIKE 'sqlite_%'
  ORDER BY name
`).all();

console.log(`\n📋 Total Tables: ${tables.length}\n`);

tables.forEach(table => {
  console.log(`\n${'─'.repeat(70)}`);
  console.log(`📁 TABLE: ${table.name}`);
  console.log('─'.repeat(70));
  
  // Get columns
  const columns = db.pragma(`table_info(${table.name})`);
  console.log('\n  Columns:');
  columns.forEach(col => {
    const pk = col.pk ? ' [PRIMARY KEY]' : '';
    const notnull = col.notnull ? ' NOT NULL' : '';
    const dflt = col.dflt_value ? ` DEFAULT ${col.dflt_value}` : '';
    console.log(`    - ${col.name}: ${col.type}${pk}${notnull}${dflt}`);
  });
  
  // Get indexes
  const indexes = db.prepare(`
    SELECT name FROM sqlite_master 
    WHERE type='index' 
    AND tbl_name=? 
    AND name NOT LIKE 'sqlite_%'
  `).all(table.name);
  
  if (indexes.length > 0) {
    console.log('\n  Indexes:');
    indexes.forEach(idx => {
      const idxInfo = db.pragma(`index_info(${idx.name})`);
      const cols = idxInfo.map(i => i.name).join(', ');
      console.log(`    - ${idx.name}: (${cols})`);
    });
  }
  
  // Get row count
  const count = db.prepare(`SELECT COUNT(*) as count FROM ${table.name}`).get();
  console.log(`\n  📊 Row Count: ${count.count}`);
  
  // Check for foreign keys
  const fks = db.pragma(`foreign_key_list(${table.name})`);
  if (fks.length > 0) {
    console.log('\n  🔗 Foreign Keys:');
    fks.forEach(fk => {
      console.log(`    - ${fk.from} → ${fk.table}.${fk.to} (ON DELETE ${fk.on_delete})`);
    });
  }
});

console.log('\n' + '='.repeat(70));

// Check if foreign keys are enabled
const fkEnabled = db.pragma('foreign_keys');
console.log(`\n⚙️  Foreign Key Constraints: ${fkEnabled ? '✅ ENABLED' : '❌ DISABLED'}`);

// Identify potential duplicates
console.log('\n🔍 DATA QUALITY CHECKS:\n');

// Check 1: Duplicate sequence metadata
try {
  const dupMetadata = db.prepare(`
    SELECT 
      (SELECT COUNT(*) FROM spotify_metadata) as spotify_count,
      (SELECT COUNT(*) FROM sequence_metadata) as sequence_count,
      (SELECT COUNT(DISTINCT sequence_name) FROM spotify_metadata) as spotify_unique,
      (SELECT COUNT(DISTINCT sequence_name) FROM sequence_metadata) as sequence_unique
  `).get();
  
  console.log('1️⃣ Metadata Tables:');
  console.log(`   - spotify_metadata: ${dupMetadata.spotify_count} rows (${dupMetadata.spotify_unique} unique sequences)`);
  console.log(`   - sequence_metadata: ${dupMetadata.sequence_count} rows (${dupMetadata.sequence_unique} unique sequences)`);
  
  // Check overlap
  const overlap = db.prepare(`
    SELECT COUNT(*) as count
    FROM spotify_metadata sm
    INNER JOIN sequence_metadata sqm ON sm.sequence_name = sqm.sequence_name
  `).get();
  
  if (overlap.count > 0) {
    console.log(`   ⚠️  ${overlap.count} sequences exist in BOTH tables (duplication!)`);
  }
} catch (e) {
  console.log('   ℹ️  Could not analyze metadata tables');
}

// Check 2: Queue entries without metadata
try {
  const queueNoMeta = db.prepare(`
    SELECT COUNT(*) as count
    FROM jukebox_queue q
    WHERE NOT EXISTS (
      SELECT 1 FROM spotify_metadata WHERE sequence_name = q.sequence_name
    )
    AND NOT EXISTS (
      SELECT 1 FROM sequence_metadata WHERE sequence_name = q.sequence_name
    )
  `).get();
  
  console.log(`\n2️⃣ Queue Integrity:`);
  console.log(`   - ${queueNoMeta.count} queue entries without metadata`);
} catch (e) {
  console.log('\n2️⃣ Queue Integrity: Could not analyze');
}

// Check 3: YouTube videos
try {
  const videoStats = db.prepare(`
    SELECT COUNT(*) as total,
           COUNT(DISTINCT youtube_id) as unique_ids,
           COUNT(DISTINCT title) as unique_titles
    FROM youtube_videos
  `).get();
  
  console.log(`\n3️⃣ YouTube Videos:`);
  console.log(`   - ${videoStats.total} videos total`);
  console.log(`   - ${videoStats.unique_ids} unique YouTube IDs`);
  if (videoStats.total !== videoStats.unique_ids) {
    console.log(`   ⚠️  Duplicate YouTube IDs detected!`);
  }
} catch (e) {
  console.log('\n3️⃣ YouTube Videos: Table not found');
}

console.log('\n' + '='.repeat(70));
console.log('\n✅ Analysis complete!\n');

db.close();
