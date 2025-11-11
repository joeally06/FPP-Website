-- Migration 015: Add Jukebox Configuration Settings
-- Purpose: Enable admin-configurable rate limiting and queue insertion behavior
-- Security: Server-side enforcement, validated ranges, admin-only access

-- Add jukebox rate limit setting (default: 3 requests per hour)
-- Valid range: 1-10 (enforced in API)
INSERT INTO settings (key, value, updated_at) 
VALUES ('jukebox_rate_limit', '3', CURRENT_TIMESTAMP)
ON CONFLICT(key) DO NOTHING;

-- Add jukebox insert mode setting (default: after_current)
-- Valid options: 'interrupt', 'after_current', 'end_of_playlist'
INSERT INTO settings (key, value, updated_at) 
VALUES ('jukebox_insert_mode', 'after_current', CURRENT_TIMESTAMP)
ON CONFLICT(key) DO NOTHING;

-- Security notes:
-- 1. Rate limit enforced server-side in API (not client-side)
-- 2. Insert mode validated against enum in API
-- 3. Settings only modifiable by authenticated admins
-- 4. Safe defaults prevent abuse if settings corrupted
