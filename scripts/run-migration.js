/**
 * Run Database Migration Script
 * 
 * Usage: node scripts/run-migration.js migrations/013_fpp_status_cache.sql
 */

const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

// Get migration file from command line argument
const migrationFile = process.argv[2];

if (!migrationFile) {
  console.error('❌ Usage: node scripts/run-migration.js <migration-file>');
  console.error('   Example: node scripts/run-migration.js migrations/013_fpp_status_cache.sql');
  process.exit(1);
}

const migrationPath = path.resolve(migrationFile);

if (!fs.existsSync(migrationPath)) {
  console.error(`❌ Migration file not found: ${migrationPath}`);
  process.exit(1);
}

console.log(`\n📦 Running migration: ${path.basename(migrationFile)}`);
console.log(`   Path: ${migrationPath}\n`);

// Read migration SQL
const sql = fs.readFileSync(migrationPath, 'utf8');

// Connect to database
const dbPath = path.join(process.cwd(), 'votes.db');
const db = new Database(dbPath);

try {
  // Execute migration in a transaction
  console.log('🔄 Executing migration...');
  
  db.exec(sql);
  
  console.log('✅ Migration completed successfully!\n');
  
  // Verify new tables exist
  const tables = db.prepare(`
    SELECT name FROM sqlite_master 
    WHERE type='table' AND name IN ('fpp_status', 'cached_playlists')
    ORDER BY name
  `).all();
  
  if (tables.length > 0) {
    console.log('✅ Verified new tables:');
    tables.forEach(table => {
      const count = db.prepare(`SELECT COUNT(*) as count FROM ${table.name}`).get();
      console.log(`   - ${table.name} (${count.count} rows)`);
    });
  }
  
  console.log('');
  
} catch (error) {
  console.error('❌ Migration failed:', error.message);
  process.exit(1);
} finally {
  db.close();
}
