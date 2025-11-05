import { NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'votes.db');

export async function GET() {
  let db: Database.Database | null = null;
  
  try {
    // Read playlists from database cache
    db = new Database(dbPath);
    
    const playlists = db.prepare(`
      SELECT name, description, item_count, duration, raw_data, synced_at
      FROM fpp_playlists
      ORDER BY name ASC
    `).all();

    console.log(`[FPP Playlists] Returning ${playlists.length} cached playlists`);

    // Parse raw_data JSON for each playlist
    const parsedPlaylists = playlists.map((playlist: any) => {
      try {
        return JSON.parse(playlist.raw_data);
      } catch {
        // Fallback to basic structure if JSON parse fails
        return {
          name: playlist.name,
          description: playlist.description,
          playlistInfo: {
            total_items: playlist.item_count,
            total_duration: playlist.duration
          }
        };
      }
    });

    return NextResponse.json(parsedPlaylists);

  } catch (error: any) {
    console.error('[FPP Playlists] Database error:', error);
    
    return NextResponse.json({
      error: 'Failed to load playlists from cache',
      details: error.message
    }, { status: 500 });
  } finally {
    if (db) {
      db.close();
    }
  }
}
