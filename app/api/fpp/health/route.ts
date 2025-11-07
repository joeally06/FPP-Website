import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-helpers';

const FPP_URL = process.env.FPP_URL || 'http://fpp.local';
const HEALTH_CHECK_TIMEOUT = 5000; // 5 seconds

/**
 * GET /api/fpp/health
 * Check FPP device health
 * ADMIN ONLY - Device monitoring
 */
export async function GET() {
  try {
    await requireAdmin();
    
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
    if (error.message?.includes('Authentication required')) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (error.message?.includes('Admin access required')) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }
    console.error('[FPP Health Check] Error:', error.message);
    
    return NextResponse.json({
      online: false,
      error: error.name === 'AbortError' ? 'Timeout' : error.message,
      timestamp: Date.now()
    }, { status: 503 });
  }
}
