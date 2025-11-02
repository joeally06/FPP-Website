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
    
    // Check for uncommitted changes
    const { stdout } = await execAsync('git status --porcelain');
    if (stdout.trim()) {
      return { 
        valid: false, 
        error: 'Uncommitted changes detected. Please commit or stash changes first.' 
      };
    }
    
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
      timeout: 300000, // 5 minute timeout
      env: { ...process.env, CI: 'true' }, // Prevent interactive prompts
    });
    
    console.log('[Update] Update completed successfully');
    console.log('[Update] Output:', stdout);
    
    if (stderr) {
      console.warn('[Update] Warnings:', stderr);
    }
    
    return NextResponse.json({
      success: true,
      message: 'Update completed successfully! The server will restart shortly.',
      output: stdout,
      warnings: stderr || null,
      timestamp: new Date().toISOString(),
    });
    
  } catch (error: any) {
    console.error('[Update] Update failed:', error);
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
