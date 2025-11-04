import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Get FPP URL from environment
    const fppUrl = process.env.FPP_URL || 'http://192.168.5.2:80';
    
    console.log('[FPP Playlists] Fetching from:', fppUrl);

    // Fetch playlists from FPP API
    const response = await fetch(`${fppUrl}/api/playlists`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(5000) // 5 second timeout
    });

    if (!response.ok) {
      console.error('[FPP Playlists] Error:', response.status, response.statusText);
      return NextResponse.json({
        error: 'Failed to fetch playlists from FPP',
        status: response.status
      }, { status: response.status });
    }

    const data = await response.json();
    console.log('[FPP Playlists] Found:', data?.length || 0, 'playlists');

    return NextResponse.json(data);

  } catch (error: any) {
    console.error('[FPP Playlists] Fatal error:', error);
    
    return NextResponse.json({
      error: 'Failed to connect to FPP device',
      details: error.message
    }, { status: 503 });
  }
}
