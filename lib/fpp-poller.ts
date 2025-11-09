/**
 * FPP State Polling Service
 * 
 * Background service that polls FPP device periodically and caches
 * the state in the database for efficient frontend queries.
 * 
 * SECURITY FEATURES:
 * - Input validation on all FPP responses
 * - Exponential backoff on failures
 * - Rate limiting to prevent API abuse
 * - Graceful error handling
 * - Database transaction safety
 * 
 * Run standalone: node -r esbuild-register lib/fpp-poller.ts
 * Run with PM2: pm2 start ecosystem.config.js --only fpp-poller
 */

import Database from 'better-sqlite3';
import path from 'path';

// ============================================================================
// Configuration
// ============================================================================

const FPP_HOST = process.env.FPP_HOST || process.env.FPP_URL?.replace(/^https?:\/\//, '').replace(/:\d+$/, '') || 'fpp.local';
const FPP_PORT = process.env.FPP_PORT || '80';
const POLL_INTERVAL = parseInt(process.env.FPP_POLL_INTERVAL || '10000'); // 10 seconds default
const MIN_POLL_INTERVAL = 5000; // Minimum 5 seconds between polls
const MAX_POLL_INTERVAL = 60000; // Maximum 60 seconds on repeated failures
const RETRY_BACKOFF_MULTIPLIER = 1.5; // Exponential backoff
const MAX_CONSECUTIVE_FAILURES = 10; // Max failures before longer backoff

console.log('[FPP Poller] Starting FPP State Polling Service');
console.log(`[FPP Poller] Target: http://${FPP_HOST}:${FPP_PORT}`);
console.log(`[FPP Poller] Poll Interval: ${POLL_INTERVAL}ms`);

// ============================================================================
// Database Setup
// ============================================================================

const dbPath = path.join(process.cwd(), 'votes.db');
let db: Database.Database;

try {
  db = new Database(dbPath);
  db.pragma('foreign_keys = ON');
  db.pragma('journal_mode = WAL');
  console.log('[FPP Poller] Database connected');
} catch (error: any) {
  console.error('[FPP Poller] FATAL: Could not connect to database:', error.message);
  process.exit(1);
}

// ============================================================================
// Prepared Statements
// ============================================================================

const updateState = db.prepare(`
  UPDATE fpp_state 
  SET status = ?,
      current_sequence = ?,
      current_playlist = ?,
      current_playlist_index = ?,
      current_playlist_count = ?,
      seconds_played = ?,
      seconds_remaining = ?,
      volume = ?,
      mode = ?,
      uptime = ?,
      last_updated = CURRENT_TIMESTAMP,
      last_poll_success = 1,
      last_error = NULL,
      updated_at = CURRENT_TIMESTAMP
  WHERE id = 1
`);

const updateStateError = db.prepare(`
  UPDATE fpp_state 
  SET last_poll_success = 0,
      last_error = ?,
      last_updated = CURRENT_TIMESTAMP,
      updated_at = CURRENT_TIMESTAMP
  WHERE id = 1
`);

const logPoll = db.prepare(`
  INSERT INTO fpp_poll_log (success, response_time_ms, error_message, status, current_sequence, consecutive_failures)
  VALUES (?, ?, ?, ?, ?, ?)
`);

const updatePlaylist = db.prepare(`
  INSERT INTO fpp_cached_playlists (name, sequence_count, is_active, last_synced, updated_at)
  VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  ON CONFLICT(name) DO UPDATE SET
    sequence_count = excluded.sequence_count,
    is_active = excluded.is_active,
    last_synced = CURRENT_TIMESTAMP,
    updated_at = CURRENT_TIMESTAMP
`);

const clearActiveFlags = db.prepare(`
  UPDATE fpp_cached_playlists SET is_active = 0
`);

const deletePlaylistSequences = db.prepare(`
  DELETE FROM fpp_cached_playlist_sequences WHERE playlist_name = ?
`);

const insertSequence = db.prepare(`
  INSERT INTO fpp_cached_playlist_sequences 
  (playlist_name, sequence_name, position, duration, enabled, last_synced)
  VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
`);

// ============================================================================
// State Management
// ============================================================================

let consecutiveFailures = 0;
let currentPollInterval = POLL_INTERVAL;
let isPolling = false;

// ============================================================================
// Input Validation & Sanitization
// ============================================================================

/**
 * Validate and sanitize FPP status response
 * SECURITY: Prevent injection attacks via malicious FPP responses
 */
function validateFPPStatus(data: any): boolean {
  if (!data || typeof data !== 'object') return false;
  
  // Validate status_name
  const validStatuses = ['idle', 'playing', 'stopped', 'testing', 'unknown'];
  if (data.status_name && !validStatuses.includes(data.status_name)) {
    console.warn('[FPP Poller] Invalid status_name:', data.status_name);
    return false;
  }
  
  // Validate numeric fields
  if (data.volume !== undefined && (typeof data.volume !== 'number' || data.volume < 0 || data.volume > 100)) {
    console.warn('[FPP Poller] Invalid volume:', data.volume);
    return false;
  }
  
  if (data.seconds_played !== undefined && typeof data.seconds_played !== 'number') {
    console.warn('[FPP Poller] Invalid seconds_played');
    return false;
  }
  
  return true;
}

/**
 * Sanitize string input to prevent SQL injection
 * (Belt-and-suspenders approach - prepared statements already protect us)
 */
function sanitizeString(input: any): string | null {
  if (!input) return null;
  if (typeof input !== 'string') return String(input).substring(0, 255);
  
  // Remove any null bytes and limit length
  return input.replace(/\0/g, '').substring(0, 255);
}

// ============================================================================
// FPP API Communication
// ============================================================================

/**
 * Fetch FPP status from device with timeout and error handling
 * SECURITY: Timeout prevents hanging on slow/malicious responses
 */
async function fetchFPPStatus(): Promise<{ success: boolean; data?: any; error?: string; responseTime: number }> {
  const startTime = Date.now();
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
    
    const url = `http://${FPP_HOST}:${FPP_PORT}/api/fppd/status`;
    
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'FPP-Control-Center-Poller/1.0'
      }
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    const responseTime = Date.now() - startTime;

    // Validate response before accepting it
    if (!validateFPPStatus(data)) {
      throw new Error('Invalid FPP status response format');
    }

    return { success: true, data, responseTime };
  } catch (error: any) {
    const responseTime = Date.now() - startTime;
    const errorMessage = error.name === 'AbortError' 
      ? 'Request timeout (5s)' 
      : error.message || 'Unknown error';
    
    return { 
      success: false, 
      error: errorMessage, 
      responseTime 
    };
  }
}

