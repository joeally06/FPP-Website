import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'votes.db');

export interface SyncResult {
  success: boolean;
  playlistsCount: number;
  sequencesCount: number;
  error?: string;
  timestamp: string;
}

export interface SyncStatus {
  lastSync: string | null;
  lastSuccess: string | null;
  lastError: string | null;
  playlistsCount: number;
  sequencesCount: number;
}

/**
 * Main sync function - fetches from FPP using existing working API routes (same as Jukebox)
 * and updates database cache
 */
export async function syncFppData(): Promise<SyncResult> {
  const timestamp = new Date().toISOString();
  let db: Database.Database | null = null;

  try {
    console.log('[FPP Sync] Starting sync from FPP device...');
    
    // Connect directly to FPP device (public API endpoints don't require auth)
    const fppUrl = process.env.FPP_URL || 'http://192.168.5.2';
    console.log('[FPP Sync] FPP URL:', fppUrl);
    
    // Fetch playlists from FPP
    console.log('[FPP Sync] Fetching playlists from', `${fppUrl}/api/playlists`);
    const playlistsRes = await fetch(`${fppUrl}/api/playlists`, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(5000)
    });

    if (!playlistsRes.ok) {
      throw new Error(`Playlists API returned ${playlistsRes.status}`);
    }

    const playlistsData = await playlistsRes.json();
    const playlists = Array.isArray(playlistsData) ? playlistsData : [];
    console.log('[FPP Sync] Found', playlists.length, 'playlists');
    console.log('[FPP Sync] Sample playlist:', playlists[0]);

    // Fetch sequences from FPP
    console.log('[FPP Sync] Fetching sequences from', `${fppUrl}/api/sequence`);
    const sequencesRes = await fetch(`${fppUrl}/api/sequence`, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(5000)
    });

    if (!sequencesRes.ok) {
      throw new Error(`Sequences API returned ${sequencesRes.status}`);
    }

    const sequencesData = await sequencesRes.json();
    const sequences = Array.isArray(sequencesData) ? sequencesData : [];
    console.log('[FPP Sync] Found', sequences.length, 'sequences');
    console.log('[FPP Sync] Sample sequence:', sequences[0]);

    // Open database
    console.log('[FPP Sync] Opening database:', dbPath);
    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');

    // Open database
    console.log('[FPP Sync] Opening database:', dbPath);
    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');

    // Start transaction
    const transaction = db.transaction(() => {
      // Clear old data
      db!.prepare('DELETE FROM fpp_playlists').run();
      db!.prepare('DELETE FROM fpp_sequences').run();

      // Insert playlists
      const insertPlaylist = db!.prepare(`
        INSERT INTO fpp_playlists (name, description, item_count, duration, raw_data, synced_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      for (const playlist of playlists) {
        const name = typeof playlist === 'string' 
          ? playlist 
          : (playlist.name || playlist.playlistName || 'Unknown');
        const description = typeof playlist === 'object' 
          ? (playlist.description || playlist.desc || '') 
          : '';
        const itemCount = typeof playlist === 'object'
          ? (playlist.count || playlist.total_items || playlist.item_count || (Array.isArray(playlist.items) ? playlist.items.length : 0))
          : 0;
        const duration = typeof playlist === 'object'
          ? (playlist.duration || playlist.total_duration || 0)
          : 0;
        const rawData = JSON.stringify(playlist);

        insertPlaylist.run(name, description, itemCount, duration, rawData, timestamp);
      }

      // Insert sequences
      const insertSequence = db!.prepare(`
        INSERT INTO fpp_sequences (name, filename, length_ms, channel_count, raw_data, synced_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      for (const sequence of sequences) {
        const name = typeof sequence === 'string' 
          ? sequence.replace('.fseq', '') 
          : (sequence.name || sequence.sequenceName || sequence.fileName || 'Unknown');
        const filename = typeof sequence === 'string' 
          ? sequence 
          : (sequence.fileName || sequence.filename || sequence.name || '');
        const lengthMs = typeof sequence === 'object'
          ? (sequence.length || sequence.lengthMS || sequence.duration || 0)
          : 0;
        const channelCount = typeof sequence === 'object'
          ? (sequence.channelCount || sequence.channels || 0)
          : 0;
        const rawData = JSON.stringify(sequence);

        insertSequence.run(name, filename, lengthMs, channelCount, rawData, timestamp);
      }

      // Update sync status
      db!.prepare(`
        UPDATE fpp_sync_status 
        SET last_sync = ?,
            last_success = ?,
            last_error = NULL,
            playlists_count = ?,
            sequences_count = ?
        WHERE id = 1
      `).run(timestamp, timestamp, playlists.length, sequences.length);
    });

    transaction();

    console.log('[FPP Sync] ✅ Sync completed successfully');
    console.log('[FPP Sync] Cached', playlists.length, 'playlists and', sequences.length, 'sequences');

    return {
      success: true,
      playlistsCount: playlists.length,
      sequencesCount: sequences.length,
      timestamp
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : '';
    console.error('[FPP Sync] ❌ Sync failed:', errorMessage);
    console.error('[FPP Sync] Stack trace:', errorStack);

    // Update sync status with error
    if (db) {
      try {
        db.prepare(`
          UPDATE fpp_sync_status 
          SET last_sync = ?,
              last_error = ?
          WHERE id = 1
        `).run(timestamp, errorMessage);
      } catch (dbError) {
        console.error('[FPP Sync] Failed to update error status:', dbError);
      }
    } else {
      // Try to open DB to record error
      try {
        const dbPath = path.join(process.cwd(), 'votes.db');
        const errorDb = new Database(dbPath);
        errorDb.prepare(`
          UPDATE fpp_sync_status 
          SET last_sync = ?,
              last_error = ?
          WHERE id = 1
        `).run(timestamp, errorMessage);
        errorDb.close();
      } catch (dbError) {
        console.error('[FPP Sync] Failed to open DB for error logging:', dbError);
      }
    }

    return {
      success: false,
      playlistsCount: 0,
      sequencesCount: 0,
      error: errorMessage,
      timestamp
    };

  } finally {
    if (db) {
      db.close();
    }
  }
}

/**
 * Get current sync status from database
 */
export function getSyncStatus(): SyncStatus {
  let db: Database.Database | null = null;
  
  try {
    db = new Database(dbPath);
    
    const status = db.prepare(`
      SELECT last_sync, last_success, last_error, playlists_count, sequences_count
      FROM fpp_sync_status
      WHERE id = 1
    `).get() as any;

    if (!status) {
      return {
        lastSync: null,
        lastSuccess: null,
        lastError: null,
        playlistsCount: 0,
        sequencesCount: 0
      };
    }

    return {
      lastSync: status.last_sync,
      lastSuccess: status.last_success,
      lastError: status.last_error,
      playlistsCount: status.playlists_count || 0,
      sequencesCount: status.sequences_count || 0
    };

  } catch (error) {
    console.error('[FPP Sync] Failed to get sync status:', error);
    return {
      lastSync: null,
      lastSuccess: null,
      lastError: 'Failed to read sync status',
      playlistsCount: 0,
      sequencesCount: 0
    };
  } finally {
    if (db) {
      db.close();
    }
  }
}
