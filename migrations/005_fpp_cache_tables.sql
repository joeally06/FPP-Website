-- Migration: FPP Cache Tables
-- Description: Tables for caching FPP playlists and sequences locally
-- Created: 2025-11-05

-- FPP Playlists Cache
CREATE TABLE IF NOT EXISTS fpp_playlists (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  item_count INTEGER DEFAULT 0,
  duration INTEGER DEFAULT 0,
  raw_data TEXT,
  synced_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- FPP Sequences Cache
CREATE TABLE IF NOT EXISTS fpp_sequences (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  filename TEXT,
  length_ms INTEGER DEFAULT 0,
  channel_count INTEGER DEFAULT 0,
  raw_data TEXT,
  synced_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- FPP Sync Status
CREATE TABLE IF NOT EXISTS fpp_sync_status (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  last_sync DATETIME,
  last_success DATETIME,
  last_error TEXT,
  playlists_count INTEGER DEFAULT 0,
  sequences_count INTEGER DEFAULT 0
);

-- Initialize sync status
INSERT OR IGNORE INTO fpp_sync_status (id, last_sync) VALUES (1, NULL);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_fpp_playlists_name ON fpp_playlists(name);
CREATE INDEX IF NOT EXISTS idx_fpp_sequences_name ON fpp_sequences(name);
CREATE INDEX IF NOT EXISTS idx_fpp_playlists_synced ON fpp_playlists(synced_at);
CREATE INDEX IF NOT EXISTS idx_fpp_sequences_synced ON fpp_sequences(synced_at);
