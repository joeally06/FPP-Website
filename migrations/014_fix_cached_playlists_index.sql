-- Migration 014: Fix cached_playlists partial index
-- Purpose: Remove non-deterministic datetime() function from partial index
-- Issue: SQLite doesn't allow datetime('now') in WHERE clauses of indexes

-- Drop the problematic index
DROP INDEX IF EXISTS idx_cached_playlists_name_recent;

-- We don't actually need a unique constraint here since we INSERT new records
-- The cleanup process in fpp-poller handles old entries
-- Multiple recent entries for the same playlist are fine (they'll be cleaned up)

-- Record migration
INSERT INTO schema_migrations (version, description, applied_at) 
VALUES (14, 'Fix cached_playlists partial index', CURRENT_TIMESTAMP);
