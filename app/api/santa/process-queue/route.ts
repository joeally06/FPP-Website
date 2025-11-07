import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-helpers';
import {
  getNextQueuedLetter,
  markLetterProcessing,
  markLetterCompleted,
  markLetterFailed,
  requeueLetter,
} from '@/lib/database';
import { generateSantaReply } from '@/lib/ollama-client';
import { sendSantaReply } from '@/lib/email-service';

const MAX_RETRIES = 3;

export const dynamic = 'force-dynamic';

/**
 * GET /api/santa/process-queue
 * Process the Santa letter queue
 * ADMIN ONLY - Background job for processing letters
 */
export async function GET() {
  try {
    await requireAdmin();
    
    console.log('[Queue Processor] Starting queue processing...');

    // Get the next queued letter
    const letter = getNextQueuedLetter.get() as any;

    if (!letter) {
      console.log('[Queue Processor] No letters in queue');
      return NextResponse.json({
        success: true,
        message: 'Queue is empty',
        processed: false,
      });
    }

    console.log(`[Queue Processor] Processing letter ID: ${letter.id} from ${letter.child_name}`);

    // Mark as processing
    markLetterProcessing.run(letter.id);

    try {
      // Generate Santa's reply using Ollama LLM
      const ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
      console.log(`[Queue Processor] Generating Santa reply for ${letter.child_name}, age ${letter.child_age}`);
      
      const santaReply = await generateSantaReply(
        letter.child_name,
        letter.child_age,
        letter.letter_content,
        ollamaUrl
      );

      console.log(`[Queue Processor] Generated reply (${santaReply.length} characters)`);

      // Send email to parent
      console.log(`[Queue Processor] Sending email to ${letter.parent_email}`);
      const emailSent = await sendSantaReply({
        parentEmail: letter.parent_email,
        childName: letter.child_name,
        santaReply,
      });

      if (!emailSent) {
        throw new Error('Failed to send email');
      }

      console.log(`[Queue Processor] Email sent successfully to ${letter.parent_email}`);

      // Mark as completed
      markLetterCompleted.run(santaReply, letter.id);

      console.log(`[Queue Processor] ✅ Successfully processed letter ID: ${letter.id}`);

      return NextResponse.json({
        success: true,
        message: 'Letter processed successfully',
        processed: true,
        letterId: letter.id,
        childName: letter.child_name,
      });
    } catch (error) {
      // Handle processing errors with retry logic
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const currentRetryCount = letter.retry_count || 0;
      const newRetryCount = currentRetryCount + 1;

      console.error(`[Queue Processor] ❌ Error processing letter ID ${letter.id}:`, errorMessage);
      console.log(`[Queue Processor] Retry count: ${newRetryCount}/${MAX_RETRIES}`);

      if (newRetryCount < MAX_RETRIES) {
        // Requeue for retry
        requeueLetter.run(errorMessage, newRetryCount, letter.id);
        console.log(`[Queue Processor] Letter requeued for retry (attempt ${newRetryCount + 1})`);

        return NextResponse.json({
          success: false,
          message: 'Processing failed, letter requeued for retry',
          processed: false,
          letterId: letter.id,
          retryCount: newRetryCount,
          error: errorMessage,
        }, { status: 500 });
      } else {
        // Max retries reached, mark as failed
        markLetterFailed.run(errorMessage, newRetryCount, letter.id);
        console.log(`[Queue Processor] ⚠️ Letter marked as failed after ${MAX_RETRIES} attempts`);

        return NextResponse.json({
          success: false,
          message: 'Processing failed after maximum retries',
          processed: false,
          letterId: letter.id,
          retryCount: newRetryCount,
          error: errorMessage,
          failed: true,
        }, { status: 500 });
      }
    }
  } catch (error: any) {
    if (error.message?.includes('Authentication required')) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (error.message?.includes('Admin access required')) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }
    console.error('[Queue Processor] Fatal error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Queue processor error',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
