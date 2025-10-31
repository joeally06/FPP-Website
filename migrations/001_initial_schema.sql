-- ========================================
-- FPP Control Center - Initial Schema
-- Migration: 001_initial_schema
-- ========================================

-- ========================================
-- Votes and Jukebox Tables
-- ========================================

CREATE TABLE IF NOT EXISTS votes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sequence_name TEXT NOT NULL,
  vote_type TEXT NOT NULL CHECK (vote_type IN ('up', 'down')),
  user_ip TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(sequence_name, user_ip)
);

CREATE INDEX IF NOT EXISTS idx_votes_sequence ON votes(sequence_name);
CREATE INDEX IF NOT EXISTS idx_votes_user_sequence ON votes(user_ip, sequence_name);

CREATE TABLE IF NOT EXISTS jukebox_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sequence_name TEXT NOT NULL,
  media_name TEXT,
  requester_name TEXT,
  requester_ip TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'playing', 'completed', 'skipped')),
  priority INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  played_at DATETIME,
  original_playlist TEXT,
  original_item_index INTEGER,
  was_resumed BOOLEAN DEFAULT 0,
  started_at DATETIME,
  duration_ms INTEGER
);

CREATE INDEX IF NOT EXISTS idx_jukebox_status ON jukebox_queue(status);
CREATE INDEX IF NOT EXISTS idx_jukebox_priority ON jukebox_queue(priority DESC, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_jukebox_played_at ON jukebox_queue(played_at DESC);
CREATE INDEX IF NOT EXISTS idx_jukebox_resume ON jukebox_queue(status, was_resumed, original_playlist);

-- ========================================
-- Sequence Tracking Tables
-- ========================================

CREATE TABLE IF NOT EXISTS sequence_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sequence_name TEXT NOT NULL UNIQUE,
  total_requests INTEGER DEFAULT 0,
  last_requested DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sequence_requests_popularity ON sequence_requests(total_requests DESC);
CREATE INDEX IF NOT EXISTS idx_sequence_requests_last ON sequence_requests(last_requested DESC);

CREATE TABLE IF NOT EXISTS cached_sequences (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sequence_name TEXT NOT NULL UNIQUE,
  last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_cached_sequences_updated ON cached_sequences(last_updated DESC);

CREATE TABLE IF NOT EXISTS sequence_metadata (
  sequence_name TEXT PRIMARY KEY,
  song_title TEXT,
  artist TEXT,
  album TEXT,
  release_year INTEGER,
  album_cover_url TEXT,
  spotify_id TEXT,
  last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_metadata_updated ON sequence_metadata(last_updated DESC);

-- ========================================
-- Theme Settings
-- ========================================

CREATE TABLE IF NOT EXISTS theme_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  active_theme_id TEXT NOT NULL DEFAULT 'default',
  custom_particles TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO theme_settings (id, active_theme_id) VALUES (1, 'default');

-- ========================================
-- Santa Letters
-- ========================================

CREATE TABLE IF NOT EXISTS santa_letters (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  child_name TEXT NOT NULL,
  child_age INTEGER,
  parent_email TEXT NOT NULL,
  letter_content TEXT NOT NULL,
  santa_reply TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'sent', 'rejected')),
  ip_address TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  sent_at DATETIME,
  admin_notes TEXT,
  queue_status TEXT DEFAULT 'queued' CHECK (queue_status IN ('queued', 'processing', 'completed', 'failed')),
  processing_started_at DATETIME,
  processing_completed_at DATETIME,
  retry_count INTEGER DEFAULT 0,
  last_error TEXT
);

CREATE INDEX IF NOT EXISTS idx_santa_created ON santa_letters(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_santa_status ON santa_letters(status);
CREATE INDEX IF NOT EXISTS idx_santa_queue_status ON santa_letters(queue_status, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_santa_ip_date ON santa_letters(ip_address, created_at);

-- ========================================
-- Analytics and Visitor Tracking
-- ========================================

CREATE TABLE IF NOT EXISTS visitors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  visitor_hash TEXT NOT NULL UNIQUE,
  first_visit DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_visit DATETIME DEFAULT CURRENT_TIMESTAMP,
  total_visits INTEGER DEFAULT 1,
  city TEXT,
  region TEXT,
  country TEXT
);

CREATE INDEX IF NOT EXISTS idx_visitors_hash ON visitors(visitor_hash);
CREATE INDEX IF NOT EXISTS idx_visitors_last_visit ON visitors(last_visit DESC);

CREATE TABLE IF NOT EXISTS sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  visitor_hash TEXT NOT NULL,
  session_start DATETIME DEFAULT CURRENT_TIMESTAMP,
  session_end DATETIME,
  page_views INTEGER DEFAULT 1,
  duration_seconds INTEGER,
  user_agent TEXT,
  FOREIGN KEY (visitor_hash) REFERENCES visitors(visitor_hash)
);

CREATE INDEX IF NOT EXISTS idx_sessions_visitor ON sessions(visitor_hash);
CREATE INDEX IF NOT EXISTS idx_sessions_start ON sessions(session_start DESC);

CREATE TABLE IF NOT EXISTS page_views (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER NOT NULL,
  page_path TEXT NOT NULL,
  view_time DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES sessions(id)
);

CREATE INDEX IF NOT EXISTS idx_page_views_session ON page_views(session_id);
CREATE INDEX IF NOT EXISTS idx_page_views_time ON page_views(view_time DESC);
CREATE INDEX IF NOT EXISTS idx_page_views_path ON page_views(page_path, view_time DESC);

-- ========================================
-- Device Monitoring
-- ========================================

CREATE TABLE IF NOT EXISTS device_status (
  device_id TEXT PRIMARY KEY,
  is_online BOOLEAN NOT NULL DEFAULT 0,
  last_checked DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_seen_online DATETIME,
  consecutive_failures INTEGER DEFAULT 0,
  last_notified DATETIME
);

CREATE INDEX IF NOT EXISTS idx_device_status_online ON device_status(is_online, last_checked DESC);
CREATE INDEX IF NOT EXISTS idx_device_status_checked ON device_status(last_checked DESC);
CREATE INDEX IF NOT EXISTS idx_device_status_failures ON device_status(consecutive_failures DESC);

CREATE TABLE IF NOT EXISTS devices (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  ip TEXT NOT NULL,
  enabled BOOLEAN DEFAULT 1,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_devices_enabled ON devices(enabled);
CREATE INDEX IF NOT EXISTS idx_devices_type ON devices(type);

CREATE TABLE IF NOT EXISTS monitoring_schedule (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  enabled BOOLEAN DEFAULT 1,
  start_time TEXT NOT NULL DEFAULT '16:00',
  end_time TEXT NOT NULL DEFAULT '22:00',
  timezone TEXT DEFAULT 'America/Chicago',
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO monitoring_schedule (id, enabled, start_time, end_time, timezone)
VALUES (1, 1, '16:00', '22:00', 'America/Chicago');
