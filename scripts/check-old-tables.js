const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

console.log('🔍 Checking for old rate limiting tables...\n');

// Check fpp-control.db (old database)
const oldDbPath = path.join(process.cwd(), 'fpp-control.db');
if (fs.existsSync(oldDbPath)) {
  console.log('⚠️  FOUND OLD DATABASE: fpp-control.db');
  console.log('   This database should not exist anymore!\n');
  
  try {
    const oldDb = new Database(oldDbPath, { readonly: true });
    
    // Check if old rate limit tables exist
    const tables = oldDb.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    
    console.log('📁 Tables in fpp-control.db:');
    tables.forEach(table => {
      console.log(`  - ${table.name}`);
      if (table.name === 'rate_limits' || table.name === 'rate_limit_blocks') {
        console.log(`    ⚠️  OLD RATE LIMIT TABLE FOUND!`);
      }
    });
    
    // Check if there's any data in old rate limit tables
    try {
      const rateLimits = oldDb.prepare('SELECT COUNT(*) as count FROM rate_limits').get();
      console.log(`\n  rate_limits table has ${rateLimits.count} records`);
      
      if (rateLimits.count > 0) {
        console.log(`  ⚠️  This is interfering with the new rate limiting system!`);
      }
    } catch (e) {
      console.log('\n  ✅ rate_limits table does not exist');
    }
    
    try {
      const blocks = oldDb.prepare('SELECT COUNT(*) as count FROM rate_limit_blocks').get();
      console.log(`  rate_limit_blocks table has ${blocks.count} records`);
      
      if (blocks.count > 0) {
        console.log(`  ⚠️  This is interfering with the new rate limiting system!`);
      }
    } catch (e) {
      console.log('  ✅ rate_limit_blocks table does not exist');
    }
    
    oldDb.close();
    
    console.log('\n  ⚠️  PROBLEM FOUND: Old database exists and may be causing issues!');
    console.log('  Run: node scripts/cleanup-old-rate-limits.js');
    
  } catch (error) {
    console.log('  ❌ Error reading old database:', error.message);
  }
} else {
  console.log('✅ No old fpp-control.db found (good!)');
}

console.log('\n' + '='.repeat(60) + '\n');

// Check votes.db (current database)
const votesDbPath = path.join(process.cwd(), 'votes.db');
if (fs.existsSync(votesDbPath)) {
  console.log('📁 Checking votes.db (current database)...\n');
  
  try {
    const votesDb = new Database(votesDbPath, { readonly: true });
    
    const tables = votesDb.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    
    console.log('Tables in votes.db:');
    let foundOldTables = false;
    tables.forEach(table => {
      const isOld = (table.name === 'rate_limits' || table.name === 'rate_limit_blocks');
      console.log(`  ${isOld ? '⚠️ ' : '  '} ${table.name}${isOld ? ' (OLD - should not exist!)' : ''}`);
      if (isOld) foundOldTables = true;
    });
    
    if (foundOldTables) {
      console.log('\n  ⚠️  PROBLEM: Old rate limit tables found in votes.db!');
      console.log('  Run: node scripts/cleanup-old-rate-limits.js');
    }
    
    // Check jukebox_queue for rate limiting data
    try {
      const queueCount = votesDb.prepare('SELECT COUNT(*) as count FROM jukebox_queue').get();
      console.log(`\n  ✅ jukebox_queue table exists with ${queueCount.count} total records`);
      
      // Group by requester_ip to see rate limiting
      const ipCounts = votesDb.prepare(`
        SELECT requester_ip, COUNT(*) as count 
        FROM jukebox_queue 
        WHERE created_at > datetime('now', '-1 hour')
        GROUP BY requester_ip
        ORDER BY count DESC
        LIMIT 10
      `).all();
      
      if (ipCounts.length > 0) {
        console.log('\n  📊 Request counts per IP (last hour):');
        ipCounts.forEach(row => {
          console.log(`    ${row.requester_ip}: ${row.count} requests`);
        });
      } else {
        console.log('  (No requests in the last hour)');
      }
    } catch (e) {
      console.log('  ⚠️  Error reading jukebox_queue:', e.message);
    }
    
    votesDb.close();
  } catch (error) {
    console.log('❌ Error reading votes.db:', error.message);
  }
} else {
  console.log('❌ votes.db does not exist!');
  console.log('   Run: npm run setup');
}

console.log('\n' + '='.repeat(60));
console.log('\n✅ Diagnostic complete!');

// Summary
if (fs.existsSync(oldDbPath)) {
  console.log('\n⚠️  ISSUES FOUND:');
  console.log('   - Old fpp-control.db database exists');
  console.log('   - This is likely causing the jumping request count issue');
  console.log('\n💡 To fix, run:');
  console.log('   node scripts/cleanup-old-rate-limits.js');
} else {
  console.log('\n✅ No issues found with rate limiting system!');
}
console.log('');
