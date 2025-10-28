import { NextRequest, NextResponse } from 'next/server';
import { addToQueue, getQueue, incrementSequenceRequests } from '@/lib/database';

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
    const requester_ip = request.headers.get('x-forwarded-for') || 
                        request.headers.get('x-real-ip') || 
                        'unknown';

    if (!sequence_name) {
      return NextResponse.json({ error: 'Sequence name is required' }, { status: 400 });
    }

    // Add to jukebox queue
    const result = addToQueue.run(sequence_name, requester_name || 'Anonymous', requester_ip);
    
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
