import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json();

    if (action === 'check') {
      // Safe: Just check for updates (no DB access)
      try {
        await execAsync('git fetch origin', { cwd: process.cwd() });
        const { stdout: localHash } = await execAsync('git rev-parse HEAD');
        const { stdout: remoteHash } = await execAsync('git rev-parse origin/master');
        const hasUpdates = localHash.trim() !== remoteHash.trim();

        if (hasUpdates) {
          const { stdout: commits } = await execAsync(
            'git log HEAD..origin/master --oneline --no-decorate',
            { cwd: process.cwd() }
          );

          return NextResponse.json({
            success: true,
            hasUpdates: true,
            commits: commits.trim().split('\n').slice(0, 5),
          });
        }

        return NextResponse.json({
          success: true,
          hasUpdates: false,
        });
      } catch (error: any) {
        return NextResponse.json({
          success: false,
          error: error.message,
        });
      }
    }

    if (action === 'trigger') {
      // Create signal file for update script to detect
      // This is SAFE - just creates a flag file
      const signalFile = path.join(process.cwd(), '.update-requested');
      
      await fs.writeFile(signalFile, JSON.stringify({
        requestedAt: new Date().toISOString(),
        requestedBy: 'ui',
      }));

      return NextResponse.json({
        success: true,
        message: 'Update will begin in ~30 seconds. Server will restart automatically.',
      });
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('Update error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