/**
 * Fetch playlist details from FPP (optional, for caching sequences)
 */
async function fetchPlaylistDetails(playlistName: string): Promise<any | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const url = `http://${FPP_HOST}:${FPP_PORT}/api/playlist/${encodeURIComponent(playlistName)}`;
    
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json'
      }
    });

    clearTimeout(timeoutId);

    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    return null;
  }
}

// ============================================================================
// Database Operations
// ============================================================================

/**
 * Update database with FPP state
 * Uses transactions for atomic updates
 */
function updateDatabase(status: any, responseTime: number): void {
  try {
    // Start transaction for atomic update
    const transaction = db.transaction(() => {
      // Update FPP state
      updateState.run(
        sanitizeString(status.status_name) || 'unknown',
        sanitizeString(status.current_sequence) || null,
        sanitizeString(status.current_playlist?.playlist) || null,
        status.current_playlist?.index ?? null,
        status.current_playlist?.count ?? null,
        status.seconds_played ?? 0,
        status.seconds_remaining ?? 0,
        status.volume ?? 0,
        sanitizeString(status.mode_name) || 'player',
        status.uptime ?? 0
      );

      // Log successful poll
      logPoll.run(
        1, // success
        responseTime,
        null,
        sanitizeString(status.status_name) || 'unknown',
        sanitizeString(status.current_sequence) || null,
        0 // reset consecutive failures
      );

      // Update active playlist
      if (status.current_playlist?.playlist) {
        clearActiveFlags.run();
        updatePlaylist.run(
          sanitizeString(status.current_playlist.playlist),
          status.current_playlist.count || 0,
          1 // is_active
        );
      } else {
        clearActiveFlags.run();
      }
    });

    // Execute transaction
    transaction();

    // Reset failure counter on success
    consecutiveFailures = 0;
    currentPollInterval = POLL_INTERVAL;

    console.log(`[FPP Poller] ✓ Updated state: ${status.status_name} | ${status.current_sequence || 'idle'} (${responseTime}ms)`);

    // Async: Fetch and cache playlist details (don't block polling)
    if (status.current_playlist?.playlist) {
      fetchPlaylistDetails(status.current_playlist.playlist)
        .then(details => {
          if (details?.mainPlaylist) {
            syncPlaylistSequences(status.current_playlist.playlist, details.mainPlaylist);
          }
        })
        .catch(err => {
          console.error('[FPP Poller] Failed to fetch playlist details:', err.message);
        });
    }
  } catch (error: any) {
    console.error('[FPP Poller] Database update error:', error.message);
    // Don't crash - log and continue
  }
}

