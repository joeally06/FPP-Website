#!/usr/bin/env node

const { execSync } = require('child_process');

console.log('🔍 Checking system dependencies...\n');

const dependencies = {
  required: [
    {
      name: 'Node.js',
      command: 'node --version',
      minVersion: '18.0.0',
      installUrl: 'https://nodejs.org/'
    },
    {
      name: 'npm',
      command: 'npm --version',
      minVersion: '8.0.0',
      installUrl: 'https://nodejs.org/'
    },
    {
      name: 'Git',
      command: 'git --version',
      installUrl: 'https://git-scm.com/'
    }
  ],
  optional: [
    {
      name: 'Ollama',
      command: 'ollama --version',
      feature: 'AI-powered Santa letters',
      installUrl: 'https://ollama.ai/'
    }
  ]
};

let hasErrors = false;
let hasWarnings = false;

// Check required dependencies
console.log('📋 Required Dependencies:');
for (const dep of dependencies.required) {
  try {
    const output = execSync(dep.command, { encoding: 'utf8', stdio: 'pipe' });
    
    if (dep.minVersion) {
      const version = output.match(/\d+\.\d+\.\d+/)?.[0];
      if (version && compareVersions(version, dep.minVersion) < 0) {
        console.log(`❌ ${dep.name}: ${version} (requires ${dep.minVersion}+)`);
        console.log(`   Install from: ${dep.installUrl}\n`);
        hasErrors = true;
      } else {
        console.log(`✅ ${dep.name}: ${version || output.trim()}`);
      }
    } else {
      console.log(`✅ ${dep.name}: Installed`);
    }
  } catch (error) {
    console.log(`❌ ${dep.name}: Not found`);
    console.log(`   Install from: ${dep.installUrl}\n`);
    hasErrors = true;
  }
}

console.log('\n📋 Optional Dependencies:');
for (const dep of dependencies.optional) {
  try {
    const output = execSync(dep.command, { encoding: 'utf8', stdio: 'pipe' });
    console.log(`✅ ${dep.name}: Installed (enables ${dep.feature})`);
  } catch (error) {
    console.log(`⚠️  ${dep.name}: Not found (optional - for ${dep.feature})`);
    console.log(`   Install from: ${dep.installUrl}`);
    hasWarnings = true;
  }
}

console.log('');

if (hasErrors) {
  console.log('❌ Missing required dependencies. Please install them and try again.\n');
  process.exit(1);
}

if (hasWarnings) {
  console.log('⚠️  Some optional features will be unavailable without the dependencies above.\n');
}

console.log('✅ All required dependencies are installed!\n');

function compareVersions(v1, v2) {
  const parts1 = v1.split('.').map(Number);
  const parts2 = v2.split('.').map(Number);
  
  for (let i = 0; i < 3; i++) {
    if (parts1[i] > parts2[i]) return 1;
    if (parts1[i] < parts2[i]) return -1;
  }
  return 0;
}
