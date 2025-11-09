/**
 * Test New Sequences Table
 * Quick test to verify the new sequences table and prepared statements
 */

const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'votes.db');
const db = new Database(dbPath);

console.log('🧪 Testing New Sequences Table\n');
console.log('='.repeat(70));

// Test 1: Query by name
console.log('\n1️⃣ Test getSequenceByName:');
const seq1 = db.prepare('SELECT * FROM sequences WHERE sequence_name = ?').get('itremix');
if (seq1) {
  console.log(`   ✅ Found: ${seq1.title} by ${seq1.artist}`);
  console.log(`      ID: ${seq1.id}`);
  console.log(`      Spotify URL: ${seq1.spotify_url || 'N/A'}`);
  console.log(`      Custom: ${seq1.is_custom_metadata ? 'Yes' : 'No'}`);
  console.log(`      Source: ${seq1.metadata_source}`);
} else {
  console.log('   ❌ Not found');
}

// Test 2: Query by ID
console.log('\n2️⃣ Test getSequenceById:');
const seq2 = db.prepare('SELECT * FROM sequences WHERE id = ?').get(1);
if (seq2) {
  console.log(`   ✅ ID 1: ${seq2.title} (${seq2.sequence_name})`);
} else {
  console.log('   ❌ Not found');
}

// Test 3: Get popular sequences
console.log('\n3️⃣ Test getPopularSequences:');
const popular = db.prepare(`
  SELECT * FROM sequences 
  WHERE play_count > 0 
  ORDER BY play_count DESC 
  LIMIT 5
`).all();

if (popular.length > 0) {
  console.log(`   ✅ Found ${popular.length} sequences with plays:`);
  popular.forEach((s, i) => {
    console.log(`      ${i+1}. ${s.title || s.sequence_name}: ${s.play_count} plays`);
  });
} else {
  console.log('   ℹ️  No sequences with play count yet');
}

// Test 4: Check queue has sequence_id
console.log('\n4️⃣ Test Queue Foreign Keys:');
const queueWithFK = db.prepare(`
  SELECT 
    q.id, q.sequence_name, q.sequence_id, q.status,
    s.title, s.artist
  FROM jukebox_queue q
  LEFT JOIN sequences s ON q.sequence_id = s.id
  LIMIT 3
`).all();

if (queueWithFK.length > 0) {
  console.log(`   ✅ Queue entries with FK:`);
  queueWithFK.forEach(q => {
    if (q.sequence_id) {
      console.log(`      Queue #${q.id}: ${q.title || q.sequence_name} (FK: ${q.sequence_id})`);
    } else {
      console.log(`      Queue #${q.id}: ${q.sequence_name} (⚠️ NO FK)`);
    }
  });
} else {
  console.log('   ℹ️  No queue entries');
}

// Test 5: Count sequences by source
console.log('\n5️⃣ Metadata Source Statistics:');
const sources = db.prepare(`
  SELECT 
    metadata_source,
    is_custom_metadata,
    COUNT(*) as count
  FROM sequences
  GROUP BY metadata_source, is_custom_metadata
  ORDER BY count DESC
`).all();

sources.forEach(s => {
  const custom = s.is_custom_metadata ? '(Custom)' : '(Auto)';
  console.log(`   - ${s.metadata_source} ${custom}: ${s.count} sequences`);
});

// Test 6: Recently played
console.log('\n6️⃣ Recently Played:');
const recent = db.prepare(`
  SELECT sequence_name, title, artist, last_played_at, play_count
  FROM sequences
  WHERE last_played_at IS NOT NULL
  ORDER BY last_played_at DESC
  LIMIT 3
`).all();

if (recent.length > 0) {
  console.log(`   ✅ Last ${recent.length} played:`);
  recent.forEach((s, i) => {
    const title = s.title || s.sequence_name;
    console.log(`      ${i+1}. ${title} - Played: ${new Date(s.last_played_at).toLocaleString()}`);
  });
} else {
  console.log('   ℹ️  No play history yet');
}

console.log('\n' + '='.repeat(70));
console.log('\n✅ All tests complete!\n');

db.close();
