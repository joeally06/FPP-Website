const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

console.log('🗄️  Initializing database...\n');

// Ensure data directory exists
const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
  console.log('✅ Created data directory');
}

// Create or open database
const dbPath = path.join(process.cwd(), 'votes.db');
const isNewDatabase = !fs.existsSync(dbPath);

if (isNewDatabase) {
  console.log('📝 Creating new database...');
} else {
  console.log('📝 Database already exists');
}

const db = new Database(dbPath);

// Enable optimizations
console.log('⚡ Enabling performance optimizations...');
db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');
db.pragma('cache_size = -64000');
db.pragma('temp_store = MEMORY');
db.pragma('mmap_size = 67108864');

console.log('✅ Database optimizations enabled');

// Create schema_migrations table
db.exec(`
  CREATE TABLE IF NOT EXISTS schema_migrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    version TEXT UNIQUE NOT NULL,
    applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Check if migrations directory exists
const migrationsDir = path.join(process.cwd(), 'migrations');
if (!fs.existsSync(migrationsDir)) {
  console.log('\nℹ️  No migrations directory found - database will be created on first run');
  
  // If this is a new database, note that migrations will run automatically
  if (isNewDatabase) {
    console.log('ℹ️  Database schema will be initialized when you start the server');
  }
} else {
  // Run migrations
  console.log('\n📋 Checking for database migrations...');
  
  const appliedMigrations = db.prepare(`
    SELECT version FROM schema_migrations ORDER BY version
  `).all().map(row => row.version);

  const migrationFiles = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  let appliedCount = 0;
  const insertMigration = db.prepare(`
    INSERT INTO schema_migrations (version) VALUES (?)
  `);

  for (const file of migrationFiles) {
    const version = file.replace('.sql', '');
    
    if (appliedMigrations.includes(version)) {
      continue; // Already applied
    }

    console.log(`  ⚙️  Applying migration: ${file}`);
    
    try {
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      
      db.transaction(() => {
        db.exec(sql);
        insertMigration.run(version);
      })();
      
      console.log(`  ✅ Migration applied: ${file}`);
      appliedCount++;
    } catch (error) {
      console.error(`  ❌ Migration failed: ${file}`);
      console.error(`     ${error.message}`);
      db.close();
      process.exit(1);
    }
  }

  if (appliedCount === 0) {
    console.log('✅ Database is up to date (no new migrations)');
  } else {
    console.log(`\n✅ Applied ${appliedCount} migration(s)`);
  }
}

// Show database stats
console.log('\n📊 Database Statistics:');
const stats = db.prepare(`
  SELECT 
    (SELECT COUNT(*) FROM sqlite_master WHERE type='table') as table_count,
    (SELECT COUNT(*) FROM sqlite_master WHERE type='index') as index_count
`).get();

console.log(`   Tables: ${stats.table_count}`);
console.log(`   Indexes: ${stats.index_count}`);

const pageSize = db.pragma('page_size', { simple: true });
const pageCount = db.pragma('page_count', { simple: true });
const dbSizeMB = (pageSize * pageCount) / (1024 * 1024);

console.log(`   Size: ${dbSizeMB.toFixed(2)} MB`);
console.log(`   Journal Mode: ${db.pragma('journal_mode', { simple: true })}`);
console.log('');

console.log('✅ Database initialization complete!\n');

db.close();
