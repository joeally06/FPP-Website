-- Migration 011: Normalize Database with Foreign Keys
-- Description: Create unified sequences table and add FK relationships
-- Date: 2025-11-09
--
-- IMPORTANT: This migration consolidates spotify_metadata and sequence_metadata
-- into a single 'sequences' table to eliminate duplication

-- ============================================================================
-- STEP 1: Create unified sequences table (single source of truth for metadata)
-- ============================================================================

CREATE TABLE IF NOT EXISTS sequences (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sequence_name TEXT NOT NULL UNIQUE,      -- FPP sequence filename (without .fseq)
  
  -- Metadata fields
  title TEXT,                              -- Song title
  artist TEXT,                             -- Artist name
  album TEXT,                              -- Album name
  album_art_url TEXT,                      -- Album cover URL
  spotify_url TEXT,                        -- Spotify web URL
  spotify_id TEXT,                         -- Spotify track ID
  spotify_uri TEXT,                        -- Spotify URI (spotify:track:xxx)
  preview_url TEXT,                        -- Spotify preview URL
  year TEXT,                               -- Release year
  
  -- Metadata management
  is_custom_metadata BOOLEAN DEFAULT 0,    -- TRUE if user edited in Media Library
  metadata_source TEXT,                    -- 'manual', 'spotify_api', 'media_library'
  last_metadata_update DATETIME,           -- When metadata was last changed
  
  -- Usage statistics
  play_count INTEGER DEFAULT 0,            -- Total times played
  request_count INTEGER DEFAULT 0,         -- Total times requested
  last_played_at DATETIME,                 -- Last play timestamp
  last_requested_at DATETIME,              -- Last request timestamp
  
  -- Timestamps
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_sequences_name ON sequences(sequence_name);
CREATE INDEX IF NOT EXISTS idx_sequences_spotify_id ON sequences(spotify_id);
CREATE INDEX IF NOT EXISTS idx_sequences_spotify_url ON sequences(spotify_url);
CREATE INDEX IF NOT EXISTS idx_sequences_last_played ON sequences(last_played_at);
CREATE INDEX IF NOT EXISTS idx_sequences_custom_metadata ON sequences(is_custom_metadata);
CREATE INDEX IF NOT EXISTS idx_sequences_play_count ON sequences(play_count DESC);

-- ============================================================================
-- STEP 2: Migrate data from spotify_metadata (Media Library - takes priority)
-- ============================================================================

INSERT OR IGNORE INTO sequences (
  sequence_name,
  title,
  artist,
  album,
  album_art_url,
  spotify_url,
  spotify_id,
  spotify_uri,
  preview_url,
  is_custom_metadata,
  metadata_source,
  last_metadata_update,
  created_at,
  updated_at
)
SELECT 
  sequence_name,
  track_name as title,
  artist_name as artist,
  album_name as album,
  album_art_url,
  spotify_url,
  spotify_track_id as spotify_id,
  spotify_uri,
  preview_url,
  1 as is_custom_metadata,                  -- Mark as custom (user edited)
  'media_library' as metadata_source,
  last_updated as last_metadata_update,
  last_updated as created_at,
  last_updated as updated_at
FROM spotify_metadata
WHERE track_name IS NOT NULL;                -- Only migrate valid entries

-- ============================================================================
-- STEP 3: Migrate data from sequence_metadata (auto-cached, lower priority)
-- ============================================================================

-- Only insert if sequence doesn't already exist (spotify_metadata takes priority)
INSERT OR IGNORE INTO sequences (
  sequence_name,
  title,
  artist,
  album,
  album_art_url,
  spotify_url,
  spotify_id,
  year,
  is_custom_metadata,
  metadata_source,
  last_metadata_update,
  created_at,
  updated_at
)
SELECT 
  sequence_name,
  song_title as title,
  artist,
  album,
  album_cover_url as album_art_url,
  spotify_url,
  spotify_id,
  CAST(release_year AS TEXT) as year,
  0 as is_custom_metadata,                  -- Mark as auto-cached
  'spotify_api' as metadata_source,
  last_updated as last_metadata_update,
  last_updated as created_at,
  last_updated as updated_at
FROM sequence_metadata
WHERE song_title IS NOT NULL;               -- Only migrate valid entries

-- ============================================================================
-- STEP 4: Migrate play statistics from sequence_requests
-- ============================================================================

UPDATE sequences
SET 
  request_count = (
    SELECT total_requests 
    FROM sequence_requests 
    WHERE sequence_requests.sequence_name = sequences.sequence_name
  ),
  last_requested_at = (
    SELECT last_requested 
    FROM sequence_requests 
    WHERE sequence_requests.sequence_name = sequences.sequence_name
  )
WHERE sequence_name IN (SELECT sequence_name FROM sequence_requests);

-- ============================================================================
-- STEP 5: Add sequence_id to jukebox_queue (preparation for FK)
-- ============================================================================

-- Add column first (SQLite doesn't support ALTER TABLE ADD FOREIGN KEY)
ALTER TABLE jukebox_queue ADD COLUMN sequence_id INTEGER;

-- Populate sequence_id by matching sequence_name
UPDATE jukebox_queue
SET sequence_id = (
  SELECT id FROM sequences WHERE sequences.sequence_name = jukebox_queue.sequence_name
);

-- Create index on the new FK column
CREATE INDEX IF NOT EXISTS idx_queue_sequence_id ON jukebox_queue(sequence_id);

-- ============================================================================
-- STEP 6: Update play statistics from jukebox_queue
-- ============================================================================

-- Update play_count and last_played_at from actual queue history
UPDATE sequences
SET 
  play_count = (
    SELECT COUNT(*) 
    FROM jukebox_queue 
    WHERE jukebox_queue.sequence_id = sequences.id 
    AND status = 'completed'
  ),
  last_played_at = (
    SELECT MAX(played_at) 
    FROM jukebox_queue 
    WHERE jukebox_queue.sequence_id = sequences.id 
    AND played_at IS NOT NULL
  )
WHERE id IN (
  SELECT DISTINCT sequence_id 
  FROM jukebox_queue 
  WHERE sequence_id IS NOT NULL
);

-- ============================================================================
-- STEP 7: Create view for backward compatibility (optional)
-- ============================================================================

-- This view makes old code still work while using new table
CREATE VIEW IF NOT EXISTS spotify_metadata_view AS
SELECT 
  sequence_name,
  album_art_url,
  artist as artist_name,
  album as album_name,
  title as track_name,
  spotify_id as spotify_track_id,
  spotify_uri,
  preview_url,
  last_metadata_update as last_updated,
  metadata_source as search_query,
  'none' as match_confidence,
  is_custom_metadata as is_manual_override,
  spotify_url
FROM sequences;

-- ============================================================================
-- VERIFICATION QUERIES (for manual testing)
-- ============================================================================

-- These queries can be run separately to verify migration success:

-- Check row counts:
-- SELECT 'sequences' as table_name, COUNT(*) as count FROM sequences
-- UNION ALL
-- SELECT 'spotify_metadata', COUNT(*) FROM spotify_metadata
-- UNION ALL
-- SELECT 'sequence_metadata', COUNT(*) FROM sequence_metadata;

-- Check for orphaned queue entries:
-- SELECT COUNT(*) FROM jukebox_queue WHERE sequence_id IS NULL;

-- Check custom vs auto metadata:
-- SELECT 
--   metadata_source,
--   is_custom_metadata,
--   COUNT(*) as count
-- FROM sequences
-- GROUP BY metadata_source, is_custom_metadata;

-- ============================================================================
-- NOTES
-- ============================================================================

-- After verifying this migration works correctly:
-- 1. Old tables (spotify_metadata, sequence_metadata) can be KEPT as backup
-- 2. Update application code to use 'sequences' table
-- 3. After full testing, old tables can be dropped in future migration
-- 4. The view provides backward compatibility during transition

-- Future FK constraints can be added via:
-- CREATE TABLE new_table WITH FK → migrate data → drop old → rename new
