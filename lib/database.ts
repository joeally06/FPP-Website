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

// Create jukebox queue table
db.exec(`
  CREATE TABLE IF NOT EXISTS jukebox_queue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sequence_name TEXT NOT NULL,
    requester_name TEXT,
    requester_ip TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'playing', 'completed', 'skipped')),
    priority INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    played_at DATETIME
  );
`);

// Create sequence requests tracking table
db.exec(`
  CREATE TABLE IF NOT EXISTS sequence_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sequence_name TEXT NOT NULL UNIQUE,
    total_requests INTEGER DEFAULT 0,
    last_requested DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Create cached sequences table for performance
db.exec(`
  CREATE TABLE IF NOT EXISTS cached_sequences (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sequence_name TEXT NOT NULL UNIQUE,
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Voting prepared statements
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

// Jukebox prepared statements
export const addToQueue = db.prepare(`
  INSERT INTO jukebox_queue (sequence_name, requester_name, requester_ip)
  VALUES (?, ?, ?)
`);

export const getQueue = db.prepare(`
  SELECT * FROM jukebox_queue 
  WHERE status = 'pending' 
  ORDER BY priority DESC, created_at ASC
`);

export const getCurrentlyPlaying = db.prepare(`
  SELECT * FROM jukebox_queue 
  WHERE status = 'playing' 
  ORDER BY played_at DESC 
  LIMIT 1
`);

export const updateQueueStatus = db.prepare(`
  UPDATE jukebox_queue 
  SET status = ?, played_at = CURRENT_TIMESTAMP 
  WHERE id = ?
`);

export const removeFromQueue = db.prepare(`
  DELETE FROM jukebox_queue WHERE id = ?
`);

export const getQueuePosition = db.prepare(`
  SELECT COUNT(*) + 1 as position
  FROM jukebox_queue 
  WHERE status = 'pending' 
  AND (priority > (SELECT priority FROM jukebox_queue WHERE id = ?) 
       OR (priority = (SELECT priority FROM jukebox_queue WHERE id = ?) 
           AND created_at < (SELECT created_at FROM jukebox_queue WHERE id = ?)))
`);

// Sequence requests prepared statements
export const incrementSequenceRequests = db.prepare(`
  INSERT INTO sequence_requests (sequence_name, total_requests, last_requested)
  VALUES (?, 1, CURRENT_TIMESTAMP)
  ON CONFLICT(sequence_name) DO UPDATE SET
    total_requests = total_requests + 1,
    last_requested = CURRENT_TIMESTAMP
`);

export const getPopularSequences = db.prepare(`
  SELECT 
    sr.sequence_name,
    sr.total_requests,
    COALESCE(v.upvotes, 0) as upvotes,
    COALESCE(v.downvotes, 0) as downvotes,
    (COALESCE(v.upvotes, 0) + sr.total_requests) as popularity_score
  FROM sequence_requests sr
  LEFT JOIN (
    SELECT 
      sequence_name,
      SUM(CASE WHEN vote_type = 'up' THEN 1 ELSE 0 END) as upvotes,
      SUM(CASE WHEN vote_type = 'down' THEN 1 ELSE 0 END) as downvotes
    FROM votes 
    GROUP BY sequence_name
  ) v ON sr.sequence_name = v.sequence_name
  ORDER BY popularity_score DESC
  LIMIT ?
`);

// Cached sequences prepared statements
export const clearCachedSequences = db.prepare(`
  DELETE FROM cached_sequences
`);

export const insertCachedSequence = db.prepare(`
  INSERT INTO cached_sequences (sequence_name, last_updated)
  VALUES (?, CURRENT_TIMESTAMP)
`);

export const getCachedSequences = db.prepare(`
  SELECT sequence_name FROM cached_sequences 
  ORDER BY sequence_name ASC
`);

export const getCacheAge = db.prepare(`
  SELECT MAX(last_updated) as last_updated FROM cached_sequences
`);

export default db;