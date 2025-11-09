-- Migration: Add theme support to YouTube videos
-- Description: Add theme column to associate videos with christmas/halloween themes
-- Date: 2025-11-08

-- Add theme column with default value and constraint
ALTER TABLE youtube_videos ADD COLUMN theme TEXT DEFAULT 'christmas' CHECK(theme IN ('christmas', 'halloween'));

-- Create index for theme-based queries (performance optimization)
CREATE INDEX IF NOT EXISTS idx_youtube_theme ON youtube_videos(theme);

-- Update any existing videos to have christmas theme (safe default)
UPDATE youtube_videos SET theme = 'christmas' WHERE theme IS NULL;
