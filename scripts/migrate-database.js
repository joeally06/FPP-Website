const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'votes.db');
const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

console.log('🗄️  FPP Database Migration Tool\n');

// Create database connection
const db = new Database(DB_PATH);

// Create migrations table if it doesn't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS migrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

console.log('✅ Migrations table ready');

// Get applied migrations
const appliedMigrations = db.prepare('SELECT name FROM migrations').all().map(row => row.name);

// Get migration files
const migrationFiles = fs.existsSync(MIGRATIONS_DIR) 
  ? fs.readdirSync(MIGRATIONS_DIR)
      .filter(file => file.endsWith('.sql'))
      .sort()
  : [];

console.log(`📋 Total migration files: ${migrationFiles.length}\n`);

// Apply pending migrations
let appliedCount = 0;

for (const file of migrationFiles) {
  if (appliedMigrations.includes(file)) {
    console.log(`⏭️  Skipping ${file} (already applied)`);
    continue;
  }

  console.log(`🔄 Applying ${file}...`);
  
  try {
    const migrationSQL = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
    
    // Run migration in a transaction
    db.exec('BEGIN TRANSACTION');
    db.exec(migrationSQL);
    db.prepare('INSERT INTO migrations (name) VALUES (?)').run(file);
    db.exec('COMMIT');
    
    console.log(`✅ Applied ${file}`);
    appliedCount++;
  } catch (error) {
    db.exec('ROLLBACK');
    console.error(`❌ Failed to apply ${file}:`, error.message);
    process.exit(1);
  }
}

console.log(`\n✅ Migration complete! Applied ${appliedCount} new migration(s)`);

db.close();