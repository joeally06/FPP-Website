import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-helpers';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    await requireAdmin();

    const logFile = path.join(process.cwd(), 'logs', 'update.log');
    const statusFile = path.join(process.cwd(), 'logs', 'update_status');

    // Read current status
    let status = 'IDLE';
    if (fs.existsSync(statusFile)) {
      status = fs.readFileSync(statusFile, 'utf-8').trim();
    }

    // Read last 30 lines of log
    let logLines: string[] = [];
    if (fs.existsSync(logFile)) {
      const logContent = fs.readFileSync(logFile, 'utf-8');
      const lines = logContent.trim().split('\n');
      logLines = lines.slice(-30); // Show more lines for better visibility
    }

    // Determine status
    const isComplete = status === 'SUCCESS' || status === 'UP_TO_DATE';
    const hasFailed = status === 'FAILED';
    const isRunning = status !== 'IDLE' && !isComplete && !hasFailed;

    // Map status to user-friendly messages
    const statusMessages: Record<string, string> = {
      'STARTING': '🚀 Starting update process...',
      'STOPPING': '⏸️ Stopping application...',
      'BACKING_UP': '💾 Creating backup...',
      'STASHING': '📦 Saving local changes...',
      'UPDATING': '📥 Downloading updates from GitHub...',
      'INSTALLING': '📦 Installing dependencies...',
      'MIGRATING': '🗄️ Running database migrations...',
      'BUILDING': '🔨 Building application...',
      'RESTORING': '📦 Restoring local changes...',
      'RESTARTING': '🔄 Restarting application...',
      'SUCCESS': '✅ Update complete!',
      'UP_TO_DATE': '✅ Already up to date!',
      'FAILED': '❌ Update failed',
      'IDLE': 'No update in progress'
    };

    return NextResponse.json({
      status,
      statusMessage: statusMessages[status] || status,
      isRunning,
      isComplete,
      hasFailed,
      lastLines: logLines,
      logFile: 'logs/update.log',
      statusFile: 'logs/update_status'
    });

  } catch (error: any) {
    console.error('[Update Status] Error:', error);
    
    return NextResponse.json({
      status: 'ERROR',
      statusMessage: 'Error checking status',
      error: error.message,
      isRunning: false,
      isComplete: false,
      hasFailed: true,
      lastLines: []
    }, { status: 500 });
  }
}
