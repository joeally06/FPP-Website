-- Migration 012: FPP State Caching System
-- Description: Store FPP device state in database for efficient frontend queries
-- Date: 2025-11-09
--
-- This migration creates tables to cache FPP status, reducing direct API calls
-- and improving performance for multiple concurrent users.

-- ============================================================================
-- Table: fpp_state
-- Purpose: Store current FPP device status (single row table)
-- ============================================================================

CREATE TABLE IF NOT EXISTS fpp_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),  -- Enforce single row
  
  -- FPP Status
  status TEXT DEFAULT 'unknown',          -- 'idle', 'playing', 'stopped', 'unknown'
  current_sequence TEXT,                  -- Currently playing sequence
  current_playlist TEXT,                  -- Active playlist name
  current_playlist_index INTEGER,         -- Position in playlist (0-based)
  current_playlist_count INTEGER,         -- Total sequences in playlist
  
  -- Playback Info
  seconds_played INTEGER DEFAULT 0,       -- Current playback position
  seconds_remaining INTEGER DEFAULT 0,    -- Time remaining in sequence
  
  -- Device Info
  volume INTEGER DEFAULT 0,               -- Current volume (0-100)
  mode TEXT DEFAULT 'player',             -- 'player', 'bridge', 'master', 'remote'
  uptime INTEGER DEFAULT 0,               -- FPP uptime in seconds
  
  -- Metadata
  last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_poll_success BOOLEAN DEFAULT 1,
  last_error TEXT,
  
  -- Security: Track last update to detect stale data
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Initialize with single row
INSERT OR IGNORE INTO fpp_state (id) VALUES (1);

-- Index for timestamp queries
CREATE INDEX IF NOT EXISTS idx_fpp_state_updated ON fpp_state(last_updated);

-- ============================================================================
-- Table: fpp_cached_playlists
-- Purpose: Cache available playlists from FPP device
-- ============================================================================

CREATE TABLE IF NOT EXISTS fpp_cached_playlists (
  name TEXT PRIMARY KEY,
  description TEXT,
  sequence_count INTEGER DEFAULT 0,
  total_duration INTEGER DEFAULT 0,       -- Total duration in seconds
  is_active BOOLEAN DEFAULT 0,            -- Currently playing
  last_played DATETIME,
  last_synced DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  -- Metadata
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_cached_playlists_active ON fpp_cached_playlists(is_active);
CREATE INDEX IF NOT EXISTS idx_cached_playlists_synced ON fpp_cached_playlists(last_synced);

-- ============================================================================
-- Table: fpp_cached_playlist_sequences
-- Purpose: Store sequences within cached playlists
-- ============================================================================

CREATE TABLE IF NOT EXISTS fpp_cached_playlist_sequences (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  playlist_name TEXT NOT NULL,
  sequence_name TEXT NOT NULL,
  position INTEGER NOT NULL,              -- Order in playlist (0-based)
  duration INTEGER,                        -- Duration in seconds
  enabled BOOLEAN DEFAULT 1,
  last_synced DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  -- Foreign key to cached playlists
  FOREIGN KEY (playlist_name) REFERENCES fpp_cached_playlists(name) ON DELETE CASCADE,
  
  -- Ensure unique position per playlist
  UNIQUE(playlist_name, position)
);

CREATE INDEX IF NOT EXISTS idx_cached_playlist_seq_playlist ON fpp_cached_playlist_sequences(playlist_name);
CREATE INDEX IF NOT EXISTS idx_cached_playlist_seq_position ON fpp_cached_playlist_sequences(position);
CREATE INDEX IF NOT EXISTS idx_cached_playlist_seq_name ON fpp_cached_playlist_sequences(sequence_name);

-- ============================================================================
-- Table: fpp_poll_log
-- Purpose: Track polling history for monitoring and diagnostics
-- ============================================================================

CREATE TABLE IF NOT EXISTS fpp_poll_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  poll_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  success BOOLEAN DEFAULT 1,
  response_time_ms INTEGER,
  error_message TEXT,
  status TEXT,                            -- FPP status at time of poll
  current_sequence TEXT,
  
  -- Rate limiting tracking
  consecutive_failures INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_poll_log_timestamp ON fpp_poll_log(poll_timestamp);
CREATE INDEX IF NOT EXISTS idx_poll_log_success ON fpp_poll_log(success);

-- ============================================================================
-- Trigger: Auto-cleanup old poll logs (keep last 1000 entries)
-- Purpose: Prevent unbounded table growth
-- ============================================================================

CREATE TRIGGER IF NOT EXISTS cleanup_poll_log
AFTER INSERT ON fpp_poll_log
BEGIN
  DELETE FROM fpp_poll_log 
  WHERE id <= (SELECT MAX(id) - 1000 FROM fpp_poll_log)
  AND (SELECT COUNT(*) FROM fpp_poll_log) > 1000;
END;

-- ============================================================================
-- View: fpp_health_summary
-- Purpose: Quick health check for monitoring
-- ============================================================================

CREATE VIEW IF NOT EXISTS fpp_health_summary AS
SELECT 
  fs.status,
  fs.current_sequence,
  fs.last_updated,
  fs.last_poll_success,
  fs.last_error,
  (julianday('now') - julianday(fs.last_updated)) * 86400 as age_seconds,
  (SELECT COUNT(*) FROM fpp_poll_log WHERE success = 0 AND poll_timestamp > datetime('now', '-5 minutes')) as recent_failures,
  (SELECT AVG(response_time_ms) FROM fpp_poll_log WHERE success = 1 AND poll_timestamp > datetime('now', '-5 minutes')) as avg_response_ms
FROM fpp_state fs;

-- ============================================================================
-- VERIFICATION QUERIES (for manual testing)
-- ============================================================================

-- Check if tables were created:
-- SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'fpp_%';

-- View health summary:
-- SELECT * FROM fpp_health_summary;

-- Check poll log:
-- SELECT * FROM fpp_poll_log ORDER BY poll_timestamp DESC LIMIT 10;
