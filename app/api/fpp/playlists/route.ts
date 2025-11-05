import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'votes.db');

/**
 * GET /api/fpp/playlists
 * Returns cached playlists from database
 * 🔒 AUTHENTICATED USERS ONLY
 */
export async function GET() {
  let db: Database.Database | null = null;
  
  try {
    // Check authentication (any logged-in user)
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized - login required to view playlists' },
        { status: 401 }
      );
    }

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

      console.log('[FPP Playlists] Sample parsed playlist:', parsedPlaylists[0]);
      return NextResponse.json(parsedPlaylists);
    }

    // If cache is empty, suggest syncing
    console.log('[FPP Playlists] Cache empty - suggesting sync');
    
    return NextResponse.json({
      error: 'No cached playlists available',
      hint: 'Click "Sync Now" to load playlists from FPP device',
      playlists: []
    }, { status: 404 });

  } catch (error: any) {
    console.error('[FPP Playlists] Error:', error);
    
    return NextResponse.json({
      error: 'Failed to load playlists',
      details: error.message,
      playlists: []
    }, { status: 500 });
  } finally {
    if (db) {
      db.close();
    }
  }
}
