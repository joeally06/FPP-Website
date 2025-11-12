const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

console.log('🧹 Cleaning up old rate limiting system...\n');

let issuesFixed = 0;

// 1. Remove old database file if it exists
const oldDbPath = path.join(process.cwd(), 'fpp-control.db');
if (fs.existsSync(oldDbPath)) {
  console.log('⚠️  Found old fpp-control.db database');
  
  // Backup first
  const backupPath = `${oldDbPath}.backup-${Date.now()}`;
  try {
    fs.copyFileSync(oldDbPath, backupPath);
    console.log(`   📦 Backed up to: ${path.basename(backupPath)}`);
    
    // Delete old database
    fs.unlinkSync(oldDbPath);
    console.log('   ✅ Removed fpp-control.db');
    issuesFixed++;
  } catch (error) {
    console.log(`   ❌ Error removing old database: ${error.message}`);
  }
} else {
  console.log('✅ No old fpp-control.db found');
}

console.log('');

// 2. Check votes.db and remove old tables if they exist
const votesDbPath = path.join(process.cwd(), 'votes.db');
if (fs.existsSync(votesDbPath)) {
  console.log('🔍 Checking votes.db for old rate limit tables...');
  
  try {
    const db = new Database(votesDbPath);
    
    // Check if old tables exist
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND (name='rate_limits' OR name='rate_limit_blocks')").all();
    
    if (tables.length > 0) {
      console.log(`   ⚠️  Found ${tables.length} old rate limit table(s) in votes.db`);
      
      // Drop old rate limit tables if they exist
      try {
        db.prepare('DROP TABLE IF EXISTS rate_limits').run();
        console.log('   ✅ Dropped rate_limits table');
        issuesFixed++;
      } catch (e) {
        console.log('   ⚠️  Could not drop rate_limits:', e.message);
      }
      
      try {
        db.prepare('DROP TABLE IF EXISTS rate_limit_blocks').run();
        console.log('   ✅ Dropped rate_limit_blocks table');
        issuesFixed++;
      } catch (e) {
        console.log('   ⚠️  Could not drop rate_limit_blocks:', e.message);
      }
    } else {
      console.log('   ✅ No old rate limit tables found in votes.db');
    }
    
    // Verify jukebox_queue exists (the correct rate limiting table)
    console.log('');
    console.log('🔍 Verifying jukebox_queue table...');
    try {
      const count = db.prepare('SELECT COUNT(*) as count FROM jukebox_queue').get();
      console.log(`   ✅ jukebox_queue table exists with ${count.count} records`);
      console.log('   ✅ Rate limiting is using the correct table');
    } catch (e) {
      console.log('   ⚠️  jukebox_queue table missing!');
      console.log('   Run: npm run setup');
    }
    
    db.close();
  } catch (error) {
    console.log(`   ❌ Error checking votes.db: ${error.message}`);
  }
} else {
  console.log('❌ votes.db not found!');
  console.log('   Run: npm run setup to create it');
}

console.log('');
console.log('='.repeat(60));

if (issuesFixed > 0) {
  console.log(`\n✅ Cleanup complete! Fixed ${issuesFixed} issue(s).`);
  console.log('\n📋 Next steps:');
  console.log('   1. Restart your application:');
  console.log('      pm2 restart fpp-control');
  console.log('');
  console.log('   2. Test request limiting on the jukebox page');
  console.log('   3. Verify request counts are now stable');
  console.log('');
  console.log('   4. Optional - verify with:');
  console.log('      node scripts/check-old-tables.js');
} else {
  console.log('\n✅ No issues found - system is already clean!');
  console.log('');
  console.log('If you\'re still experiencing jumping request counts:');
  console.log('   1. Restart the application: pm2 restart fpp-control');
  console.log('   2. Check logs: pm2 logs fpp-control');
  console.log('   3. Clear browser cache and test again');
}

console.log('');
