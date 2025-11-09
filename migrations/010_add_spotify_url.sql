-- ========================================
-- Migration: Add Spotify URL to Metadata Tables
-- Description: Store Spotify external URLs for direct linking from Now Playing
-- Date: 2025-11-08
-- Security: URLs will be validated and sanitized before display
-- ========================================

-- Add spotify_url to sequence_metadata table (auto-cache)
ALTER TABLE sequence_metadata ADD COLUMN spotify_url TEXT;

-- Add spotify_url to spotify_metadata table (Media Library)
-- Note: This table already has spotify_uri, this adds the external web URL
ALTER TABLE spotify_metadata ADD COLUMN spotify_url TEXT;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_sequence_spotify_url ON sequence_metadata(spotify_url);
CREATE INDEX IF NOT EXISTS idx_media_spotify_url ON spotify_metadata(spotify_url);
