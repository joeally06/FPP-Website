import Database from 'better-sqlite3';
import path from 'path';

// Initialize database
const dbPath = path.join(process.cwd(), 'votes.db');
const db = new Database(dbPath);

// Create votes table
db.exec(`
  CREATE TABLE IF NOT EXISTS votes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sequence_name TEXT NOT NULL,
    vote_type TEXT NOT NULL CHECK (vote_type IN ('up', 'down')),
    user_ip TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(sequence_name, user_ip)
  );
`);

// Prepared statements
export const insertVote = db.prepare(`
  INSERT OR REPLACE INTO votes (sequence_name, vote_type, user_ip)
  VALUES (?, ?, ?)
`);

export const getVoteCounts = db.prepare(`
  SELECT
    sequence_name,
    SUM(CASE WHEN vote_type = 'up' THEN 1 ELSE 0 END) as upvotes,
    SUM(CASE WHEN vote_type = 'down' THEN 1 ELSE 0 END) as downvotes
  FROM votes
  GROUP BY sequence_name
`);

export const getUserVote = db.prepare(`
  SELECT vote_type FROM votes WHERE sequence_name = ? AND user_ip = ?
`);

export default db;