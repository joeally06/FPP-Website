import { NextRequest, NextResponse } from 'next/server';
import { addToQueue, getQueue, incrementSequenceRequests, getMediaNameForSequence } from '@/lib/database';
import { songRequestLimiter, getClientIP, getSongRequestRateLimit } from '@/lib/rate-limit';
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

    // Rate limiting check with dynamic limit
    const rateLimitResult = songRequestLimiter.check(requester_ip, rateLimit);
    if (!rateLimitResult.success) {
      const errorMessage = rateLimitResult.blocked 
        ? `Too many requests. You are blocked until ${rateLimitResult.blockedUntil?.toLocaleString()}`
        : `Rate limit exceeded. You can request ${rateLimit} songs per hour. Try again after ${rateLimitResult.resetAt.toLocaleString()}`;
      
      console.warn(`[SECURITY] Rate limit exceeded for ${requester_ip} (song request, limit: ${rateLimit})`);
      
      return NextResponse.json({ 
        error: errorMessage,
        resetAt: rateLimitResult.resetAt.toISOString()
      }, { status: 429 });
    }

    if (!sequence_name) {
      return NextResponse.json({ error: 'Sequence name is required' }, { status: 400 });
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

    return NextResponse.json({ 
      success: true, 
      id: result.lastInsertRowid,
      message: 'Sequence added to queue' 
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
