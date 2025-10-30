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
    media_name TEXT,  -- MP3/media filename for better Spotify matching
    requester_name TEXT,
    requester_ip TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'playing', 'completed', 'skipped')),
    priority INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    played_at DATETIME,
    original_playlist TEXT,  -- Playlist that was interrupted
    original_item_index INTEGER,  -- Item index in the interrupted playlist
    was_resumed BOOLEAN DEFAULT 0,  -- Track if we've already resumed
    started_at DATETIME,  -- When the sequence started playing
    duration_ms INTEGER  -- Duration of the sequence in milliseconds
  );
`);

// Create theme settings table
db.exec(`
  CREATE TABLE IF NOT EXISTS theme_settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    active_theme_id TEXT NOT NULL DEFAULT 'default',
    custom_particles TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Insert default theme if not exists
db.exec(`
  INSERT OR IGNORE INTO theme_settings (id, active_theme_id) VALUES (1, 'default');
`);

// Create Santa letters table
db.exec(`
  CREATE TABLE IF NOT EXISTS santa_letters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    child_name TEXT NOT NULL,
    child_age INTEGER,
    parent_email TEXT NOT NULL,
    letter_content TEXT NOT NULL,
    santa_reply TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'sent', 'rejected')),
    ip_address TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    sent_at DATETIME,
    admin_notes TEXT
  );
`);

// Add queue fields to santa_letters table if they don't exist (for existing databases)
try {
  db.exec(`ALTER TABLE santa_letters ADD COLUMN queue_status TEXT DEFAULT 'queued' CHECK (queue_status IN ('queued', 'processing', 'completed', 'failed'));`);
} catch (error) {
  // Column might already exist, ignore error
}

try {
  db.exec(`ALTER TABLE santa_letters ADD COLUMN processing_started_at DATETIME;`);
} catch (error) {
  // Column might already exist, ignore error
}

try {
  db.exec(`ALTER TABLE santa_letters ADD COLUMN processing_completed_at DATETIME;`);
} catch (error) {
  // Column might already exist, ignore error
}

try {
  db.exec(`ALTER TABLE santa_letters ADD COLUMN retry_count INTEGER DEFAULT 0;`);
} catch (error) {
  // Column might already exist, ignore error
}

try {
  db.exec(`ALTER TABLE santa_letters ADD COLUMN last_error TEXT;`);
} catch (error) {
  // Column might already exist, ignore error
}

// Add custom_particles column if it doesn't exist (for existing databases)
try {
  db.exec(`ALTER TABLE theme_settings ADD COLUMN custom_particles TEXT;`);
} catch (error) {
  // Column might already exist, ignore error
}

// Add media_name column if it doesn't exist (for existing databases)
try {
  db.exec(`ALTER TABLE jukebox_queue ADD COLUMN media_name TEXT;`);
} catch (error) {
  // Column might already exist, ignore error
}

// Add new columns for playlist resumption tracking
try {
  db.exec(`ALTER TABLE jukebox_queue ADD COLUMN original_playlist TEXT;`);
} catch (error) {
  // Column might already exist, ignore error
}

try {
  db.exec(`ALTER TABLE jukebox_queue ADD COLUMN original_item_index INTEGER;`);
} catch (error) {
  // Column might already exist, ignore error
}

try {
  db.exec(`ALTER TABLE jukebox_queue ADD COLUMN was_resumed BOOLEAN DEFAULT 0;`);
} catch (error) {
  // Column might already exist, ignore error
}

try {
  db.exec(`ALTER TABLE jukebox_queue ADD COLUMN started_at DATETIME;`);
} catch (error) {
  // Column might already exist, ignore error
}

try {
  db.exec(`ALTER TABLE jukebox_queue ADD COLUMN duration_ms INTEGER;`);
} catch (error) {
  // Column might already exist, ignore error
}

