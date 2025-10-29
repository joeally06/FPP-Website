// API Route: Send Letter to Santa

import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import {
  insertSantaLetter,
  updateSantaReply,
  updateSantaLetterStatus,
} from '@/lib/database';
import { generateSantaReply } from '@/lib/ollama-client';
import { sendSantaReply } from '@/lib/email-service';

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

function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export async function POST(request: NextRequest) {
  try {
    const body: SendLetterRequest = await request.json();
    
    console.log('📬 Received letter from:', body.childName);
    
    // Validate required fields
    if (!body.childName || !body.parentEmail || !body.letterContent) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Validate email format
    if (!validateEmail(body.parentEmail)) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      );
    }
    
    // Validate letter length
    if (body.letterContent.length > 2000) {
      return NextResponse.json(
        { error: 'Letter is too long (max 2000 characters)' },
        { status: 400 }
      );
    }
    
    // Validate child name length
    if (body.childName.length > 100) {
      return NextResponse.json(
        { error: 'Name is too long' },
        { status: 400 }
      );
    }
    
    // Rate limiting
    const clientIP = getClientIP(request);
    if (!checkRateLimit(clientIP)) {
      return NextResponse.json(
        { error: 'You can only send one letter per day. Please try again tomorrow!' },
        { status: 429 }
      );
    }
    
    // Content moderation (basic)
    const letterLower = body.letterContent.toLowerCase();
    const blockedWords = ['spam', 'test123', 'viagra']; // Add more as needed
    if (blockedWords.some(word => letterLower.includes(word))) {
      return NextResponse.json(
        { error: 'Letter contains inappropriate content' },
        { status: 400 }
      );
    }
    
    // Insert letter into database
    const result = insertSantaLetter.run(
      body.childName,
      body.childAge || null,
      body.parentEmail,
      body.letterContent,
      clientIP
    );
    
    const letterId = result.lastInsertRowid as number;
    console.log('✅ Letter saved to database with ID:', letterId);
    
    // Generate Santa's reply using Ollama
    let santaReply: string;
    try {
      const ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
      console.log('🤖 Calling Ollama at:', ollamaUrl);
      santaReply = await generateSantaReply(
        body.childName,
        body.childAge || null,
        body.letterContent,
        ollamaUrl
      );
      console.log('✅ LLM generated reply, length:', santaReply.length);
    } catch (error) {
      console.error('❌ Error generating Santa reply:', error);
      // Use fallback reply if LLM fails
      santaReply = `Dear ${body.childName},

Thank you so much for your wonderful letter! It warmed my heart to read it here at the North Pole.

The elves and I are working hard in the workshop preparing for Christmas Eve. Rudolph and the other reindeer are training for our big journey around the world!

Keep being kind and good, and remember that the spirit of Christmas is about love, joy, and sharing with others.

I'll be checking my list twice, so keep up the great work!

With love and Christmas magic,
Santa Claus
North Pole`;
    }
    
    // Update database with Santa's reply
    updateSantaReply.run(
      santaReply,
      'approved',
      letterId
    );
    console.log('✅ Reply saved to database');
    
    // Send email to parent
    let emailSent = false;
    try {
      console.log('📧 Attempting to send email to:', body.parentEmail);
      emailSent = await sendSantaReply({
        parentEmail: body.parentEmail,
        childName: body.childName,
        santaReply,
      });
      console.log('📧 Email sent:', emailSent);
      
      if (emailSent) {
        // Mark as sent
        updateSantaLetterStatus.run('sent', null, letterId);
        console.log('✅ Status updated to sent');
      }
    } catch (error) {
      console.error('❌ Error sending email:', error);
    }
    
    return NextResponse.json({
      success: true,
      letterId,
      emailSent,
      message: emailSent
        ? "Santa has received your letter and sent a magical reply to your email! Check your inbox! 🎅✨"
        : "Santa has received your letter! A reply will be sent to your email soon! 🎅"
    });
    
  } catch (error) {
    console.error('Error processing Santa letter:', error);
    return NextResponse.json(
      { error: 'Failed to send letter to Santa. Please try again later.' },
      { status: 500 }
    );
  }
}
