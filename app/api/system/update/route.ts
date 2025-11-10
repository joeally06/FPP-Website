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

    console.log('[Update API] Starting update daemon...');

    const projectRoot = process.cwd();
    const updateDaemon = path.join(projectRoot, 'scripts', 'update-daemon.sh');
    const statusFile = path.join(projectRoot, 'logs', 'update_status');

    // Ensure directories exist
    const logsDir = path.join(projectRoot, 'logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }

    // Check if daemon script exists
    if (!fs.existsSync(updateDaemon)) {
      return NextResponse.json({
        success: false,
        error: 'Update daemon script not found at: ' + updateDaemon
      }, { status: 500 });
    }

    // Make daemon executable
    try {
      fs.chmodSync(updateDaemon, '755');
    } catch (error) {
      console.warn('[Update API] Failed to chmod:', error);
    }

    // Clear old status
    try {
      if (fs.existsSync(statusFile)) {
        fs.unlinkSync(statusFile);
      }
    } catch (error) {
      console.warn('[Update API] Failed to clear status:', error);
    }

    console.log('[Update API] Spawning daemon:', updateDaemon);
    console.log('[Update API] Project root:', projectRoot);
    console.log('[Update API] 8-Phase Atomic Update Process:');
    console.log('[Update API]   Phase 1: Download - Fetch and verify updates');
    console.log('[Update API]   Phase 2: Backup - Create timestamped backup');
    console.log('[Update API]   Phase 3: Stop - Gracefully stop PM2 services');
    console.log('[Update API]   Phase 4: Update - Apply git updates with rollback');
    console.log('[Update API]   Phase 5: Install - Install dependencies with rollback');
    console.log('[Update API]   Phase 6: Build - Build application with rollback');
    console.log('[Update API]   Phase 7: Restart - Restart PM2 services');
    console.log('[Update API]   Phase 8: Verify - Health check application');

    // Spawn completely detached daemon process
    // This process will survive even when PM2 kills this Node.js process
    const daemon = spawn('bash', [updateDaemon, projectRoot], {
      detached: true,
      stdio: 'ignore',  // Fully detached - no pipes
      env: {
        ...process.env,
        PATH: process.env.PATH || '/usr/local/bin:/usr/bin:/bin',
        HOME: process.env.HOME || '/root',
        USER: process.env.USER || 'root',
      },
    });

    // Unref so parent process can exit
    daemon.unref();

    console.log(`[Update API] Update daemon spawned (PID: ${daemon.pid})`);

    // Wait briefly to check if daemon started
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Check if status file was created
    let status = 'STARTING';
    if (fs.existsSync(statusFile)) {
      status = fs.readFileSync(statusFile, 'utf-8').trim();
    }

    return NextResponse.json({
      success: true,
      message: 'Update daemon started successfully',
      updated: true,
      requiresReload: true,
      daemonPid: daemon.pid,
      status,
      logFile: 'logs/update.log',
      statusFile: 'logs/update_status',
      note: 'Atomic update in progress. Monitor /api/system/update-status',
    });

  } catch (error: any) {
    console.error('[Update API] Error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to start update daemon',
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
      stdio: 'pipe' 
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

    // Get commit messages if update available
    let updateMessage = '';
    if (!upToDate) {
      updateMessage = execSync(
        `git log --oneline ${localCommit}..${remoteCommit}`,
        { cwd: projectRoot, encoding: 'utf-8' }
      ).trim();
    }

    return NextResponse.json({
      upToDate,
      localCommit: localCommit.substring(0, 7),
      remoteCommit: remoteCommit.substring(0, 7),
      updateAvailable: !upToDate,
      changes: updateMessage ? updateMessage.split('\n') : [],
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