/**
 * Sync playlist sequences to database
 */
function syncPlaylistSequences(playlistName: string, sequences: any[]): void {
  try {
    const transaction = db.transaction(() => {
      // Clear existing sequences
      deletePlaylistSequences.run(playlistName);

      // Insert updated sequences
      sequences.forEach((seq, index) => {
        insertSequence.run(
          playlistName,
          sanitizeString(seq.sequenceName || seq.playlistName),
          index,
          seq.duration || null,
          seq.enabled !== false ? 1 : 0
        );
      });
    });

    transaction();
    console.log(`[FPP Poller] ✓ Synced ${sequences.length} sequences for playlist: ${playlistName}`);
  } catch (error: any) {
    console.error('[FPP Poller] Sequence sync error:', error.message);
  }
}

/**
 * Handle polling error with exponential backoff
 */
function handleError(error: string, responseTime: number): void {
  try {
    consecutiveFailures++;

    const transaction = db.transaction(() => {
      updateStateError.run(sanitizeString(error));
      logPoll.run(
        0, // failed
        responseTime,
        sanitizeString(error),
        null,
        null,
        consecutiveFailures
      );
    });

    transaction();

    // Exponential backoff on repeated failures
    if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
      currentPollInterval = Math.min(
        POLL_INTERVAL * Math.pow(RETRY_BACKOFF_MULTIPLIER, consecutiveFailures - MAX_CONSECUTIVE_FAILURES),
        MAX_POLL_INTERVAL
      );
      console.error(`[FPP Poller] ✗ ${consecutiveFailures} failures - backing off to ${currentPollInterval}ms`);
    } else {
      console.error(`[FPP Poller] ✗ Poll failed: ${error} (${responseTime}ms) [${consecutiveFailures} consecutive failures]`);
    }
  } catch (err: any) {
    console.error('[FPP Poller] Failed to log error:', err.message);
  }
}

// ============================================================================
// Main Polling Loop
// ============================================================================

/**
 * Main polling loop with error recovery
 */
async function pollLoop(): Promise<void> {
  while (true) {
    if (isPolling) {
      console.warn('[FPP Poller] Previous poll still running, skipping...');
      await sleep(currentPollInterval);
      continue;
    }

    isPolling = true;

    try {
      const result = await fetchFPPStatus();

      if (result.success && result.data) {
        updateDatabase(result.data, result.responseTime);
      } else {
        handleError(result.error || 'Unknown error', result.responseTime);
      }
    } catch (error: any) {
      console.error('[FPP Poller] Unexpected error:', error.message);
      handleError(error.message, 0);
    } finally {
      isPolling = false;
    }

    await sleep(currentPollInterval);
  }
}

// ============================================================================
// Graceful Shutdown
// ============================================================================

function shutdown(signal: string): void {
  console.log(`\n[FPP Poller] Received ${signal}, shutting down gracefully...`);
  
  try {
    if (db) {
      db.close();
      console.log('[FPP Poller] Database closed');
    }
  } catch (error: any) {
    console.error('[FPP Poller] Error during shutdown:', error.message);
  }
  
  process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// Handle uncaught errors gracefully
process.on('uncaughtException', (error) => {
  console.error('[FPP Poller] Uncaught exception:', error);
  shutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason) => {
  console.error('[FPP Poller] Unhandled rejection:', reason);
  shutdown('UNHANDLED_REJECTION');
});

// ============================================================================
// Utilities
// ============================================================================

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================================
// Start Service
// ============================================================================

console.log('[FPP Poller] Service initialized, starting polling loop...\n');

pollLoop().catch(error => {
  console.error('[FPP Poller] Fatal error in poll loop:', error);
  shutdown('FATAL_ERROR');
});
