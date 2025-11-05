import { NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'votes.db');

export async function GET() {
  let db: Database.Database | null = null;
  
  try {
    // Try to read playlists from database cache first
    db = new Database(dbPath);
    
    const cachedPlaylists = db.prepare(`
      SELECT name, description, item_count, duration, raw_data, synced_at
      FROM fpp_playlists
      ORDER BY name ASC
    `).all();

    db.close();
    db = null;

    if (cachedPlaylists.length > 0) {
      console.log(`[FPP Playlists] Returning ${cachedPlaylists.length} playlists from cache`);
      
      // Parse raw_data JSON for each playlist
      const parsedPlaylists = cachedPlaylists.map((playlist: any) => {
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
    }

    // If cache is empty, fetch live from FPP (using same route as Jukebox)
    console.log('[FPP Playlists] Cache empty, fetching live from FPP...');
    
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/fppd/playlists`, {
      headers: { 'Accept': 'application/json' }
    });
    
    if (!response.ok) {
      throw new Error(`FPP API returned ${response.status}`);
    }

    const liveData = await response.json();
    console.log('[FPP Playlists] Returning', liveData.length, 'playlists live from FPP');
    
    return NextResponse.json(liveData);

  } catch (error: any) {
    console.error('[FPP Playlists] Error:', error);
    
    return NextResponse.json({
      error: 'Failed to load playlists',
      details: error.message,
      hint: 'Try clicking "Sync Now" to cache data from FPP'
    }, { status: 500 });
  } finally {
    if (db) {
      db.close();
    }
  }
}
