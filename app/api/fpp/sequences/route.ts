import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Get FPP URL from environment
    const fppUrl = process.env.FPP_URL || 'http://192.168.5.2:80';
    
    console.log('[FPP Sequences] Fetching from:', fppUrl);

    // Fetch sequences from FPP API
    const response = await fetch(`${fppUrl}/api/sequence`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(5000) // 5 second timeout
    });

    if (!response.ok) {
      console.error('[FPP Sequences] Error:', response.status, response.statusText);
      return NextResponse.json({
        error: 'Failed to fetch sequences from FPP',
        status: response.status
      }, { status: response.status });
    }

    const data = await response.json();
    console.log('[FPP Sequences] Found:', data?.length || 0, 'sequences');

    return NextResponse.json(data);

  } catch (error: any) {
    console.error('[FPP Sequences] Fatal error:', error);
    
    return NextResponse.json({
      error: 'Failed to connect to FPP device',
      details: error.message
    }, { status: 503 });
  }
}
