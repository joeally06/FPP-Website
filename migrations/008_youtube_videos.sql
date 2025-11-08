-- Migration: YouTube Videos for Light Shows
-- Description: Create table to store YouTube video links for past light shows
-- Date: 2025-11-08

CREATE TABLE IF NOT EXISTS youtube_videos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  youtube_id TEXT NOT NULL UNIQUE,
  description TEXT,
  thumbnail_url TEXT,
  duration_seconds INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_youtube_created ON youtube_videos(created_at);
CREATE INDEX IF NOT EXISTS idx_youtube_youtube_id ON youtube_videos(youtube_id);