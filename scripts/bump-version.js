#!/usr/bin/env node

/**
 * Version Bump Script
 * Usage: node scripts/bump-version.js [major|minor|patch|prerelease|release]
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const versionFile = path.join(__dirname, '../lib/version.ts');
const packageFile = path.join(__dirname, '../package.json');

const args = process.argv.slice(2);
const bumpType = args[0] || 'patch'; // major, minor, patch, prerelease, release

if (!['major', 'minor', 'patch', 'prerelease', 'release'].includes(bumpType)) {
  console.error('❌ Invalid bump type. Use: major, minor, patch, prerelease, or release');
  process.exit(1);
}

console.log('📦 FPP Control Center - Version Bump Tool');
console.log('==========================================\n');

// Read current version
const versionContent = fs.readFileSync(versionFile, 'utf-8');
const packageContent = JSON.parse(fs.readFileSync(packageFile, 'utf-8'));

// Extract current version numbers
const majorMatch = versionContent.match(/major:\s*(\d+)/);
const minorMatch = versionContent.match(/minor:\s*(\d+)/);
const patchMatch = versionContent.match(/patch:\s*(\d+)/);
const prereleaseMatch = versionContent.match(/prerelease:\s*'([^']+)'/);

let major = parseInt(majorMatch[1]);
let minor = parseInt(minorMatch[1]);
let patch = parseInt(patchMatch[1]);
let prerelease = prereleaseMatch ? prereleaseMatch[1] : null;

// Save old version for display
const oldVersion = prerelease 
  ? `${major}.${minor}.${patch}-${prerelease}`
  : `${major}.${minor}.${patch}`;

// Bump version based on type
switch (bumpType) {
  case 'major':
    major++;
    minor = 0;
    patch = 0;
    prerelease = null;
    console.log('🚀 MAJOR version bump - Breaking changes');
    break;
  case 'minor':
    minor++;
    patch = 0;
    prerelease = null;
    console.log('✨ MINOR version bump - New features');
    break;
  case 'patch':
    patch++;
    prerelease = null;
    console.log('🐛 PATCH version bump - Bug fixes');
    break;
  case 'prerelease':
    if (prerelease) {
      const rcMatch = prerelease.match(/rc\.(\d+)/);
      if (rcMatch) {
        const rcNum = parseInt(rcMatch[1]) + 1;
        prerelease = `rc.${rcNum}`;
      } else {
        prerelease = 'rc.1';
      }
    } else {
      prerelease = 'rc.1';
    }
    console.log('🧪 PRERELEASE version bump - Release candidate');
    break;
  case 'release':
    prerelease = null;
    console.log('🎉 RELEASE - Removing prerelease tag');
    break;
}

// Format new version
const newVersion = prerelease 
  ? `${major}.${minor}.${patch}-${prerelease}`
  : `${major}.${minor}.${patch}`;

console.log(`\n   Old version: ${oldVersion}`);
console.log(`   New version: ${newVersion}\n`);

// Update version.ts
let newVersionContent = versionContent
  .replace(/major:\s*\d+/, `major: ${major}`)
  .replace(/minor:\s*\d+/, `minor: ${minor}`)
  .replace(/patch:\s*\d+/, `patch: ${patch}`);

if (prerelease) {
  newVersionContent = newVersionContent.replace(
    /prerelease:\s*'[^']*'|prerelease:\s*null/,
    `prerelease: '${prerelease}'`
  );
} else {
  newVersionContent = newVersionContent.replace(
    /prerelease:\s*'[^']*'|prerelease:\s*null/,
    `prerelease: null`
  );
}

// Update package.json
packageContent.version = newVersion;

// Write files
fs.writeFileSync(versionFile, newVersionContent);
fs.writeFileSync(packageFile, JSON.stringify(packageContent, null, 2) + '\n');

// Get git commit hash
let commitHash = 'unknown';
try {
  commitHash = execSync('git rev-parse --short HEAD').toString().trim();
  console.log(`📝 Current build: ${commitHash}`);
} catch (error) {
  console.log('⚠️  Not in a git repository');
}

console.log('\n✅ Version bumped successfully!\n');
console.log('Next steps:');
console.log('  1. Review changes: git diff');
console.log('  2. Update CHANGELOG.md with changes');
console.log(`  3. Commit: git add . && git commit -m "chore: bump version to ${newVersion}"`);
console.log(`  4. Tag: git tag v${newVersion}`);
console.log('  5. Push: git push origin master --tags\n');
