// API Route: Send Letter to Santa

import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import {
  insertSantaLetter,
} from '@/lib/database';
import { validateAndSanitizeSantaLetter } from '@/lib/input-sanitization';
import db from '@/lib/database';

interface SendLetterRequest {
  childName: string;
  childAge?: number;
  parentEmail: string;
  letterContent: string;
}

// Rate limiting: Track IPs and timestamps
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_WINDOW = 24 * 60 * 60 * 1000; // 24 hours
const MAX_LETTERS_PER_DAY = 100; // TEMPORARILY INCREASED FOR TESTING
const MAX_LETTERS_PER_HOUR = 3; // Hourly limit to prevent rapid spam

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const timestamps = rateLimitMap.get(ip) || [];
  
  // Remove old timestamps
  const recentTimestamps = timestamps.filter(
    (ts) => now - ts < RATE_LIMIT_WINDOW
  );
  
  if (recentTimestamps.length >= MAX_LETTERS_PER_DAY) {
    return false;
  }
  
  recentTimestamps.push(now);
  rateLimitMap.set(ip, recentTimestamps);
  return true;
}

function getClientIP(request: NextRequest): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  return request.headers.get('x-real-ip') || 'unknown';
}

export async function POST(request: NextRequest) {
  try {
    const body: SendLetterRequest = await request.json();
    
    console.log('📬 Received letter from:', body.childName);

    // Get client IP for rate limiting
    const clientIP = getClientIP(request);
    
    // ✅ SECURITY: Validate and sanitize ALL inputs
    const validation = validateAndSanitizeSantaLetter(
      body.childName || '',
      body.childAge || null,
      body.parentEmail || '',
      body.letterContent || ''
    );

    if (!validation.isValid) {
      console.log('❌ Validation failed:', validation.errors);
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid input. Please check your letter and try again.',
          details: validation.errors,
        },
        { status: 400 }
      );
    }

    // Use sanitized values from this point forward
    const sanitized = validation.sanitized!;
    
    // ✅ SECURITY: Daily rate limiting
    if (!checkRateLimit(clientIP)) {
      return NextResponse.json(
        { error: 'You can only send one letter per day. Please try again tomorrow!' },
        { status: 429 }
      );
    }

    // ✅ SECURITY: Hourly rate limiting (protect against rapid spam)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const hourlyCount = db.prepare(`
      SELECT COUNT(*) as count 
      FROM santa_letters 
      WHERE ip_address = ? 
      AND created_at > ?
    `).get(clientIP, oneHourAgo) as { count: number };

    if (hourlyCount && hourlyCount.count >= MAX_LETTERS_PER_HOUR) {
      console.log(`⚠️ Rate limit exceeded for IP ${clientIP}: ${hourlyCount.count} letters in last hour`);
      return NextResponse.json(
        { error: 'Too many requests. Please try again in a few minutes.' },
        { status: 429 }
      );
    }
    
    // Insert letter into database with 'queued' status
    // The queue processor will handle LLM generation and email sending
    const result = insertSantaLetter.run(
      sanitized.childName,
      sanitized.childAge,
      sanitized.parentEmail,
      sanitized.letterContent,
      clientIP
    );
    
    const letterId = result.lastInsertRowid as number;
    console.log('✅ Letter saved to database with ID:', letterId);
    console.log('📬 Letter queued for processing - Santa will read it soon!');
    
    // Return instant success - no waiting for LLM or email
    return NextResponse.json({
      success: true,
      letterId,
      message: "Your letter is on its way to the North Pole! 🎅✨ Santa will read it soon and send a magical reply to your email!"
    });
    
  } catch (error) {
    console.error('Error processing Santa letter:', error);
    return NextResponse.json(
      { error: 'Failed to send letter to Santa. Please try again later.' },
      { status: 500 }
    );
  }
}
