import { NextResponse } from 'next/server';
import { getVersion, getVersionInfo, VERSION_HISTORY } from '@/lib/version';
import { execSync } from 'child_process';

export async function GET() {
  const versionInfo = getVersionInfo();
  
  // Try to get current git commit hash
  let buildHash = versionInfo.build;
  if (!buildHash) {
    try {
      buildHash = execSync('git rev-parse --short HEAD').toString().trim();
    } catch (error) {
      buildHash = null;
    }
  }

  return NextResponse.json({
    version: getVersion(),
    major: versionInfo.major,
    minor: versionInfo.minor,
    patch: versionInfo.patch,
    prerelease: versionInfo.prerelease,
    build: buildHash,
    history: VERSION_HISTORY,
    project: 'FPP Control Center',
    description: 'Control center for Falcon Player (FPP) light shows',
  });
}
