import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-helpers';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    await requireAdmin();

    const logFile = path.join(process.cwd(), 'logs', 'upgrade.log');
    const statusFile = path.join(process.cwd(), 'logs', 'upgrade_status');

    // Read current status
    let status = 'IDLE';
    if (fs.existsSync(statusFile)) {
      status = fs.readFileSync(statusFile, 'utf-8').trim();
    }

    // Read last 20 lines of log
    let logLines: string[] = [];
    if (fs.existsSync(logFile)) {
      const logContent = fs.readFileSync(logFile, 'utf-8');
      const lines = logContent.trim().split('\n');
      logLines = lines.slice(-20);
    }

    // Determine status
    const isComplete = status === 'SUCCESS';
    const hasFailed = status === 'FAILED';
    const isRunning = status !== 'IDLE' && status !== 'SUCCESS' && status !== 'FAILED';

    // Map status to user-friendly messages
    const statusMessages: Record<string, string> = {
      'STOPPING': 'Stopping application...',
      'BACKING_UP': 'Creating backup...',
      'STASHING': 'Saving local changes...',
      'UPDATING': 'Downloading updates...',
      'INSTALLING': 'Installing dependencies...',
      'BUILDING': 'Building application...',
      'RESTORING': 'Restoring local changes...',
      'RESTARTING': 'Restarting application...',
      'SUCCESS': 'Upgrade complete! 🎉',
      'FAILED': 'Upgrade failed',
      'IDLE': 'No upgrade in progress'
    };

    return NextResponse.json({
      status,
      statusMessage: statusMessages[status] || status,
      isRunning,
      isComplete,
      hasFailed,
      lastLines: logLines,
      logFile: 'logs/upgrade.log',
      statusFile: 'logs/upgrade_status'
    });

  } catch (error: any) {
    console.error('[Update Status] Error:', error);
    
    return NextResponse.json({
      status: 'ERROR',
      statusMessage: 'Error checking status',
      error: error.message,
      isRunning: false,
      isComplete: false,
      hasFailed: true
    }, { status: 500 });
  }
}
