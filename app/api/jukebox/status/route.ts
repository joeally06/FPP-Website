import { NextRequest, NextResponse } from 'next/server';
import { getCurrentlyPlaying, updateQueueStatus } from '@/lib/database';

export async function GET() {
  try {
    const currentlyPlaying = getCurrentlyPlaying.get();
    return NextResponse.json(currentlyPlaying || null);
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
