const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'votes.db');
const migrationsDir = path.join(__dirname, 'migrations');

console.log('🔄 Running database migrations...');
console.log(`📁 Database: ${dbPath}`);
console.log(`📂 Migrations: ${migrationsDir}\n`);

const db = new Database(dbPath);

// Get current schema version
let currentVersion = 0;
try {
  const result = db.prepare('SELECT MAX(version) as version FROM migrations').get();
  currentVersion = result?.version || 0;
} catch (err) {
  console.log('⚠️  No migrations table found, creating...');
  db.exec(`
    CREATE TABLE IF NOT EXISTS migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

console.log(`Current version: ${currentVersion}`);

// Get all migration files
const files = fs.readdirSync(migrationsDir)
  .filter(f => f.endsWith('.sql'))
  .sort();

console.log(`Found ${files.length} migration files\n`);

let applied = 0;

for (const file of files) {
  const version = parseInt(file.split('_')[0]);
  
  // Check if this specific file has been applied
  const alreadyApplied = db.prepare('SELECT 1 FROM migrations WHERE name = ?').get(file);
  
  if (alreadyApplied) {
    console.log(`⏭️  Skipping ${file} (already applied)`);
    continue;
  }
  
  console.log(`✅ Applying ${file}...`);
  
  const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
  
  try {
    db.exec(sql);
    // Try to insert, but if version collision occurs, use a unique identifier
    try {
      db.prepare('INSERT INTO migrations (version, name) VALUES (?, ?)').run(version, file);
    } catch (insertErr) {
      if (insertErr.message.includes('UNIQUE constraint')) {
        // Find the highest version and increment
        const maxVer = db.prepare('SELECT MAX(version) as version FROM migrations').get();
        const newVersion = (maxVer?.version || 0) + 1;
        console.log(`   ⚠️  Version ${version} already exists, using ${newVersion}`);
        db.prepare('INSERT INTO migrations (version, name) VALUES (?, ?)').run(newVersion, file);
      } else {
        throw insertErr;
      }
    }
    applied++;
    console.log(`   ✓ Applied successfully`);
  } catch (err) {
    console.error(`   ✗ Error: ${err.message}`);
    if (err.message.includes('duplicate column name') || err.message.includes('already exists')) {
      console.log(`   ⚠️  Column/table already exists, continuing...`);
      db.prepare('INSERT INTO migrations (version, name) VALUES (?, ?)').run(version, file);
      applied++;
    } else {
      console.error('   ❌ Migration failed, stopping...');
      process.exit(1);
    }
  }
}

db.close();

console.log(`\n✅ Applied ${applied} new migration(s)`);
console.log('🎉 All migrations complete!');
