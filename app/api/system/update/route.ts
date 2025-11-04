import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-helpers';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

export async function POST() {
  try {
    await requireAdmin();

    console.log('[System Update] Starting detached update process...');

    const projectRoot = process.cwd();
    const wrapperScript = path.join(projectRoot, 'scripts', 'run-update.sh');
    const logFile = path.join(projectRoot, 'logs', 'update.log');
    const pidFile = path.join(projectRoot, 'logs', 'update.pid');

    const scriptsDir = path.join(projectRoot, 'scripts');
    if (!fs.existsSync(scriptsDir)) {
      fs.mkdirSync(scriptsDir, { recursive: true });
    }

    const logsDir = path.join(projectRoot, 'logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }

    if (!fs.existsSync(wrapperScript)) {
      return NextResponse.json({
        success: false,
        error: 'Update wrapper script not found. Please run: git pull'
      }, { status: 500 });
    }

    try {
      fs.chmodSync(wrapperScript, '755');
    } catch (error) {
      console.warn('[System Update] Failed to set executable permission:', error);
    }

    if (fs.existsSync(pidFile)) {
      const pid = fs.readFileSync(pidFile, 'utf-8').trim();
      console.log('[System Update] Update already running (PID:', pid, ')');
      
      return NextResponse.json({
        success: false,
        error: 'Update already in progress. Check logs/update.log for status.'
      }, { status: 409 });
    }

    console.log('[System Update] Spawning detached update process...');
    console.log('[System Update] This will:');
    console.log('[System Update]   1. Stop PM2 (closes database safely)');
    console.log('[System Update]   2. Backup database and config');
    console.log('[System Update]   3. Pull latest code');
    console.log('[System Update]   4. Install dependencies');
    console.log('[System Update]   5. Build application');
    console.log('[System Update]   6. Restart PM2');
    
    const updateProcess = spawn('nohup', ['bash', wrapperScript], {
      cwd: projectRoot,
      detached: true,
      stdio: 'ignore'
    });

    updateProcess.unref();

    console.log('[System Update] Update process spawned (PID:', updateProcess.pid, ')');
    console.log('[System Update] The update will continue even after PM2 restart');
    console.log('[System Update] Monitor progress: tail -f logs/update.log');

    return NextResponse.json({
      success: true,
      message: 'Update started in background. The application will restart automatically in 1-2 minutes.',
      updated: true,
      requiresReload: true,
      pid: updateProcess.pid,
      logFile: 'logs/update.log',
      note: 'Update is running independently and will survive PM2 restart',
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('[System Update] Fatal error:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message,
      details: 'Failed to start update process. Check server logs.'
    }, { status: 500 });
  }
}
