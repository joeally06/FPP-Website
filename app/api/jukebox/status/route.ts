import { NextRequest, NextResponse } from 'next/server';
import { getCurrentlyPlaying, updateQueueStatus, getFPPState } from '@/lib/database';

export async function GET() {
  try {
    // First check if there's a song marked as playing in our database
    const currentlyPlaying = getCurrentlyPlaying.get();

    if (currentlyPlaying) {
      return NextResponse.json(currentlyPlaying);
    }

    // NEW: Use cached FPP state instead of direct polling
    // This eliminates redundant FPP API calls and improves performance
    try {
      const fppState = getFPPState.get() as any;

      if (fppState && fppState.status === 'playing' && fppState.current_sequence) {
        // Return cached FPP status
        return NextResponse.json({
          id: null, // No database ID since it's not from queue
          sequence_name: fppState.current_sequence,
          media_name: fppState.current_sequence.replace('.fseq', '.mp3'),
          requester_name: 'FPP Schedule',
          played_at: fppState.last_updated,
          status: 'playing',
          // Include cache metadata for debugging
          cached: true,
          cache_age_seconds: Math.floor(
            (Date.now() - new Date(fppState.last_updated).getTime()) / 1000
          )
        });
      }

      // If FPP is not playing (idle/stopped), check if state is stale
      if (fppState) {
        const cacheAge = Math.floor(
          (Date.now() - new Date(fppState.last_updated).getTime()) / 1000
        );

        // If cache is very stale (> 60 seconds), indicate poller may be down
        if (cacheAge > 60 && !fppState.last_poll_success) {
          console.warn('FPP cache is stale (>60s) and last poll failed');
        }
      }
    } catch (cacheError) {
      console.warn('Could not fetch cached FPP status:', cacheError);
      
      // FALLBACK: Only poll FPP directly if cache is unavailable
      // This maintains backward compatibility but shouldn't normally be hit
      try {
        const fppResponse = await fetch(`${process.env.FPP_URL || 'http://192.168.5.2:80'}/api/fppd/status`);
        if (fppResponse.ok) {
          const fppStatus = await fppResponse.json();

          if (fppStatus.status_name === 'playing' && fppStatus.current_song) {
            return NextResponse.json({
              id: null,
              sequence_name: fppStatus.current_sequence || fppStatus.current_song.replace('.mp3', '.fseq'),
              media_name: fppStatus.current_song,
              requester_name: 'FPP Schedule',
              played_at: new Date().toISOString(),
              status: 'playing',
              cached: false // Direct FPP query (fallback)
            });
          }
        }
      } catch (fppError) {
        console.warn('Could not fetch FPP status (fallback):', fppError);
      }
    }

    // If neither database nor FPP has something playing, return null
    return NextResponse.json(null);
  } catch (error) {
    console.error('Error fetching currently playing:', error);
    return NextResponse.json({ error: 'Failed to fetch currently playing' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { id, status } = await request.json();

    if (!id || !status) {
      return NextResponse.json({ error: 'ID and status are required' }, { status: 400 });
    }

    const validStatuses = ['pending', 'playing', 'completed', 'skipped'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    updateQueueStatus.run(status, id);

    return NextResponse.json({ success: true, message: 'Status updated' });
  } catch (error) {
    console.error('Error updating status:', error);
    return NextResponse.json({ error: 'Failed to update status' }, { status: 500 });
  }
}
