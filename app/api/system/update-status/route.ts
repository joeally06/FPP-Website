import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-helpers';
import fs from 'fs';

const STATUS_FILE = '/tmp/fpp-control-upgrade/upgrade_status';
const LOG_FILE = '/tmp/fpp-control-upgrade/upgrade.log';
const PID_FILE = '/tmp/fpp-control-upgrade/upgrade.pid';

export async function GET() {
  try {
    await requireAdmin();

    // Check if upgrade is running
    let isRunning = false;
    if (fs.existsSync(PID_FILE)) {
      try {
        const pid = fs.readFileSync(PID_FILE, 'utf-8').trim();
        process.kill(parseInt(pid), 0);
        isRunning = true;
      } catch {
        // Process not running
        isRunning = false;
      }
    }

    // Read current status
    let status = 'IDLE';
    if (fs.existsSync(STATUS_FILE)) {
      status = fs.readFileSync(STATUS_FILE, 'utf-8').trim();
    }

    // Read last 20 lines of log
    let logLines: string[] = [];
    if (fs.existsSync(LOG_FILE)) {
      const logContent = fs.readFileSync(LOG_FILE, 'utf-8');
      const lines = logContent.trim().split('\n');
      logLines = lines.slice(-20);
    }

    // Determine if upgrade is complete
    const isComplete = status === 'SUCCESS' || status === 'COMPLETE';
    const hasFailed = status.startsWith('FAILED');

    return NextResponse.json({
      status,
      isRunning,
      isComplete,
      hasFailed,
      lastLines: logLines,
      statusFile: STATUS_FILE,
      logFile: LOG_FILE
    });

  } catch (error: any) {
    console.error('[Update Status] Error:', error);
    
    return NextResponse.json({
      status: 'ERROR',
      error: error.message,
      isRunning: false,
      isComplete: false,
      hasFailed: true
    }, { status: 500 });
  }
}
