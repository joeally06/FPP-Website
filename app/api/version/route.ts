import { NextResponse } from 'next/server';
import { VERSION_HISTORY } from '@/lib/version';
import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

export async function GET() {
  // Read version from package.json (source of truth after updates)
  let version = '1.0.0';
  let major = 1;
  let minor = 0;
  let patch = 0;
  let prerelease: string | undefined = undefined;

  try {
    const packagePath = path.join(process.cwd(), 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf-8'));
    version = packageJson.version;
    
    // Parse version string (e.g., "1.3.1" or "1.0.0-rc.1")
    const versionMatch = version.match(/^(\d+)\.(\d+)\.(\d+)(?:-(.+))?$/);
    if (versionMatch) {
      major = parseInt(versionMatch[1]);
      minor = parseInt(versionMatch[2]);
      patch = parseInt(versionMatch[3]);
      prerelease = versionMatch[4];
    }
  } catch (error) {
    console.error('[Version API] Failed to read package.json:', error);
  }
  
  // Try to get current git commit hash
  let buildHash: string | null = null;
  try {
    buildHash = execSync('git rev-parse --short HEAD').toString().trim();
  } catch (error) {
    // Not in a git repository or git not available
  }

  return NextResponse.json({
    version,
    major,
    minor,
    patch,
    prerelease,
    build: buildHash,
    history: VERSION_HISTORY,
    project: 'FPP Control Center',
    description: 'Control center for Falcon Player (FPP) light shows',
  });
}
