const Database = require('better-sqlite3');
const db = new Database('votes.db');

console.log('=== FPP STATE ===');
const state = db.prepare('SELECT * FROM fpp_state').get();
console.log(JSON.stringify(state, null, 2));

console.log('\n=== RECENT POLL LOGS (Last 5) ===');
const logs = db.prepare('SELECT * FROM fpp_poll_log ORDER BY poll_timestamp DESC LIMIT 5').all();
logs.forEach(log => {
  const status = log.success ? '✓ SUCCESS' : '✗ FAIL';
  const details = log.success 
    ? `status=${log.status}, sequence=${log.current_sequence}`
    : `error=${log.error_message}`;
  console.log(`[${log.poll_timestamp}] ${status}: ${details} (${log.response_time_ms}ms)`);
});

console.log('\n=== POLL STATISTICS ===');
const stats = db.prepare(`
  SELECT 
    COUNT(*) as total_polls,
    SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as successful_polls,
    SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END) as failed_polls,
    AVG(response_time_ms) as avg_response_time,
    MAX(consecutive_failures) as max_consecutive_failures
  FROM fpp_poll_log
`).get();
console.log(JSON.stringify(stats, null, 2));

db.close();
