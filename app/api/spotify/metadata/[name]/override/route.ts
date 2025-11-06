import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'votes.db');

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  let db: Database.Database | null = null;
  
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name } = await params;
    const sequenceName = decodeURIComponent(name);
    const { albumArt, artist, album, trackName, spotifyTrackId, spotifyUri, previewUrl } = await request.json();

    console.log('[Spotify Override] Saving metadata for:', sequenceName);

    db = new Database(dbPath);

    // Store manual override in database
    // Use 'none' for match_confidence since manual entries don't have a confidence score
    // We store the original search query to track that it was manually selected
    db.prepare(`
      INSERT INTO spotify_metadata 
      (sequence_name, album_art_url, artist_name, album_name, track_name, spotify_track_id, spotify_uri, preview_url, match_confidence, last_updated, search_query) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'none', CURRENT_TIMESTAMP, ?)
      ON CONFLICT(sequence_name) DO UPDATE SET
        album_art_url = excluded.album_art_url,
        artist_name = excluded.artist_name,
        album_name = excluded.album_name,
        track_name = excluded.track_name,
        spotify_track_id = excluded.spotify_track_id,
        spotify_uri = excluded.spotify_uri,
        preview_url = excluded.preview_url,
        match_confidence = 'none',
        last_updated = CURRENT_TIMESTAMP,
        search_query = excluded.search_query
    `).run(
      sequenceName,
      albumArt || null,
      artist || null,
      album || null,
      trackName || null,
      spotifyTrackId || null,
      spotifyUri || null,
      previewUrl || null,
      'MANUAL_OVERRIDE'
    );

    db.close();
    db = null;

    console.log('[Spotify Override] ✅ Metadata saved successfully');

    return NextResponse.json({
      success: true,
      message: 'Metadata updated successfully'
    });
  } catch (error: any) {
    console.error('[Spotify Override Error]:', error);
    return NextResponse.json(
      { error: 'Failed to update metadata', details: error.message },
      { status: 500 }
    );
  } finally {
    if (db) {
      try {
        db.close();
      } catch (e) {
        console.error('[Spotify Override] Error closing database:', e);
      }
    }
  }
}
