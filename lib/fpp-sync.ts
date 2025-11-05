import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'votes.db');

interface SyncResult {
  success: boolean;
  playlistsCount: number;
  sequencesCount: number;
  error?: string;
  timestamp: string;
}

interface SyncStatus {
  lastSync: string | null;
  lastSuccess: string | null;
  lastError: string | null;
  playlistsCount: number;
  sequencesCount: number;
}

/**
 * Fetch data from FPP with multiple endpoint fallback
 */
async function fetchFromFPP(endpoints: string[]): Promise<any> {
  const fppIp = process.env.FPP_IP || 'localhost';
  const timeout = 5000;

  for (const endpoint of endpoints) {
    try {
      const url = `http://${fppIp}${endpoint}`;
      console.log(`[FPP Sync] Trying ${url}...`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        signal: controller.signal,
        headers: { 'Accept': 'application/json' }
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        console.log(`[FPP Sync] Success from ${endpoint}`);
        return data;
      }
    } catch (error) {
      console.log(`[FPP Sync] Failed ${endpoint}:`, error);
      continue;
    }
  }

  throw new Error('All FPP endpoints failed');
}

/**
 * Fetch playlists from FPP
 */
async function fetchPlaylists(): Promise<any[]> {
  const endpoints = [
    '/api/playlists',
    '/api/playlist',
    '/playlists.php'
  ];

  const data = await fetchFromFPP(endpoints);
  
  // Handle different response formats
  if (Array.isArray(data)) {
    return data;
  } else if (data.playlists && Array.isArray(data.playlists)) {
    return data.playlists;
  } else {
    return [];
  }
}

/**
 * Fetch sequences from FPP
 */
async function fetchSequences(): Promise<any[]> {
  const endpoints = [
    '/api/sequences',
    '/api/sequence',
    '/sequences.php'
  ];

  const data = await fetchFromFPP(endpoints);
  
  // Handle different response formats
  if (Array.isArray(data)) {
    return data;
  } else if (data.sequences && Array.isArray(data.sequences)) {
    return data.sequences;
  } else {
    return [];
  }
}

/**
 * Main sync function - fetches from FPP and updates database
 */
export async function syncFppData(): Promise<SyncResult> {
  const timestamp = new Date().toISOString();
  let db: Database.Database | null = null;

  try {
    console.log('[FPP Sync] Starting sync...');
    
    // Fetch data from FPP
    const [playlists, sequences] = await Promise.all([
      fetchPlaylists(),
      fetchSequences()
    ]);

    console.log(`[FPP Sync] Fetched ${playlists.length} playlists, ${sequences.length} sequences`);

    // Open database
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
        const name = playlist.name || playlist.playlistName || 'Unknown';
        const description = playlist.description || '';
        const itemCount = playlist.playlistInfo?.total_items || 
                         playlist.item_count || 
                         (Array.isArray(playlist.items) ? playlist.items.length : 0);
        const duration = playlist.playlistInfo?.total_duration || 
                        playlist.duration || 0;
        const rawData = JSON.stringify(playlist);

        insertPlaylist.run(name, description, itemCount, duration, rawData, timestamp);
      }

      // Insert sequences
      const insertSequence = db!.prepare(`
        INSERT INTO fpp_sequences (name, filename, length_ms, channel_count, raw_data, synced_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      for (const sequence of sequences) {
        const name = sequence.name || sequence.sequenceName || 'Unknown';
        const filename = sequence.filename || sequence.file || '';
        const lengthMs = sequence.length || sequence.lengthMS || 0;
        const channelCount = sequence.channelCount || sequence.channels || 0;
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

    console.log('[FPP Sync] Sync completed successfully');

    return {
      success: true,
      playlistsCount: playlists.length,
      sequencesCount: sequences.length,
      timestamp
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[FPP Sync] Sync failed:', errorMessage);

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
