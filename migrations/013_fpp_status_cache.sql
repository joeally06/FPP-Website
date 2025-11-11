-- Migration 013: FPP Status and Playlist Caching
-- Purpose: Cache FPP status and playlist data to eliminate direct frontend access
-- Security: Prevents exposing FPP server to client browsers

-- FPP Status Cache Table
CREATE TABLE IF NOT EXISTS fpp_status_cache (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  status_name TEXT NOT NULL,
  current_playlist TEXT,
  current_sequence TEXT,
  current_song TEXT,
  media_name TEXT,
  seconds_played INTEGER,
  seconds_remaining INTEGER,
  time_elapsed TEXT,
  time_remaining TEXT,
  volume INTEGER,
  mode_name TEXT,
  scheduler_status TEXT,
  next_playlist TEXT,
  raw_data TEXT NOT NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_fpp_status_cache_updated ON fpp_status_cache(updated_at DESC);

-- Cached Playlists Table
CREATE TABLE IF NOT EXISTS cached_playlists (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  data TEXT NOT NULL,
  cached_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_cached_playlists_name ON cached_playlists(name);
CREATE INDEX IF NOT EXISTS idx_cached_playlists_cached_at ON cached_playlists(cached_at DESC);

-- Add unique constraint to prevent duplicate recent caches
CREATE UNIQUE INDEX IF NOT EXISTS idx_cached_playlists_name_recent 
ON cached_playlists(name, cached_at) 
WHERE cached_at > datetime('now', '-5 minutes');
