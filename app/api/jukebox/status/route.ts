import { NextRequest, NextResponse } from 'next/server';
import { getCurrentlyPlaying, updateQueueStatus } from '@/lib/database';

export async function GET() {
  try {
    // First check if there's a song marked as playing in our database
    const currentlyPlaying = getCurrentlyPlaying.get();

    if (currentlyPlaying) {
      return NextResponse.json(currentlyPlaying);
    }

    // If nothing in database, check FPP's current status
    try {
      const fppResponse = await fetch(`${process.env.FPP_URL || 'http://192.168.5.2:80'}/api/fppd/status`);
      if (fppResponse.ok) {
        const fppStatus = await fppResponse.json();

        if (fppStatus.status_name === 'playing' && fppStatus.current_song) {
          // Return FPP's current playing info
          return NextResponse.json({
            id: null, // No database ID since it's not from queue
            sequence_name: fppStatus.current_sequence || fppStatus.current_song.replace('.mp3', '.fseq'),
            media_name: fppStatus.current_song,
            requester_name: 'FPP Schedule',
            played_at: new Date().toISOString(),
            status: 'playing'
          });
        }
      }
    } catch (fppError) {
      console.warn('Could not fetch FPP status:', fppError);
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
