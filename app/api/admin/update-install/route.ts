import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { spawn } from 'child_process';
import path from 'path';

/**
 * POST /api/admin/update-install
 * Trigger update installation process by spawning update-daemon.sh
 */
export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    
    if (session?.user?.role !== 'admin') {
      return NextResponse.json({ 
        error: 'Unauthorized - Admin access required' 
      }, { status: 401 });
    }

    console.log('[Update Install] Manual update triggered by admin:', session.user.email);

    // Spawn update daemon in background
    const scriptPath = path.join(process.cwd(), 'scripts', 'update-daemon.sh');
    
    const updateProcess = spawn('bash', [scriptPath], {
      detached: true,
      stdio: 'ignore',
      cwd: process.cwd()
    });

    updateProcess.unref();

    console.log(`[Update Install] Update daemon started (PID: ${updateProcess.pid})`);

    return NextResponse.json({
      success: true,
      message: 'Update started',
      pid: updateProcess.pid
    });

  } catch (error) {
    console.error('[Update Install] Error:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Failed to start update process' 
    }, { status: 500 });
  }
}
