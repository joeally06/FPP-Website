import { NextResponse } from 'next/server';
import { getSetting } from '@/lib/settings';

/**
 * GET /api/jukebox/settings
 * Public endpoint for jukebox configuration (no authentication required)
 * Returns only jukebox-related settings that visitors need to see
 */
export async function GET() {
  try {
    const rateLimit = getSetting('jukebox_rate_limit') || '3';
    const insertMode = getSetting('jukebox_insert_mode') || 'after_current';

    return NextResponse.json({
      rateLimit: parseInt(rateLimit, 10),
      insertMode: insertMode
    });
  } catch (error) {
    console.error('Error fetching jukebox settings:', error);
    
    // Return defaults on error
    return NextResponse.json({
      rateLimit: 3,
      insertMode: 'after_current'
    });
  }
}
