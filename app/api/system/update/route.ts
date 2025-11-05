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
    const updateScript = path.join(projectRoot, 'scripts', 'run-update.sh');
    const logFile = path.join(projectRoot, 'logs', 'update.log');
    const statusFile = path.join(projectRoot, 'logs', 'update_status');

    // Ensure directories exist
    const logsDir = path.join(projectRoot, 'logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }

    // Check if script exists
    if (!fs.existsSync(updateScript)) {
      return NextResponse.json({
        success: false,
        error: 'Update script not found at: ' + updateScript
      }, { status: 500 });
    }

    // Make script executable
    try {
      fs.chmodSync(updateScript, '755');
    } catch (error) {
      console.warn('[System Update] Failed to chmod:', error);
    }

    // Clear old status (log is cleared by run-update.sh)
    try {
      if (fs.existsSync(statusFile)) {
        fs.writeFileSync(statusFile, 'STARTING');
      }
    } catch (error) {
      console.warn('[System Update] Failed to clear status:', error);
    }

    console.log('[System Update] Spawning update process...');
    console.log('[System Update] Script:', updateScript);
    console.log('[System Update] This will:');
    console.log('[System Update]   1. Run update.sh in background');
    console.log('[System Update]   2. Track status in logs/update_status');
    console.log('[System Update]   3. Log output to logs/update.log');
    console.log('[System Update]   4. Continue even after server restart');

    // Spawn the update script as a completely detached process
    // This ensures it continues running even when PM2 stops the app
    const child = spawn('bash', [updateScript], {
      detached: true,        // Run independently
      stdio: 'ignore',       // Don't keep pipes open
      cwd: projectRoot,
      env: process.env
    });

    // Unref allows parent to exit independently
    child.unref();

    console.log('[System Update] Update process spawned (PID:', child.pid, ')');
    console.log('[System Update] Monitor: tail -f logs/update.log');

    // Return immediately - update continues in background
    return NextResponse.json({
      success: true,
      message: 'Update started successfully',
      updated: true,
      requiresReload: true,
      pid: child.pid,
      logFile: 'logs/update.log',
      statusFile: 'logs/update_status',
      note: 'Update runs in background. Server will restart automatically.'
    });

  } catch (error: any) {
    console.error('[System Update] Fatal error:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
