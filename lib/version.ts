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
  patch: 0,
  prerelease: 'rc.1', // Release Candidate 1
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
