/**
 * Version Management System
 * Follows Semantic Versioning (SemVer): MAJOR.MINOR.PATCH
 * 
 * MAJOR: Breaking changes that require manual intervention
 * MINOR: New features (backward compatible)
 * PATCH: Bug fixes (backward compatible)
 * PRERELEASE: Release candidates (rc.1, rc.2, etc.)
 */

export const APP_VERSION = {
  major: 1,
  minor: 0,
  patch: 1,
  prerelease: 'rc.2', // Release Candidate 2
  build: null as string | null, // Git commit hash
};

export function getVersion(): string {
  const { major, minor, patch, prerelease, build } = APP_VERSION;
  
  let version = `${major}.${minor}.${patch}`;
  
  if (prerelease) {
    version += `-${prerelease}`;
  }
  
  if (build) {
    version += `+${build}`;
  }
  
  return version;
}

export function getVersionWithBuild(commitHash?: string): string {
  APP_VERSION.build = commitHash || null;
  return getVersion();
}

export function getVersionInfo() {
  return {
    version: getVersion(),
    major: APP_VERSION.major,
    minor: APP_VERSION.minor,
    patch: APP_VERSION.patch,
    prerelease: APP_VERSION.prerelease,
    build: APP_VERSION.build,
  };
}

// Version history and changelog
export const VERSION_HISTORY = [
  {
    version: '1.0.1-rc.2',
    date: '2025-11-09',
    name: 'Performance & Architecture Release',
    changes: [
      'FPP state caching system - Backend polling eliminates redundant frontend requests',
      'Database normalization - Unified sequences table with foreign key constraints',
      'Spotify integration - "Listen on Spotify" links in jukebox Now Playing',
      'Auto-refresh Spotify URLs - Metadata updates on Media Library changes',
      'Bulk URL refresh button in Media Library',
      'PM2 dual-process architecture (Next.js + FPP poller)',
      'Stale data indicators in jukebox UI (30s threshold)',
      'Health monitoring view for FPP polling service',
      'Exponential backoff on FPP connection failures',
      'Zero-data-loss migrations with comprehensive validation',
      'Sub-millisecond cached status API responses',
      'Prepared statements for all FPP operations',
    ],
  },
  {
    version: '1.0.0-rc.1',
    date: '2025-11-05',
    name: 'Initial Release Candidate',
    changes: [
      'Complete jukebox system with FPP integration',
      'Admin dashboard with real-time monitoring',
      'Device health monitoring with email alerts',
      'Santa letter system with AI-powered responses (Ollama)',
      'Cookie consent banner (GDPR/CCPA compliant)',
      'Comprehensive privacy policy page',
      'Secure Google OAuth authentication',
      'Real-time update system with status tracking',
      'Automated database maintenance (daily/weekly)',
      'Theme customization system',
      'Models library with import/export',
      'Cloudflare Tunnel support for public HTTPS',
      'Rate limiting on all public endpoints',
      'Session-based admin authentication',
      'Security hardening (CSRF, XSS, SQL injection prevention)',
    ],
  },
];
