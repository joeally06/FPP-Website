import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-helpers';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';

const execAsync = promisify(exec);

export async function POST() {
  try {
    await requireAdmin();

    console.log('[System Update] Triggering upgrade (FPP-style)...');

    const projectRoot = process.cwd();
    const triggerScript = path.join(projectRoot, 'scripts', 'trigger-upgrade.sh');
    const logFile = path.join(projectRoot, 'logs', 'upgrade.log');
    const statusFile = path.join(projectRoot, 'logs', 'upgrade_status');

    // Ensure directories exist
    const logsDir = path.join(projectRoot, 'logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }

    // Check if trigger script exists
    if (!fs.existsSync(triggerScript)) {
      return NextResponse.json({
        success: false,
        error: 'Upgrade script not found. Please run: git pull'
      }, { status: 500 });
    }

    // Make script executable
    try {
      fs.chmodSync(triggerScript, '755');
    } catch (error) {
      console.warn('[System Update] Failed to chmod:', error);
    }

    // Clear old status/log
    try {
      if (fs.existsSync(statusFile)) fs.unlinkSync(statusFile);
      if (fs.existsSync(logFile)) fs.unlinkSync(logFile);
    } catch (error) {
      console.warn('[System Update] Failed to clear old files:', error);
    }

    console.log('[System Update] Executing trigger script...');
    console.log('[System Update] This will:');
    console.log('[System Update]   1. Create temp upgrade script in /tmp');
    console.log('[System Update]   2. Schedule with at/batch/nohup (FPP-style)');
    console.log('[System Update]   3. Return immediately');
    console.log('[System Update]   4. Upgrade runs independently');
    console.log('[System Update]   5. Temp script deletes itself when done');

    // Execute the trigger script (it will schedule the upgrade and exit immediately)
    try {
      const { stdout, stderr } = await execAsync(`bash ${triggerScript}`, {
        cwd: projectRoot,
        timeout: 5000 // Trigger should complete in 5 seconds
      });

      console.log('[System Update] Trigger output:', stdout);
      if (stderr) console.warn('[System Update] Trigger stderr:', stderr);

      return NextResponse.json({
        success: true,
        message: 'Upgrade started. The application will restart automatically in 1-2 minutes.',
        updated: true,
        requiresReload: true,
        logFile: 'logs/upgrade.log',
        statusFile: 'logs/upgrade_status',
        note: 'Upgrade runs independently using FPP-style at/batch scheduling'
      });

    } catch (error: any) {
      console.error('[System Update] Trigger failed:', error);
      
      return NextResponse.json({
        success: false,
        error: 'Failed to trigger upgrade',
        details: error.message
      }, { status: 500 });
    }

  } catch (error: any) {
    console.error('[System Update] Fatal error:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
