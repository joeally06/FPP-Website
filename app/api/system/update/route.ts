import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-helpers';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

export async function POST() {
  try {
    await requireAdmin();

    console.log('[System Update] Starting upgrade system...');

    const projectRoot = process.cwd();
    const upgradeScript = path.join(projectRoot, 'scripts', 'upgrade-system.sh');
    const statusFile = '/tmp/fpp-control-upgrade/upgrade_status';
    const logFile = '/tmp/fpp-control-upgrade/upgrade.log';
    const pidFile = '/tmp/fpp-control-upgrade/upgrade.pid';

    // Ensure scripts directory exists
    const scriptsDir = path.join(projectRoot, 'scripts');
    if (!fs.existsSync(scriptsDir)) {
      fs.mkdirSync(scriptsDir, { recursive: true });
    }

    // Check if upgrade script exists
    if (!fs.existsSync(upgradeScript)) {
      return NextResponse.json({
        success: false,
        error: 'Upgrade script not found. Please run: git pull'
      }, { status: 500 });
    }

    // Make script executable
    try {
      fs.chmodSync(upgradeScript, '755');
    } catch (error) {
      console.warn('[System Update] Failed to set executable permission:', error);
    }

    // Check if an upgrade is already running
    if (fs.existsSync(pidFile)) {
      try {
        const pid = fs.readFileSync(pidFile, 'utf-8').trim();
        
        // Check if process is actually running
        try {
          process.kill(parseInt(pid), 0);
          // Process exists
          return NextResponse.json({
            success: false,
            error: 'Upgrade already in progress',
            statusFile,
            logFile
          }, { status: 409 });
        } catch {
          // Process doesn't exist, clean up stale PID file
          fs.unlinkSync(pidFile);
        }
      } catch (error) {
        // Can't read PID file, remove it
        try {
          fs.unlinkSync(pidFile);
        } catch {}
      }
    }

    // Clean up old status/log files
    try {
      if (fs.existsSync(statusFile)) fs.unlinkSync(statusFile);
      if (fs.existsSync(logFile)) fs.unlinkSync(logFile);
    } catch (error) {
      console.warn('[System Update] Failed to clean up old files:', error);
    }

    console.log('[System Update] Spawning detached upgrade process...');
    console.log('[System Update] Steps:');
    console.log('[System Update]   1. STOPPING - Delete PM2 process (clean database shutdown)');
    console.log('[System Update]   2. BACKING_UP - Backup database and config');
    console.log('[System Update]   3. STASHING - Stash any local changes');
    console.log('[System Update]   4. CHECKING - Fetch and check for updates');
    console.log('[System Update]   5. UPDATING - Pull latest code');
    console.log('[System Update]   6. INSTALLING - Install dependencies');
    console.log('[System Update]   7. BUILDING - Build application');
    console.log('[System Update]   8. MIGRATING - Run database migrations (if needed)');
    console.log('[System Update]   9. RESTORING - Restore local changes');
    console.log('[System Update]   10. RESTARTING - Restart PM2');
    
    // Spawn completely detached upgrade process
    const upgradeProcess = spawn('nohup', ['bash', upgradeScript], {
      cwd: projectRoot,
      detached: true,
      stdio: 'ignore'
    });

    upgradeProcess.unref();

    console.log('[System Update] Upgrade process spawned (PID:', upgradeProcess.pid, ')');
    console.log('[System Update] Status file:', statusFile);
    console.log('[System Update] Log file:', logFile);

    return NextResponse.json({
      success: true,
      message: 'Upgrade started. Monitor status at /api/system/update-status',
      updated: true,
      requiresReload: true,
      pid: upgradeProcess.pid,
      statusFile,
      logFile
    });

  } catch (error: any) {
    console.error('[System Update] Fatal error:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message,
      details: 'Failed to start upgrade process'
    }, { status: 500 });
  }
}
