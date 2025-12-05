import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { spawn } from 'child_process';
import { existsSync, mkdirSync, writeFileSync, statSync, unlinkSync } from 'fs';
import path from 'path';

const LOGS_DIR = path.join(process.cwd(), 'logs');
const STATUS_FILE = path.join(LOGS_DIR, 'update_status');
const LOG_FILE = path.join(LOGS_DIR, 'update.log');
const LOCK_FILE = path.join(LOGS_DIR, 'update.lock');
const SCRIPT_PATH = path.join(process.cwd(), 'scripts', 'update-daemon.sh');

// Maximum age of a lock file before considering it stale (30 minutes)
const STALE_LOCK_AGE_MS = 30 * 60 * 1000;

/**
 * POST /api/admin/update-install
 * 
 * Trigger system update by spawning update-daemon.sh as a background process.
 * Returns immediately, allowing client to poll for status updates.
 * 
 * Security:
 * - Admin authentication required
 * - Lock file prevents concurrent updates
 * - Stale lock detection (30 min timeout)
 * - Background daemon for non-blocking updates
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

    // Check if daemon script exists
    if (!existsSync(SCRIPT_PATH)) {
      console.error('[Update Install] Daemon script not found:', SCRIPT_PATH);
      return NextResponse.json({
        success: false,
        error: 'Update daemon script not found'
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

    // Initialize status and log files
    writeFileSync(STATUS_FILE, 'STARTING');
    writeFileSync(LOG_FILE, 
      `[${timestamp}] Update triggered by: ${adminEmail}\n` +
      `[${timestamp}] Project directory: ${process.cwd()}\n`
    );

    console.log(`[Update Install] Spawning daemon: ${SCRIPT_PATH}`);

    // Spawn daemon using setsid to create a truly independent process session
    // This ensures the daemon survives even when fpp-control is killed
    const daemon = spawn('setsid', ['bash', SCRIPT_PATH, process.cwd()], {
      detached: true,
      stdio: 'ignore',
      cwd: process.cwd(),
    });

    daemon.unref();

    const pid = daemon.pid;
    console.log(`[Update Install] Daemon spawned with PID: ${pid}`);

    return NextResponse.json({
      success: true,
      message: 'Update started - monitor progress via update-stream endpoint',
      pid,
      streamUrl: '/api/admin/update-stream',
      statusUrl: '/api/admin/update-status',
      logFile: 'logs/update.log'
    });

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
