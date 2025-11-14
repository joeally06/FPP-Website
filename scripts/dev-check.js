#!/usr/bin/env node
const { spawn } = require('child_process');

const current = process.env.NODE_ENV || '<not set>';
if (current !== 'development' && current !== 'test' && current !== 'production') {
  console.warn('\x1b[33m%s\x1b[0m', `⚠ NODE_ENV is set to a non-standard value: '${current}'. Overriding to 'development' for this dev session.`);
} else if (current !== 'development') {
  // If it's set to production we still warn (common case)
  console.warn('\x1b[33m%s\x1b[0m', `⚠ NODE_ENV is currently '${current}'. For dev runs it should be 'development'. Overriding for this session.`);
}

// Force dev env for next dev
process.env.NODE_ENV = 'development';

// Spawn the next dev process using npm to ensure cross-platform binary resolution
const cp = spawn(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'dev-unsafe'], {
  stdio: 'inherit',
  env: process.env,
  shell: false
});

cp.on('exit', (code) => {
  process.exit(code);
});
