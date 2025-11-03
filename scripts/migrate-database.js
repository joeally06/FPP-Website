const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

console.log('🔄 Running database migrations...\n');

const dbPath = path.join(process.cwd(), 'votes.db');

if (!fs.existsSync(dbPath)) {
  console.log('❌ Database not found. Please run: npm run setup');
  process.exit(1);
}

// Check for database corruption before opening
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

async function checkDatabaseIntegrity() {
  try {
    await execPromise(`sqlite3 "${dbPath}" "PRAGMA integrity_check;"`);
    return true;
  } catch (error) {
    return false;
  }
}

async function attemptDatabaseRepair() {
  console.log('⚠️  Database corruption detected!');
  console.log('🔧 Attempting to repair database...\n');
  
  const backupPath = dbPath + '.corrupt-' + Date.now();
  
  try {
    // Backup corrupted database
    fs.copyFileSync(dbPath, backupPath);
    console.log(`💾 Corrupted database backed up to: ${backupPath}`);
    
    // Try to dump and restore
    const dumpPath = dbPath + '.dump';
    await execPromise(`sqlite3 "${dbPath}" .dump > "${dumpPath}"`);
    
    // Remove corrupted database
    fs.unlinkSync(dbPath);
    
    // Restore from dump
    await execPromise(`sqlite3 "${dbPath}" < "${dumpPath}"`);
    
    // Clean up dump file
    fs.unlinkSync(dumpPath);
    
    console.log('✅ Database repaired successfully!\n');
    return true;
  } catch (error) {
    console.error('❌ Automatic repair failed');
    console.error('   Error:', error.message);
    console.error('\n⚠️  Please restore from backup manually:');
    console.error(`   cp backups/LATEST/votes.db.backup votes.db\n`);
    return false;
  }
}

(async () => {
  // Check database integrity first
  const isHealthy = await checkDatabaseIntegrity();
  
  if (!isHealthy) {
    const repaired = await attemptDatabaseRepair();
    if (!repaired) {
      process.exit(1);
    }
  }

  let db;
  
  try {
    db = new Database(dbPath);
  } catch (error) {
    console.error('❌ Failed to open database:', error.message);
    console.error('\n⚠️  Database is corrupted. Please restore from backup:');
    console.error('   cp backups/LATEST/votes.db.backup votes.db\n');
    process.exit(1);
  }

  // Create migrations table if it doesn't exist
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        version TEXT UNIQUE NOT NULL,
        applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  } catch (error) {
    console.error('❌ Failed to create migrations table:', error.message);
    db.close();
    process.exit(1);
  }

  // Get applied migrations
  const appliedMigrations = db.prepare(`
    SELECT version FROM schema_migrations ORDER BY version
  `).all().map(row => row.version);

  console.log(`📊 Applied migrations: ${appliedMigrations.length}`);

  // Read migration files
  const migrationsDir = path.join(process.cwd(), 'migrations');
  if (!fs.existsSync(migrationsDir)) {
    console.log('ℹ️  No migrations directory found');
    console.log('✅ Database is up to date\n');
    db.close();
    process.exit(0);
  }

  const migrationFiles = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  console.log(`📋 Total migration files: ${migrationFiles.length}\n`);

  if (migrationFiles.length === 0) {
    console.log('ℹ️  No migration files found');
    console.log('✅ Database is up to date\n');
    db.close();
    process.exit(0);
  }

  // Apply pending migrations
  const insertMigration = db.prepare(`
    INSERT INTO schema_migrations (version) VALUES (?)
  `);

  let appliedCount = 0;

  for (const file of migrationFiles) {
    const version = file.replace('.sql', '');
    
    if (appliedMigrations.includes(version)) {
      continue; // Already applied
    }

    console.log(`⚙️  Applying migration: ${file}`);
    
    try {
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      
      db.transaction(() => {
        db.exec(sql);
        insertMigration.run(version);
      })();
      
      console.log(`✅ Migration applied: ${file}`);
      appliedCount++;
    } catch (error) {
      console.error(`❌ Migration failed: ${file}`);
      console.error(`   Error: ${error.message}`);
      console.error('\n⚠️  Migration halted. Database may be in an inconsistent state.');
      console.error('   Consider restoring from backup if issues occur.\n');
      db.close();
      process.exit(1);
    }
  }

  if (appliedCount === 0) {
    console.log('✅ Database is up to date (no new migrations)\n');
  } else {
    console.log(`\n✅ Successfully applied ${appliedCount} migration(s)\n`);
  }

  // Show updated stats
  const stats = db.prepare(`
    SELECT 
      (SELECT COUNT(*) FROM sqlite_master WHERE type='table') as table_count,
      (SELECT COUNT(*) FROM sqlite_master WHERE type='index') as index_count
  `).get();

  console.log('📊 Database Statistics:');
  console.log(`   Tables: ${stats.table_count}`);
  console.log(`   Indexes: ${stats.index_count}`);

  const pageSize = db.pragma('page_size', { simple: true });
  const pageCount = db.pragma('page_count', { simple: true });
  const dbSizeMB = (pageSize * pageCount) / (1024 * 1024);
  console.log(`   Size: ${dbSizeMB.toFixed(2)} MB`);
  console.log('');

  db.close();
})();