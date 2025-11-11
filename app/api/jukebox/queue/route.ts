import { NextRequest, NextResponse } from 'next/server';
import { addToQueue, getQueue, incrementSequenceRequests, getMediaNameForSequence } from '@/lib/database';
import { getClientIP, getSongRequestRateLimit } from '@/lib/rate-limit';
import db from '@/lib/database';

export async function GET() {
  try {
    const queue = getQueue.all();
    return NextResponse.json(queue);
  } catch (error) {
    console.error('Error fetching queue:', error);
    return NextResponse.json({ error: 'Failed to fetch queue' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { sequence_name, requester_name } = await request.json();
    const requester_ip = getClientIP(request);

    // Get current rate limit from settings
    const rateLimit = getSongRequestRateLimit();

    if (!sequence_name) {
      return NextResponse.json({ error: 'Sequence name is required' }, { status: 400 });
    }

    // Check rate limit BEFORE adding to queue (using database count)
    const rateLimitCheck = db.prepare(`
      SELECT COUNT(*) as count 
      FROM jukebox_queue 
      WHERE requester_ip = ? 
        AND created_at > datetime('now', '-1 hour')
    `).get(requester_ip) as { count: number };

    if (rateLimitCheck.count >= rateLimit) {
      console.warn(`[SECURITY] Rate limit exceeded for ${requester_ip} (${rateLimitCheck.count}/${rateLimit} used)`);
      
      return NextResponse.json({ 
        error: `Rate limit exceeded. You can request ${rateLimit} songs per hour.`,
        rateLimit,
        requestsUsed: rateLimitCheck.count,
        requestsRemaining: 0
      }, { status: 429 });
    }

    // Check for duplicate request within 5 minutes
    // SQLite datetime() function to get a datetime 5 minutes ago
    const duplicate = db.prepare(`
      SELECT id FROM jukebox_queue 
      WHERE requester_ip = ? 
        AND sequence_name = ? 
        AND created_at > datetime('now', '-5 minutes')
      LIMIT 1
    `).get(requester_ip, sequence_name);
    
    if (duplicate) {
      console.warn(`[SECURITY] Duplicate request detected from ${requester_ip} for ${sequence_name}`);
      return NextResponse.json({ 
        error: 'You already requested this song recently. Please wait a few minutes.' 
      }, { status: 429 });
    }

    // Add .fseq extension back to get the full sequence name
    const fullSequenceName = sequence_name + '.fseq';

    // Look up the media name from FPP playlists
    let media_name = null;
    try {
      // Get scheduled playlists
      const scheduleResponse = await fetch(`${process.env.FPP_URL || 'http://192.168.5.2:80'}/api/schedule`);
      if (scheduleResponse.ok) {
        const schedule = await scheduleResponse.json();
        const playlistNames = new Set<string>();
        schedule.forEach((entry: any) => {
          if (entry.playlist) {
            playlistNames.add(entry.playlist);
          }
        });

        // Check each playlist for the sequence
        for (const playlistName of playlistNames) {
          try {
            const playlistResponse = await fetch(`${process.env.FPP_URL || 'http://192.168.5.2:80'}/api/playlist/${encodeURIComponent(playlistName)}`);
            if (playlistResponse.ok) {
              const playlist = await playlistResponse.json();
              
              // Check leadIn
              if (playlist.leadIn) {
                const item = playlist.leadIn.find((item: any) => item.sequenceName === fullSequenceName);
                if (item && item.mediaName) {
                  media_name = item.mediaName;
                  break;
                }
              }
              
              // Check mainPlaylist
              if (playlist.mainPlaylist) {
                const item = playlist.mainPlaylist.find((item: any) => item.sequenceName === fullSequenceName);
                if (item && item.mediaName) {
                  media_name = item.mediaName;
                  break;
                }
              }
            }
          } catch (err) {
            // Continue checking other playlists
          }
        }
      }
    } catch (error) {
      console.warn('Could not lookup media name from FPP:', error);
    }

    // Add to jukebox queue
    const result = addToQueue.run(sequence_name, media_name, requester_name || 'Anonymous', requester_ip);
    
    // Track sequence requests
    incrementSequenceRequests.run(sequence_name);

    // Calculate how many requests the user has used in the last hour
    // Use SQLite's datetime functions to properly compare times
    const now = new Date().toISOString();
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    
    console.log(`[Queue DEBUG] Request just added - ID: ${result.lastInsertRowid}`);
    console.log(`[Queue DEBUG] Current time: ${now}`);
    console.log(`[Queue DEBUG] One hour ago: ${oneHourAgo}`);
    
    // Get all recent entries to see what's being counted
    const recentEntries = db.prepare(`
      SELECT id, sequence_name, created_at, status
      FROM jukebox_queue 
      WHERE requester_ip = ? 
        AND created_at > datetime('now', '-1 hour')
      ORDER BY created_at DESC
    `).all(requester_ip);
    
    console.log(`[Queue DEBUG] Entries in last hour for IP ${requester_ip}:`);
    recentEntries.forEach((entry: any) => {
      console.log(`  ID ${entry.id}: ${entry.sequence_name} | ${entry.created_at} | ${entry.status}`);
    });
    
    const usedRequests = db.prepare(`
      SELECT COUNT(*) as count 
      FROM jukebox_queue 
      WHERE requester_ip = ? 
        AND created_at > datetime('now', '-1 hour')
    `).get(requester_ip) as { count: number };

    const requestsUsed = usedRequests.count;
    const requestsRemaining = Math.max(0, rateLimit - requestsUsed);

    console.log(`[Jukebox] Request added by ${requester_ip}: ${requestsUsed}/${rateLimit} used, ${requestsRemaining} remaining`);

    return NextResponse.json({ 
      success: true, 
      id: result.lastInsertRowid,
      message: requestsRemaining > 0 
        ? `Song requested! You have ${requestsRemaining} request${requestsRemaining !== 1 ? 's' : ''} remaining this hour.`
        : `Song requested! You've used all ${rateLimit} requests this hour.`,
      rateLimit,
      requestsUsed,
      requestsRemaining
    });
  } catch (error: any) {
    console.error('Error adding to queue:', error);
    
    // Handle duplicate entries or other constraints
    if (error.code === 'SQLITE_CONSTRAINT') {
      return NextResponse.json({ error: 'Unable to add sequence to queue' }, { status: 400 });
    }
    
    return NextResponse.json({ error: 'Failed to add to queue' }, { status: 500 });
  }
}
