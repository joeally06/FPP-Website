import { NextRequest, NextResponse } from 'next/server';
import { getClientIP, getSongRequestRateLimit } from '@/lib/rate-limit';
import db from '@/lib/database';

/**
 * GET /api/jukebox/request-status
 * Get the current user's request status (how many used this hour)
 * Public endpoint - no authentication required
 */
export async function GET(request: NextRequest) {
  try {
    const requester_ip = getClientIP(request);
    const rateLimit = getSongRequestRateLimit();

    // Calculate how many requests the user has made in the last hour
    // Database stores in UTC, so use plain datetime('now') without localtime
    const now = new Date().toISOString();
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    
    console.log(`[Request Status DEBUG] Current time: ${now}`);
    console.log(`[Request Status DEBUG] One hour ago: ${oneHourAgo}`);
    
    // Get detailed entries for debugging
    const allEntries = db.prepare(`
      SELECT id, sequence_name, created_at, status
      FROM jukebox_queue 
      WHERE requester_ip = ? 
      ORDER BY created_at DESC
      LIMIT 10
    `).all(requester_ip);
    
    console.log(`[Request Status DEBUG] Last 10 entries for IP ${requester_ip}:`);
    allEntries.forEach((entry: any) => {
      console.log(`  ID ${entry.id}: ${entry.sequence_name} | ${entry.created_at} | ${entry.status}`);
    });
    
    const usedRequests = db.prepare(`
      SELECT COUNT(*) as count 
      FROM jukebox_queue 
      WHERE requester_ip = ? 
        AND created_at >= datetime('now', '-1 hour')
    `).get(requester_ip) as { count: number };

    const requestsUsed = usedRequests.count;
    const requestsRemaining = Math.max(0, rateLimit - requestsUsed);

    console.log(`[Request Status] IP: ${requester_ip} | Rate Limit: ${rateLimit} | Used: ${requestsUsed} | Remaining: ${requestsRemaining}`);

    return NextResponse.json({
      success: true,
      rateLimit,
      requestsUsed,
      requestsRemaining
    });
  } catch (error) {
    console.error('Error fetching request status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch request status' },
      { status: 500 }
    );
  }
}
