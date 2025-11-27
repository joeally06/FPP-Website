import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-helpers';
import { spawn, execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

/**
 * POST /api/system/update
 * Trigger system update using FPP-inspired atomic daemon
 * 
 * Security:
 * - Admin authentication required
 * - Uses detached daemon process
 * - Atomic updates with rollback on failure
 * - Lock file prevents concurrent updates
 */
export async function POST() {
  try {
    await requireAdmin();

    const projectRoot = process.cwd();
    const logsDir = path.join(projectRoot, 'logs');
    const updateDaemon = path.join(projectRoot, 'scripts', 'update-daemon.sh');
    const statusFile = path.join(logsDir, 'update_status');
    const lockFile = path.join(logsDir, 'update.lock');
    const logFile = path.join(logsDir, 'update.log');

    console.log('[Update API] Starting update process...');
    console.log('[Update API] Project root:', projectRoot);
    console.log('[Update API] Daemon script:', updateDaemon);

    // Ensure logs directory exists
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
      console.log('[Update API] Created logs directory');
    }

    // Check if daemon script exists
    if (!fs.existsSync(updateDaemon)) {
      console.error('[Update API] Daemon script not found:', updateDaemon);
      return NextResponse.json({
        success: false,
        error: 'Update daemon script not found',
        path: updateDaemon
      }, { status: 500 });
    }

    // Check for stale lock file (older than 30 minutes)
    if (fs.existsSync(lockFile)) {
      const lockAge = Date.now() - fs.statSync(lockFile).mtimeMs;
      const lockAgeMinutes = Math.floor(lockAge / 60000);
      
      if (lockAge < 30 * 60 * 1000) {
        console.log('[Update API] Update already in progress (lock age: ' + lockAgeMinutes + ' min)');
        return NextResponse.json({
          success: false,
          error: 'Update already in progress',
          lockAge: lockAgeMinutes + ' minutes'
        }, { status: 409 });
      }
      
      // Remove stale lock
      console.log('[Update API] Removing stale lock file (age: ' + lockAgeMinutes + ' min)');
      fs.unlinkSync(lockFile);
    }

    // Make daemon executable
    try {
      fs.chmodSync(updateDaemon, 0o755);
      console.log('[Update API] Set script permissions to 755');
    } catch (error) {
      console.warn('[Update API] Failed to chmod (may be ok on some systems):', error);
    }

    // Clear old status and initialize log
    const timestamp = new Date().toISOString();
    fs.writeFileSync(statusFile, 'STARTING');
    fs.writeFileSync(logFile, `[${timestamp}] Update triggered from UI\n[${timestamp}] Project: ${projectRoot}\n[${timestamp}] Script: ${updateDaemon}\n`);

    console.log('[Update API] Spawning daemon...');

    // Use nohup to fully detach the process
    // This ensures it survives even when PM2 kills the Node.js process
    const daemon = spawn('nohup', ['bash', updateDaemon, projectRoot], {
      detached: true,
      stdio: ['ignore', 'ignore', 'ignore'],
      cwd: projectRoot,
      env: {
        ...process.env,
        PATH: '/usr/local/bin:/usr/bin:/bin:' + (process.env.PATH || ''),
        HOME: process.env.HOME || '/home/' + (process.env.USER || 'root'),
        USER: process.env.USER || 'root',
      },
    });

    // Unref so parent process can exit
    daemon.unref();

    const pid = daemon.pid;
    console.log('[Update API] Daemon spawned with PID:', pid);
    
    // Log the PID
    fs.appendFileSync(logFile, `[${new Date().toISOString()}] Spawned daemon with PID: ${pid}\n`);

    // Wait briefly to verify daemon started
    await new Promise(resolve => setTimeout(resolve, 500));

    // Check if status file was updated (indicates script started)
    let status = 'STARTING';
    if (fs.existsSync(statusFile)) {
      status = fs.readFileSync(statusFile, 'utf-8').trim();
    }

    // If status is still STARTING after 500ms, the daemon likely started successfully
    // If it failed immediately, status would be FAILED
    const daemonStarted = status !== 'FAILED';

    if (!daemonStarted) {
      const logContent = fs.existsSync(logFile) ? fs.readFileSync(logFile, 'utf-8') : 'No log available';
      console.error('[Update API] Daemon failed to start. Log:', logContent);
      return NextResponse.json({
        success: false,
        error: 'Update daemon failed to start',
        log: logContent.split('\n').slice(-10)
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Update daemon started successfully',
      pid,
      status,
      logFile: 'logs/update.log',
      statusFile: 'logs/update_status',
      pollUrl: '/api/system/update-status',
      note: 'Poll /api/system/update-status to monitor progress'
    });

  } catch (error: any) {
    console.error('[Update API] Error:', error);
    
    // Log error to file if possible
    try {
      const logFile = path.join(process.cwd(), 'logs', 'update.log');
      fs.appendFileSync(logFile, `[${new Date().toISOString()}] API ERROR: ${error.message}\n${error.stack}\n`);
    } catch {
      // Ignore logging errors
    }
    
    return NextResponse.json({
      success: false,
      error: 'Failed to start update',
      details: error.message
    }, { status: 500 });
  }
}

/**
 * GET /api/system/update
 * Check for available updates
 */
export async function GET() {
  try {
    await requireAdmin();

    const projectRoot = process.cwd();
    
    // Fetch latest from remote
    execSync('git fetch origin master', { 
      cwd: projectRoot,
      stdio: 'pipe',
      timeout: 30000
    });

    // Compare commits
    const localCommit = execSync('git rev-parse HEAD', { 
      cwd: projectRoot,
      encoding: 'utf-8' 
    }).trim();

    const remoteCommit = execSync('git rev-parse origin/master', { 
      cwd: projectRoot,
      encoding: 'utf-8' 
    }).trim();

    const upToDate = localCommit === remoteCommit;

    // Get current version
    let currentVersion = 'unknown';
    try {
      const packageJson = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf-8'));
      currentVersion = packageJson.version || 'unknown';
    } catch {
      // Ignore
    }

    // Get commit messages if update available
    let changes: string[] = [];
    let latestVersion = currentVersion;
    
    if (!upToDate) {
      try {
        const updateMessage = execSync(
          `git log --oneline ${localCommit}..${remoteCommit}`,
          { cwd: projectRoot, encoding: 'utf-8' }
        ).trim();
        changes = updateMessage ? updateMessage.split('\n') : [];
      } catch {
        // Ignore
      }
      
      // Try to get version from remote
      try {
        const remotePackage = execSync('git show origin/master:package.json', { 
          cwd: projectRoot, 
          encoding: 'utf-8' 
        });
        const remotePkg = JSON.parse(remotePackage);
        latestVersion = remotePkg.version || 'unknown';
      } catch {
        latestVersion = 'newer';
      }
    }

    return NextResponse.json({
      upToDate,
      updateAvailable: !upToDate,
      currentVersion,
      latestVersion,
      localCommit: localCommit.substring(0, 7),
      remoteCommit: remoteCommit.substring(0, 7),
      changes,
    });

  } catch (error: any) {
    console.error('[Update Check] Error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to check for updates',
      details: error.message
    }, { status: 500 });
  }
}
