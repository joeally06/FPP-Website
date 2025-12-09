import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-helpers';
import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'votes.db');

/**
 * POST /api/admin/media-library/refresh-urls
 * Bulk refresh Spotify URLs for all Media Library entries missing URLs
 * ADMIN ONLY
 */
export async function POST() {
  let db: Database.Database | null = null;

  try {
    // Require admin authentication
    await requireAdmin();

    // Check if Spotify credentials exist
    if (!process.env.SPOTIFY_CLIENT_ID || !process.env.SPOTIFY_CLIENT_SECRET) {
      return NextResponse.json(
        { error: 'Spotify credentials not configured' },
        { status: 400 }
      );
    }

    db = new Database(dbPath);

    // Get all entries missing Spotify URLs
    const entries = db.prepare(`
      SELECT sequence_name, track_name, artist_name, spotify_track_id
      FROM spotify_metadata
      WHERE (spotify_url IS NULL OR spotify_url = '')
      AND track_name IS NOT NULL
      AND artist_name IS NOT NULL
    `).all() as Array<{
      sequence_name: string;
      track_name: string;
      artist_name: string;
      spotify_track_id: string | null;
    }>;

    if (entries.length === 0) {
      db.close();
      return NextResponse.json({
        success: true,
        message: 'All entries already have Spotify URLs',
        updated: 0,
        total: 0,
      });
    }

    console.log(`[Media Library Refresh] Processing ${entries.length} entries...`);

    // Get Spotify access token
    const authResponse = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(
          `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
        ).toString('base64')}`,
      },
      body: 'grant_type=client_credentials',
      signal: AbortSignal.timeout(10000) // 10 second timeout
    });

    if (!authResponse.ok) {
      db.close();
      throw new Error('Failed to authenticate with Spotify');
    }

    const authData = await authResponse.json();
    const accessToken = authData.access_token;

    let updated = 0;
    const updateStmt = db.prepare(`
      UPDATE spotify_metadata
      SET spotify_url = ?, last_updated = CURRENT_TIMESTAMP
      WHERE sequence_name = ?
    `);

    // Process each entry
    for (const entry of entries) {
      try {
        let spotifyUrl: string | null = null;

        // If we have a track ID, construct URL directly
        if (entry.spotify_track_id) {
          spotifyUrl = `https://open.spotify.com/track/${entry.spotify_track_id}`;
          console.log(`[Refresh] ✓ Constructed URL for ${entry.track_name}`);
        } else {
          // Search Spotify for the track
          const searchQuery = `track:${entry.track_name} artist:${entry.artist_name}`;
          const searchResponse = await fetch(
            `https://api.spotify.com/v1/search?q=${encodeURIComponent(searchQuery)}&type=track&limit=1`,
            {
              headers: {
                Authorization: `Bearer ${accessToken}`,
              },
              signal: AbortSignal.timeout(10000) // 10 second timeout
            }
          );

          if (searchResponse.ok) {
            const searchData = await searchResponse.json();

            if (searchData.tracks.items.length > 0) {
              spotifyUrl = searchData.tracks.items[0].external_urls?.spotify || null;
              if (spotifyUrl) {
                console.log(`[Refresh] ✓ Found URL for ${entry.track_name} - ${entry.artist_name}`);
              }
            }
          }

          // Rate limit: Wait 100ms between API requests
          await new Promise((resolve) => setTimeout(resolve, 100));
        }

        // Update database if we found a URL
        if (spotifyUrl) {
          updateStmt.run(spotifyUrl, entry.sequence_name);
          updated++;
        }
      } catch (error) {
        console.error(`[Refresh] ✗ Failed to update ${entry.sequence_name}:`, error);
      }
    }

    db.close();
    db = null;

    console.log(`[Media Library Refresh] Complete: ${updated}/${entries.length} updated`);

    return NextResponse.json({
      success: true,
      message: `Updated ${updated} of ${entries.length} entries`,
      updated,
      total: entries.length,
    });
  } catch (error: any) {
    if (error.message?.includes('Authentication required')) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (error.message?.includes('Admin access required')) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    console.error('[Media Library Refresh Error]:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to refresh URLs',
      },
      { status: 500 }
    );
  } finally {
    if (db) {
      try {
        db.close();
      } catch (e) {
        console.error('[Media Library Refresh] Error closing database:', e);
      }
    }
  }
}
