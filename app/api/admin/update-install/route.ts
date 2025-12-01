import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { spawn, execSync } from 'child_process';
import { existsSync, mkdirSync, writeFileSync, appendFileSync, statSync, unlinkSync, chmodSync, readFileSync, createWriteStream } from 'fs';
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
 * Trigger system update by spawning update-daemon.sh as a detached process.
 * Uses nohup to ensure the daemon survives PM2 restarts during the update.
 * 
 * Security:
 * - Admin authentication required
 * - Lock file prevents concurrent updates
 * - Stale lock detection (30 min timeout)
 * - Daemon runs with inherited environment (no privilege escalation)
 * - All actions logged to update.log
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

    // Verify bash is available
    try {
      execSync('which bash', { stdio: 'pipe' });
    } catch (error) {
      console.error('[Update Install] bash not found in PATH');
      return NextResponse.json({
        success: false,
        error: 'bash shell not found - required for update daemon'
      }, { status: 500 });
    }

    // Verify nohup is available
    try {
      execSync('which nohup', { stdio: 'pipe' });
    } catch (error) {
      console.error('[Update Install] nohup not found in PATH');
      return NextResponse.json({
        success: false,
        error: 'nohup command not found - required for background execution'
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

    // Make daemon executable (may fail on some systems, that's ok)
    try {
      chmodSync(SCRIPT_PATH, 0o755);
    } catch (error) {
      console.warn('[Update Install] Could not chmod script (may be ok):', error);
    }

    // Initialize status and log files
    writeFileSync(STATUS_FILE, 'STARTING');
    writeFileSync(LOG_FILE, 
      `[${timestamp}] ════════════════════════════════════════════════════════════\n` +
      `[${timestamp}] Update triggered by: ${adminEmail}\n` +
      `[${timestamp}] Project directory: ${process.cwd()}\n` +
      `[${timestamp}] ════════════════════════════════════════════════════════════\n`
    );

    console.log(`[Update Install] Spawning daemon: ${SCRIPT_PATH}`);

    // Spawn daemon with nohup for proper detachment
    // This ensures the process survives even when PM2 restarts Node.js
    // Note: We ignore all stdio to allow proper detachment
    const daemon = spawn('nohup', ['bash', SCRIPT_PATH, process.cwd()], {
      detached: true,
      stdio: ['ignore', 'ignore', 'ignore'], // All stdio ignored for proper detachment
      cwd: process.cwd(),
      env: {
        ...process.env,
        // Ensure PATH includes common binary locations
        PATH: '/usr/local/bin:/usr/bin:/bin:' + (process.env.PATH || ''),
        HOME: process.env.HOME || '/home/' + (process.env.USER || 'root'),
        USER: process.env.USER || 'root',
      },
    });

    // Handle spawn errors
    daemon.on('error', (error) => {
      console.error('[Update Install] Daemon spawn error:', error);
      appendFileSync(LOG_FILE, `[${new Date().toISOString()}] ERROR: Failed to spawn daemon: ${error.message}\n`);
      writeFileSync(STATUS_FILE, 'FAILED');
    });

    // Unref so Node.js can exit while daemon continues
    daemon.unref();

    const pid = daemon.pid;
    console.log(`[Update Install] Daemon spawned with PID: ${pid}`);
    appendFileSync(LOG_FILE, `[${new Date().toISOString()}] Daemon started with PID: ${pid}\n`);

    // Wait longer to verify daemon actually started
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Verify daemon started successfully by checking status file
    if (existsSync(STATUS_FILE)) {
      const status = readFileSync(STATUS_FILE, 'utf-8').trim();
      if (status === 'FAILED' || status === 'ERROR' || status === 'LOCKED') {
        console.error(`[Update Install] Daemon failed to start. Status: ${status}`);
        
        // Read log file for error details
        let logContent = '';
        if (existsSync(LOG_FILE)) {
          try {
            const fullLog = readFileSync(LOG_FILE, 'utf-8');
            const lines = fullLog.split('\n');
            logContent = lines.slice(-20).join('\n'); // Last 20 lines
          } catch (e) {
            // Ignore read errors
          }
        }
        
        return NextResponse.json({
          success: false,
          error: `Daemon failed to start (Status: ${status})`,
          details: logContent || 'Check logs/update.log for details'
        }, { status: 500 });
      }
    }

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
    
    // Log error to file
    try {
      appendFileSync(LOG_FILE, `[${new Date().toISOString()}] API ERROR: ${errorMessage}\n`);
      writeFileSync(STATUS_FILE, 'FAILED');
    } catch {
      // Ignore logging errors
    }
    
    return NextResponse.json({ 
      success: false,
      error: 'Failed to start update process',
      details: errorMessage
    }, { status: 500 });
  }
}
