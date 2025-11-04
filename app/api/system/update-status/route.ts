import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-helpers';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    await requireAdmin();

    const logFile = path.join(process.cwd(), 'logs', 'update.log');
    const pidFile = path.join(process.cwd(), 'logs', 'update.pid');

    const isRunning = fs.existsSync(pidFile);

    if (!fs.existsSync(logFile)) {
      return NextResponse.json({
        status: 'no_update',
        message: 'No update in progress',
        isRunning: false
      });
    }

    const logContent = fs.readFileSync(logFile, 'utf-8');
    const lines = logContent.trim().split('\n');
    const lastLines = lines.slice(-50);

    const isComplete = lastLines.some(line => 
      line.includes('Update completed successfully') ||
      line.includes('✅ Update completed') ||
      line.includes('Server restarted successfully')
    );

    const hasError = lastLines.some(line => 
      line.includes('❌ Update failed') ||
      line.includes('Error:') ||
      line.includes('Failed')
    );

    const isAlreadyUpToDate = lastLines.some(line =>
      line.includes('Already up to date')
    );

    let status = 'running';
    if (isComplete) status = 'complete';
    else if (hasError) status = 'error';
    else if (isAlreadyUpToDate) status = 'up_to_date';
    else if (!isRunning) status = 'unknown';

    return NextResponse.json({
      status,
      isRunning,
      lastLines: lastLines.slice(-20),
      logFile: 'logs/update.log'
    });

  } catch (error: any) {
    console.error('[Update Status] Error:', error);
    
    return NextResponse.json({
      status: 'error',
      error: error.message,
      isRunning: false
    }, { status: 500 });
  }
}
