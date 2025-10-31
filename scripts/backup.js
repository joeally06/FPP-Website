const fs = require('fs');
const path = require('path');

console.log('💾 Creating backup...\n');

const timestamp = new Date().toISOString()
  .replace(/:/g, '-')
  .replace(/\..+/, '')
  .replace('T', '_');

const backupDir = path.join(process.cwd(), 'backups', timestamp);

// Create backup directory
if (!fs.existsSync(path.join(process.cwd(), 'backups'))) {
  fs.mkdirSync(path.join(process.cwd(), 'backups'));
}

fs.mkdirSync(backupDir, { recursive: true });

console.log(`📂 Backup directory: ${backupDir}\n`);

let fileCount = 0;

// Backup database
const dbPath = path.join(process.cwd(), 'votes.db');
if (fs.existsSync(dbPath)) {
  fs.copyFileSync(dbPath, path.join(backupDir, 'votes.db'));
  console.log('✅ Backed up: votes.db');
  fileCount++;

  // Backup WAL file if exists
  const walPath = dbPath + '-wal';
  if (fs.existsSync(walPath)) {
    fs.copyFileSync(walPath, path.join(backupDir, 'votes.db-wal'));
    console.log('✅ Backed up: votes.db-wal');
    fileCount++;
  }

  // Backup SHM file if exists
  const shmPath = dbPath + '-shm';
  if (fs.existsSync(shmPath)) {
    fs.copyFileSync(shmPath, path.join(backupDir, 'votes.db-shm'));
    console.log('✅ Backed up: votes.db-shm');
    fileCount++;
  }
} else {
  console.log('⚠️  Database not found (skipped)');
}

// Backup .env.local
const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  fs.copyFileSync(envPath, path.join(backupDir, '.env.local'));
  console.log('✅ Backed up: .env.local');
  fileCount++;
} else {
  console.log('⚠️  Configuration not found (skipped)');
}

console.log(`\n✅ Backup completed: ${fileCount} file(s)`);
console.log(`📂 Location: ${backupDir}`);

// List recent backups
console.log('\n📋 Recent backups:');
const backupsPath = path.join(process.cwd(), 'backups');
const backups = fs.readdirSync(backupsPath)
  .filter(f => fs.statSync(path.join(backupsPath, f)).isDirectory())
  .sort()
  .reverse()
  .slice(0, 5);

backups.forEach((backup, index) => {
  const backupPath = path.join(backupsPath, backup);
  const stats = fs.statSync(backupPath);
  const sizeMB = fs.readdirSync(backupPath)
    .reduce((total, file) => {
      return total + fs.statSync(path.join(backupPath, file)).size;
    }, 0) / (1024 * 1024);
  
  console.log(`   ${(index + 1)}. ${backup} (${sizeMB.toFixed(2)} MB)`);
});

console.log('\n💡 To restore from this backup, run:');
console.log(`   Linux/Mac: ./rollback.sh ${backupDir}`);
console.log(`   Windows:   .\\rollback.ps1 -BackupDir ${backupDir}`);
console.log('');
