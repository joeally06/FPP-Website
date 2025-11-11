const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(process.cwd(), 'votes.db');
const db = new Database(dbPath, { readonly: true });

// Calculate date range (7 days)
const startDate = new Date();
startDate.setDate(startDate.getDate() - 7);
const startDateStr = startDate.toISOString().split('T')[0];

console.log('\n📊 Testing analytics query...\n');
console.log(`Start date (7 days ago): ${startDateStr}`);
console.log(`Today: ${new Date().toISOString().split('T')[0]}\n`);

// Test the EXACT query from analytics API
const topSequences = db.prepare(`
  SELECT 
    sequence_name as name,
    SUM(CASE WHEN vote_type = 'up' THEN 1 ELSE 0 END) as upvotes,
    SUM(CASE WHEN vote_type = 'down' THEN 1 ELSE 0 END) as downvotes,
    COUNT(*) as votes
  FROM votes
  WHERE created_at >= ?
  GROUP BY sequence_name
  ORDER BY upvotes DESC
  LIMIT 10
`).all(startDateStr);

console.log('Query results:');
console.log(JSON.stringify(topSequences, null, 2));

console.log(`\n\nTotal sequences found: ${topSequences.length}`);

// Map to final format like in API
const mapped = topSequences.map((row) => ({
  name: row.name,
  votes: row.votes,
  rating: row.votes > 0 ? (row.upvotes / row.votes) * 5 : 0
}));

console.log('\nMapped results (what API returns):');
console.log(JSON.stringify(mapped, null, 2));

db.close();
