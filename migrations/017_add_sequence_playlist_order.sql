-- Migration 017: Add playlist_order column to cached_sequences
-- This allows sequences to be displayed in the same order as the FPP playlist

-- Add the playlist_order column (default to 0 for existing rows)
ALTER TABLE cached_sequences ADD COLUMN playlist_order INTEGER DEFAULT 0;

-- Create index for efficient ordering
CREATE INDEX IF NOT EXISTS idx_cached_sequences_order ON cached_sequences(playlist_order ASC);
