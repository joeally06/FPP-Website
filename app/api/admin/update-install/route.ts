import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { exec } from 'child_process';
import { existsSync, mkdirSync, writeFileSync, appendFileSync, statSync, unlinkSync } from 'fs';
import path from 'path';

const LOGS_DIR = path.join(process.cwd(), 'logs');
const LOCK_FILE = path.join(LOGS_DIR, 'update.lock');
const UPDATE_SCRIPT = path.join(process.cwd(), 'update.sh');

// Maximum age of a lock file before considering it stale (30 minutes)
const STALE_LOCK_AGE_MS = 30 * 60 * 1000;

/**
 * POST /api/admin/update-install
 * 
 * Execute system update synchronously, streaming output in real-time.
 * Based on FPP's approach: run git pull directly in the request.
 * 
 * Security:
 * - Admin authentication required
 * - Lock file prevents concurrent updates
 * - Stale lock detection (30 min timeout)
 * - Update runs in foreground with output streaming
 * - Automatic app restart after completion
 */
export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ 
        error: 'Unauthorized - Admin access required' 
      }, { status: 401 });
    }

    const adminEmail = session.user.email || 'unknown';
    const timestamp = new Date().toISOString();
    
    console.log(`[Update Install] Manual update triggered by admin: ${adminEmail}`);

    // Ensure logs directory exists
    if (!existsSync(LOGS_DIR)) {
      mkdirSync(LOGS_DIR, { recursive: true });
    }

    // Check if update script exists
    if (!existsSync(UPDATE_SCRIPT)) {
      console.error('[Update Install] Update script not found:', UPDATE_SCRIPT);
      return NextResponse.json({
        success: false,
        error: 'Update script not found'
      }, { status: 500 });
    }

    // Check for lock file (prevent concurrent updates)
    if (existsSync(LOCK_FILE)) {
      const lockAge = Date.now() - statSync(LOCK_FILE).mtimeMs;
      const lockAgeMinutes = Math.floor(lockAge / 60000);
      
      if (lockAge < STALE_LOCK_AGE_MS) {
        console.log(`[Update Install] Update already in progress (lock age: ${lockAgeMinutes} min)`);
        return NextResponse.json({
          success: false,
          error: 'Update already in progress',
          lockAge: `${lockAgeMinutes} minutes`
        }, { status: 409 });
      }
      
      // Remove stale lock
      console.log(`[Update Install] Removing stale lock file (age: ${lockAgeMinutes} min)`);
      unlinkSync(LOCK_FILE);
    }

    // Create lock file
    writeFileSync(LOCK_FILE, `${timestamp}|${adminEmail}`);

    console.log(`[Update Install] Running update script: ${UPDATE_SCRIPT}`);

    // Run update script with bash - output will be streamed
    // This follows FPP's approach: run synchronously, let the client handle streaming
    return new Response(
      new ReadableStream({
        async start(controller) {
          const encoder = new TextEncoder();
          
          // Send header
          controller.enqueue(encoder.encode(
            `════════════════════════════════════════════════════════════\n` +
            `FPP Control Center Update\n` +
            `Triggered by: ${adminEmail}\n` +
            `Time: ${timestamp}\n` +
            `════════════════════════════════════════════════════════════\n\n`
          ));

          try {
            // Execute update script
            const updateProcess = exec(`bash ${UPDATE_SCRIPT}`, {
              cwd: process.cwd(),
              maxBuffer: 10 * 1024 * 1024, // 10MB buffer
            });

            // Stream stdout
            updateProcess.stdout?.on('data', (data) => {
              controller.enqueue(encoder.encode(data.toString()));
            });

            // Stream stderr
            updateProcess.stderr?.on('data', (data) => {
              controller.enqueue(encoder.encode(`ERROR: ${data.toString()}`));
            });

            // Wait for completion
            await new Promise<void>((resolve, reject) => {
              updateProcess.on('exit', (code) => {
                if (code === 0) {
                  controller.enqueue(encoder.encode(
                    `\n════════════════════════════════════════════════════════════\n` +
                    `Update Complete!\n` +
                    `════════════════════════════════════════════════════════════\n`
                  ));
                  resolve();
                } else {
                  controller.enqueue(encoder.encode(
                    `\n════════════════════════════════════════════════════════════\n` +
                    `Update Failed (Exit Code: ${code})\n` +
                    `════════════════════════════════════════════════════════════\n`
                  ));
                  reject(new Error(`Update failed with code ${code}`));
                }
              });

              updateProcess.on('error', reject);
            });

          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            controller.enqueue(encoder.encode(
              `\n════════════════════════════════════════════════════════════\n` +
              `ERROR: ${errorMessage}\n` +
              `════════════════════════════════════════════════════════════\n`
            ));
          } finally {
            // Remove lock file
            try {
              unlinkSync(LOCK_FILE);
            } catch {}
            controller.close();
          }
        },
      }),
      {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'no-cache',
          'X-Accel-Buffering': 'no', // Disable nginx buffering
        },
      }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Update Install] Error:', error);
    
    // Remove lock file on error
    try {
      if (existsSync(LOCK_FILE)) {
        unlinkSync(LOCK_FILE);
      }
    } catch {}
    
    return NextResponse.json({ 
      success: false,
      error: 'Failed to start update process',
      details: errorMessage
    }, { status: 500 });
  }
}
