// API Route: Send Letter to Santa

import { NextRequest, NextResponse } from 'next/server';
import {
  insertSantaLetter,
} from '@/lib/database';
import { validateAndSanitizeSantaLetter } from '@/lib/input-sanitization';
import { santaLetterLimiter, getClientIP } from '@/lib/rate-limit';
import db from '@/lib/database';

interface SendLetterRequest {
  childName: string;
  childAge?: number;
  parentEmail: string;
  letterContent: string;
}

/**
 * Sanitize email headers to prevent injection
 */
function sanitizeEmailHeader(input: string): string {
  return input.replace(/[\r\n]/g, '');
}

export async function POST(request: NextRequest) {
  try {
    const body: SendLetterRequest = await request.json();
    
    console.log('📬 Received letter from:', body.childName);

    // Get client IP for rate limiting
    const clientIP = getClientIP(request);
    
    // Rate limiting check using database-backed limiter
    const rateLimitResult = santaLetterLimiter.check(clientIP);
    if (!rateLimitResult.success) {
      const errorMessage = rateLimitResult.blocked 
        ? `Too many letters sent. You are blocked until ${rateLimitResult.blockedUntil?.toLocaleString()}`
        : `You can only send 2 letters per day. Try again after ${rateLimitResult.resetAt.toLocaleString()}`;
      
      console.warn(`[SECURITY] Rate limit exceeded for ${clientIP} (Santa letter)`);
      
      return NextResponse.json({ 
        error: errorMessage,
        resetAt: rateLimitResult.resetAt.toISOString()
      }, { status: 429 });
    }

    // Check for duplicate submission within 24 hours
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
    const duplicate = db.prepare(`
      SELECT id FROM santa_letters 
      WHERE ip_address = ? 
        AND created_at > ?
      LIMIT 1
    `).get(clientIP, oneDayAgo);
    
    if (duplicate) {
      console.warn(`[SECURITY] Duplicate submission detected from ${clientIP}`);
      return NextResponse.json({ 
        error: 'You already sent a letter today. Please wait 24 hours before sending another.' 
      }, { status: 429 });
    }
    
    // Sanitize email headers to prevent injection
    const sanitizedEmail = sanitizeEmailHeader(body.parentEmail || '');
    
    // ✅ SECURITY: Validate and sanitize ALL inputs
    const validation = validateAndSanitizeSantaLetter(
      body.childName || '',
      body.childAge || null,
      sanitizedEmail,
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
