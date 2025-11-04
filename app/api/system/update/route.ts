import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-helpers';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const execAsync = promisify(exec);

// Validate update prerequisites
async function validateUpdateRequest(): Promise<{ valid: boolean; error?: string }> {
  try {
    // Check if git repo exists
    const gitDir = path.join(process.cwd(), '.git');
    if (!fs.existsSync(gitDir)) {
      return { valid: false, error: 'Not a Git repository' };
    }
    
    // Note: update.sh handles uncommitted changes via git stash, so we don't need to check here
    
    return { valid: true };
  } catch (error: any) {
    return { valid: false, error: error.message };
  }
}

export async function POST() {
  try {
    // Require admin authentication
    await requireAdmin();
    
    console.log('[Update] Starting update process...');
    
    // Validate prerequisites
    const validation = await validateUpdateRequest();
    if (!validation.valid) {
      console.error('[Update] Validation failed:', validation.error);
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 }
      );
    }
    
    // Check if update.sh exists
    const updateScriptPath = path.join(process.cwd(), 'update.sh');
    if (!fs.existsSync(updateScriptPath)) {
      return NextResponse.json(
        { success: false, error: 'update.sh script not found' },
        { status: 404 }
      );
    }
    
    // Make update.sh executable
    await execAsync(`chmod +x ${updateScriptPath}`);
    
    // Run the update script with silent flag
    console.log('[Update] Executing update.sh...');
    const { stdout, stderr } = await execAsync('bash ./update.sh --silent', {
      cwd: process.cwd(),
      timeout: 600000, // 10 minute timeout (increased for slower connections)
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer for output
      env: { ...process.env, CI: 'true' }, // Prevent interactive prompts
    });
    
    console.log('[Update] Update script completed');
    console.log('[Update] Output:', stdout);
    
    if (stderr) {
      console.warn('[Update] Warnings:', stderr);
    }
    
    // Check if update was successful
    const alreadyUpToDate = stdout.includes('Already up to date');
    const updateComplete = stdout.includes('Update complete') || stdout.includes('Server restarted successfully');
    const noUpdates = stdout.includes('No updates available');
    
    if (alreadyUpToDate || noUpdates) {
      return NextResponse.json({
        success: true,
        message: 'System is already up to date',
        updated: false,
        output: stdout,
        timestamp: new Date().toISOString(),
      });
    }
    
    if (updateComplete) {
      return NextResponse.json({
        success: true,
        message: 'Update completed successfully! The application has been restarted.',
        updated: true,
        output: stdout,
        requiresReload: true,
        timestamp: new Date().toISOString(),
      });
    }
    
    return NextResponse.json({
      success: true,
      message: 'Update script executed',
      output: stdout,
      warnings: stderr || null,
      timestamp: new Date().toISOString(),
    });
    
  } catch (error: any) {
    console.error('[Update] Update failed:', error);
    
    // Check if it's a timeout
    if (error.killed && error.signal === 'SIGTERM') {
      return NextResponse.json(
        { 
          success: false,
          error: 'Update timeout - process took too long',
          details: 'The update may still be running. Check server logs with: pm2 logs fpp-control'
        },
        { status: 504 }
      );
    }
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Update failed', 
        details: error.message,
        output: error.stdout || null,
        stderr: error.stderr || null,
      },
      { status: 500 }
    );
  }
}
