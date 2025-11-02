import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-helpers';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function GET() {
  try {
    // Require admin authentication
    await requireAdmin();
    
    console.log('[Update Check] Checking for updates...');
    
    // Get current version (local commit)
    const { stdout: localCommit } = await execAsync('git rev-parse HEAD');
    const currentVersion = localCommit.trim().substring(0, 7);
    
    // Get current branch
    const { stdout: branch } = await execAsync('git rev-parse --abbrev-ref HEAD');
    const currentBranch = branch.trim();
    
    // Fetch latest from GitHub (doesn't modify local files)
    console.log('[Update Check] Fetching from GitHub...');
    await execAsync('git fetch origin --quiet');
    
    // Get remote version
    const { stdout: remoteCommit } = await execAsync(`git rev-parse origin/${currentBranch}`);
    const latestVersion = remoteCommit.trim().substring(0, 7);
    
    // Check if update available
    const updateAvailable = currentVersion !== latestVersion;
    
    // Get changelog if update available
    let changelog: string[] = [];
    if (updateAvailable) {
      const { stdout: logOutput } = await execAsync(
        `git log HEAD..origin/${currentBranch} --oneline --max-count=10`
      );
      changelog = logOutput.trim().split('\n').filter(Boolean);
    }
    
    console.log('[Update Check] Update available:', updateAvailable);
    console.log('[Update Check] Current:', currentVersion, 'Latest:', latestVersion);
    
    return NextResponse.json({
      updateAvailable,
      currentVersion,
      latestVersion,
      currentBranch,
      changelog,
      lastChecked: new Date().toISOString(),
    });
    
  } catch (error: any) {
    console.error('[Update Check] Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to check for updates', 
        details: error.message,
        stderr: error.stderr || null,
      },
      { status: 500 }
    );
  }
}
