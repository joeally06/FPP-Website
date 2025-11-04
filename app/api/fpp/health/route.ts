import { NextResponse } from 'next/server';

const FPP_URL = process.env.FPP_URL || 'http://fpp.local';
const HEALTH_CHECK_TIMEOUT = 5000; // 5 seconds

export async function GET() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), HEALTH_CHECK_TIMEOUT);

    const response = await fetch(`${FPP_URL}/api/system/status`, {
      signal: controller.signal,
      headers: { 'Accept': 'application/json' }
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      return NextResponse.json({
        online: true,
        status: data.status || 'unknown',
        mode: data.mode_name || 'unknown',
        timestamp: Date.now()
      });
    }

    return NextResponse.json({
      online: false,
      error: `HTTP ${response.status}`,
      timestamp: Date.now()
    }, { status: 503 });

  } catch (error: any) {
    console.error('[FPP Health Check] Error:', error.message);
    
    return NextResponse.json({
      online: false,
      error: error.name === 'AbortError' ? 'Timeout' : error.message,
      timestamp: Date.now()
    }, { status: 503 });
  }
}
