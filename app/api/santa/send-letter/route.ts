// API Route: Send Letter to Santa

import { NextRequest, NextResponse } from 'next/server';
import {
  insertSantaLetter,
} from '@/lib/database';
import { validateAndSanitizeSantaLetter } from '@/lib/input-sanitization';
import { checkSantaRateLimit, getClientIP } from '@/lib/santa-rate-limit';

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
    
    // Sanitize email headers to prevent injection
    const sanitizedEmail = sanitizeEmailHeader(body.parentEmail || '');
    
    // ✅ DUAL RATE LIMITING: Check both email and IP address
    const rateLimitResult = checkSantaRateLimit(sanitizedEmail, clientIP);
    
    if (!rateLimitResult.allowed) {
      const errorMessage = rateLimitResult.reason === 'email_limit'
        ? `You've already sent ${rateLimitResult.emailCount} letter(s) today from this email address. Daily limit is ${rateLimitResult.limit}.`
        : `You've already sent ${rateLimitResult.ipCount} letter(s) today from this location. Daily limit is ${rateLimitResult.limit}.`;
      
      console.warn(`[SECURITY] Rate limit exceeded for ${sanitizedEmail} / ${clientIP} (${rateLimitResult.reason})`);
      
      return NextResponse.json({ 
        error: errorMessage,
        emailCount: rateLimitResult.emailCount,
        ipCount: rateLimitResult.ipCount,
        limit: rateLimitResult.limit,
        reason: rateLimitResult.reason
      }, { status: 429 });
    }
    
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
