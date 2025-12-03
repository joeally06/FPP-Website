-- Migration: Add geolocation tracking to jukebox
-- This enables location-based access control to prevent remote voting/requests

-- Add geolocation columns to jukebox_queue
ALTER TABLE jukebox_queue ADD COLUMN latitude REAL;
ALTER TABLE jukebox_queue ADD COLUMN longitude REAL;
ALTER TABLE jukebox_queue ADD COLUMN city TEXT;
ALTER TABLE jukebox_queue ADD COLUMN region TEXT;
ALTER TABLE jukebox_queue ADD COLUMN country_code TEXT;
ALTER TABLE jukebox_queue ADD COLUMN distance_from_show REAL;

-- Add geolocation columns to votes table
ALTER TABLE votes ADD COLUMN latitude REAL;
ALTER TABLE votes ADD COLUMN longitude REAL;
ALTER TABLE votes ADD COLUMN city TEXT;
ALTER TABLE votes ADD COLUMN region TEXT;
ALTER TABLE votes ADD COLUMN country_code TEXT;
ALTER TABLE votes ADD COLUMN distance_from_show REAL;

-- Create location restriction settings
CREATE TABLE IF NOT EXISTS location_restrictions (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  is_active BOOLEAN DEFAULT 0,
  max_distance_miles INTEGER DEFAULT 1,
  show_latitude REAL,
  show_longitude REAL,
  show_location_name TEXT,
  last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_by_admin TEXT
);

-- Default: disabled, 1 mile radius
INSERT OR IGNORE INTO location_restrictions (id, is_active, max_distance_miles) 
VALUES (1, 0, 1);
