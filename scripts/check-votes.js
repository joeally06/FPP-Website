const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(process.cwd(), 'votes.db');
const db = new Database(dbPath, { readonly: true });

console.log('\n📊 Checking votes database...\n');

// Get all votes
const allVotes = db.prepare(`
  SELECT sequence_name, vote_type, created_at 
  FROM votes 
  ORDER BY created_at DESC 
  LIMIT 20
`).all();

console.log(`Total votes found: ${allVotes.length}\n`);

if (allVotes.length > 0) {
  console.log('Recent votes:');
  allVotes.forEach((vote, index) => {
    console.log(`${index + 1}. ${vote.sequence_name} - ${vote.vote_type} - ${vote.created_at}`);
  });
  
  // Get vote counts by sequence
  console.log('\n\nVotes by sequence:');
  const votesBySequence = db.prepare(`
    SELECT 
      sequence_name,
      SUM(CASE WHEN vote_type = 'up' THEN 1 ELSE 0 END) as upvotes,
      SUM(CASE WHEN vote_type = 'down' THEN 1 ELSE 0 END) as downvotes,
      COUNT(*) as total_votes
    FROM votes
    GROUP BY sequence_name
    ORDER BY total_votes DESC
  `).all();
  
  votesBySequence.forEach((seq) => {
    console.log(`  ${seq.sequence_name}: ${seq.upvotes} up, ${seq.downvotes} down (${seq.total_votes} total)`);
  });
  
  // Check date range
  const oldestVote = db.prepare('SELECT MIN(created_at) as oldest FROM votes').get();
  const newestVote = db.prepare('SELECT MAX(created_at) as newest FROM votes').get();
  
  console.log(`\n\nDate range:`);
  console.log(`  Oldest: ${oldestVote.oldest}`);
  console.log(`  Newest: ${newestVote.newest}`);
  
  // Check what's in last 7 days
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const sevenDaysStr = sevenDaysAgo.toISOString().split('T')[0];
  
  const last7Days = db.prepare(`
    SELECT COUNT(*) as count 
    FROM votes 
    WHERE created_at >= ?
  `).get(sevenDaysStr);
  
  console.log(`\nVotes in last 7 days: ${last7Days.count}`);
  
  // Check what's in last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyDaysStr = thirtyDaysAgo.toISOString().split('T')[0];
  
  const last30Days = db.prepare(`
    SELECT COUNT(*) as count 
    FROM votes 
    WHERE created_at >= ?
  `).get(thirtyDaysStr);
  
  console.log(`Votes in last 30 days: ${last30Days.count}`);
} else {
  console.log('No votes found in database!');
}

db.close();
