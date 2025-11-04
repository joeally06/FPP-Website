import { NextRequest, NextResponse } from 'next/server';
import { checkSantaRateLimit, getClientIP } from '@/lib/santa-rate-limit';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 });
    }

    // Get client IP address
    const clientIP = getClientIP(request);
    
    // Check both email and IP rate limits
    const result = checkSantaRateLimit(email, clientIP);

    return NextResponse.json({
      emailCount: result.emailCount,
      ipCount: result.ipCount,
      count: Math.max(result.emailCount, result.ipCount), // Show the higher count
      limit: result.limit,
      allowed: result.allowed,
      reason: result.reason
    });
  } catch (error) {
    console.error('Failed to check letter count:', error);
    return NextResponse.json({ error: 'Failed to check limit' }, { status: 500 });
  }
}