// Create sequence requests tracking table
db.exec(`
  CREATE TABLE IF NOT EXISTS sequence_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sequence_name TEXT NOT NULL UNIQUE,
    total_requests INTEGER DEFAULT 0,
    last_requested DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Create cached media table for performance (stores sequence names from FPP playlists)
db.exec(`
  CREATE TABLE IF NOT EXISTS cached_sequences (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sequence_name TEXT NOT NULL UNIQUE,  -- Now stores sequence names without .fseq extension
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Create sequence metadata table
db.exec(`
  CREATE TABLE IF NOT EXISTS sequence_metadata (
    sequence_name TEXT PRIMARY KEY,
    song_title TEXT,
    artist TEXT,
    album TEXT,
    release_year INTEGER,
    album_cover_url TEXT,
    spotify_id TEXT,
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Create visitor tracking table
db.exec(`
  CREATE TABLE IF NOT EXISTS visitors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    visitor_hash TEXT NOT NULL UNIQUE,  -- Anonymized hash of IP
    first_visit DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_visit DATETIME DEFAULT CURRENT_TIMESTAMP,
    total_visits INTEGER DEFAULT 1,
    city TEXT,
    region TEXT,
    country TEXT
  );
`);

// Create session tracking table
db.exec(`
  CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    visitor_hash TEXT NOT NULL,
    session_start DATETIME DEFAULT CURRENT_TIMESTAMP,
    session_end DATETIME,
    page_views INTEGER DEFAULT 1,
    duration_seconds INTEGER,
    user_agent TEXT,
    FOREIGN KEY (visitor_hash) REFERENCES visitors(visitor_hash)
  );
`);

// Create page view tracking table
db.exec(`
  CREATE TABLE IF NOT EXISTS page_views (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL,
    page_path TEXT NOT NULL,
    view_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES sessions(id)
  );
`);

// Create device status tracking table for monitoring
db.exec(`
  CREATE TABLE IF NOT EXISTS device_status (
    device_id TEXT PRIMARY KEY,
    is_online BOOLEAN NOT NULL DEFAULT 0,
    last_checked DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_seen_online DATETIME,
    consecutive_failures INTEGER DEFAULT 0,
    last_notified DATETIME
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
  INSERT INTO jukebox_queue (sequence_name, media_name, requester_name, requester_ip)
  VALUES (?, ?, ?, ?)
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

export const storeInterruptedPlaylist = db.prepare(`
  UPDATE jukebox_queue 
  SET original_playlist = ?, original_item_index = ? 
  WHERE id = ?
`);

export const getInterruptedPlaylistInfo = db.prepare(`
  SELECT id, sequence_name, original_playlist, original_item_index 
  FROM jukebox_queue 
  WHERE status = 'completed' AND was_resumed = 0 AND original_playlist IS NOT NULL
  ORDER BY played_at DESC
  LIMIT 1
`);

export const markPlaylistAsResumed = db.prepare(`
  UPDATE jukebox_queue 
  SET was_resumed = 1 
  WHERE id = ?
`);

export const updateStartTimeAndDuration = db.prepare(`
  UPDATE jukebox_queue 
  SET started_at = CURRENT_TIMESTAMP, duration_ms = ? 
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

// Cached sequences prepared statements (stores sequence names from FPP playlists)
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

export const getMediaNameForSequence = db.prepare(`
  SELECT sequence_name as media_name FROM cached_sequences 
  WHERE sequence_name = ? 
  LIMIT 1
`);

export const getCacheAge = db.prepare(`
  SELECT MAX(last_updated) as last_updated FROM cached_sequences
`);

// Sequence metadata prepared statements
export const getSequenceMetadata = db.prepare(`
  SELECT * FROM sequence_metadata WHERE sequence_name = ?
`);

export const upsertSequenceMetadata = db.prepare(`
  INSERT INTO sequence_metadata (sequence_name, song_title, artist, album, release_year, album_cover_url, spotify_id, last_updated)
  VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  ON CONFLICT(sequence_name) DO UPDATE SET
    song_title = excluded.song_title,
    artist = excluded.artist,
    album = excluded.album,
    release_year = excluded.release_year,
    album_cover_url = excluded.album_cover_url,
    spotify_id = excluded.spotify_id,
    last_updated = CURRENT_TIMESTAMP
`);

export const getAllSequenceMetadata = db.prepare(`
  SELECT * FROM sequence_metadata ORDER BY last_updated DESC
`);

// Theme prepared statements
export const getActiveTheme = db.prepare(`
  SELECT active_theme_id, custom_particles FROM theme_settings WHERE id = 1
`);

export const setActiveTheme = db.prepare(`
  UPDATE theme_settings SET active_theme_id = ?, custom_particles = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1
`);

// Santa letters prepared statements
export const insertSantaLetter = db.prepare(`
  INSERT INTO santa_letters (child_name, child_age, parent_email, letter_content, ip_address)
  VALUES (?, ?, ?, ?, ?)
`);

export const getSantaLetter = db.prepare(`
  SELECT * FROM santa_letters WHERE id = ?
`);

export const getAllSantaLetters = db.prepare(`
  SELECT * FROM santa_letters ORDER BY created_at DESC
`);

export const updateSantaReply = db.prepare(`
  UPDATE santa_letters SET santa_reply = ?, status = ?, sent_at = CURRENT_TIMESTAMP WHERE id = ?
`);

export const updateSantaLetterStatus = db.prepare(`
  UPDATE santa_letters SET status = ?, admin_notes = ? WHERE id = ?
`);

// Queue management prepared statements
export const getNextQueuedLetter = db.prepare(`
  SELECT * FROM santa_letters 
  WHERE queue_status = 'queued' 
  ORDER BY created_at ASC 
  LIMIT 1
`);

export const markLetterProcessing = db.prepare(`
  UPDATE santa_letters 
  SET queue_status = 'processing', 
      processing_started_at = CURRENT_TIMESTAMP 
  WHERE id = ?
`);

export const markLetterCompleted = db.prepare(`
  UPDATE santa_letters 
  SET queue_status = 'completed',
      santa_reply = ?,
      status = 'sent',
      processing_completed_at = CURRENT_TIMESTAMP,
      sent_at = CURRENT_TIMESTAMP
  WHERE id = ?
`);

export const markLetterFailed = db.prepare(`
  UPDATE santa_letters 
  SET queue_status = 'failed',
      last_error = ?,
      retry_count = ?
  WHERE id = ?
`);

export const requeueLetter = db.prepare(`
  UPDATE santa_letters 
  SET queue_status = 'queued',
      last_error = ?,
      retry_count = ?,
      processing_started_at = NULL
  WHERE id = ?
`);

export const getQueueStats = db.prepare(`
  SELECT 
    queue_status,
    COUNT(*) as count
  FROM santa_letters
  WHERE queue_status IN ('queued', 'processing', 'failed')
  GROUP BY queue_status
`);

// Device monitoring prepared statements
export const upsertDeviceStatus = db.prepare(`
  INSERT INTO device_status (device_id, is_online, last_checked, last_seen_online, consecutive_failures, last_notified)
  VALUES (?, ?, CURRENT_TIMESTAMP, ?, ?, ?)
  ON CONFLICT(device_id) DO UPDATE SET
    is_online = excluded.is_online,
    last_checked = CURRENT_TIMESTAMP,
    last_seen_online = excluded.last_seen_online,
    consecutive_failures = excluded.consecutive_failures,
    last_notified = excluded.last_notified
`);

export const getDeviceStatus = db.prepare(`
  SELECT * FROM device_status WHERE device_id = ?
`);

export const getAllDeviceStatuses = db.prepare(`
  SELECT * FROM device_status ORDER BY device_id
`);

export default db;