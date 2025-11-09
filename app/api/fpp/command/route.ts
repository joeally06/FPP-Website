import { NextRequest, NextResponse } from 'next/server';

const FPP_URL = process.env.FPP_URL || 'http://fpp.local';

/**
 * POST /api/fpp/command
 * Send commands to FPP
 * 
 * Security:
 * - Input validation on command and args
 * - Whitelist of allowed commands
 * - Request timeout (5s)
 */
export async function POST(request: NextRequest) {
  try {
    const { command, args = [] } = await request.json();

    // Validate command
    if (!command || typeof command !== 'string') {
      return NextResponse.json(
        { error: 'Invalid command' },
        { status: 400 }
      );
    }

    // Validate args
    if (!Array.isArray(args)) {
      return NextResponse.json(
        { error: 'Args must be an array' },
        { status: 400 }
      );
    }

    // Whitelist of allowed commands (security)
    const allowedCommands = [
      'Start Playlist',
      'Stop Gracefully',
      'Stop Now',
      'Next Playlist Item',
      'Prev Playlist Item',
      'Start Playlist At Random Item',
      'FSEQ Effect Start',
      'FSEQ Effect Stop',
      'Effects Stop',
      'Volume Set',
      'Volume Adjust',
      'Volume Increase',
      'Volume Decrease',
    ];

    if (!allowedCommands.includes(command)) {
      return NextResponse.json(
        { error: 'Command not allowed' },
        { status: 403 }
      );
    }

    console.log('[FPP Command]', command, args);

    // Send command to FPP
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(`${FPP_URL}/api/command`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        command,
        args,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[FPP Command] Error:', errorText);
      return NextResponse.json(
        { error: 'FPP command failed' },
        { status: response.status }
      );
    }

    // FPP API sometimes returns plain text instead of JSON
    const contentType = response.headers.get('content-type');
    let data;
    
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      // Plain text response (e.g., "Stopped")
      const text = await response.text();
      data = { result: text, status: 'success' };
    }

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error: any) {
    if (error.name === 'AbortError') {
      return NextResponse.json(
        { error: 'FPP request timeout' },
        { status: 504 }
      );
    }

    console.error('[FPP Command] Error:', error);
    return NextResponse.json(
      { error: 'Failed to send command to FPP' },
      { status: 500 }
    );
  }
}
