-- Migration: Spotify Metadata Cache
-- Description: Create table to store Spotify album art and metadata for sequences
-- Date: 2025-11-06

CREATE TABLE IF NOT EXISTS spotify_metadata (
  sequence_name TEXT PRIMARY KEY,
  album_art_url TEXT,
  artist_name TEXT,
  album_name TEXT,
  track_name TEXT,
  spotify_track_id TEXT,
  spotify_uri TEXT,
  preview_url TEXT,
  last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
  search_query TEXT,
  match_confidence TEXT CHECK(match_confidence IN ('high', 'medium', 'low', 'none')) DEFAULT 'none'
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_spotify_updated ON spotify_metadata(last_updated);
CREATE INDEX IF NOT EXISTS idx_spotify_confidence ON spotify_metadata(match_confidence);
