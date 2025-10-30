// API Route to manually trigger queue processing
// Also serves as health check for the queue processor

import { NextResponse } from 'next/server';

// Import the queue processor to ensure it's loaded
import '@/lib/santa-queue-processor';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Forward to the actual processing endpoint
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/santa/process-queue`, {
      method: 'GET',
    });

    const result = await response.json();

    return NextResponse.json({
      success: true,
      message: 'Manual queue processing triggered',
      result,
    });
  } catch (error) {
    console.error('[Manual Queue Trigger] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function POST() {
  // Support both GET and POST for flexibility
  return GET();
}
