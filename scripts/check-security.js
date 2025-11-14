#!/usr/bin/env node
const assert = (cond, message) => { if (!cond) { console.error('[SECURITY CHECK] FAILED:', message); process.exit(2); } };

console.log('[SECURITY CHECK] Running environment checks...');

const env = process.env;

// If CI or non-production, we'll fail only on high-severity items
const isProd = env.NODE_ENV === 'production' || env.GITHUB_ACTIONS === 'true';

// Required in production
if (isProd) {
  assert(env.NEXTAUTH_SECRET && env.NEXTAUTH_SECRET.length >= 32, 'NEXTAUTH_SECRET must be set and at least 32 characters in production');
  assert(env.NEXTAUTH_URL && env.NEXTAUTH_URL.startsWith('https://'), 'NEXTAUTH_URL should be HTTPS in production');
}

// Always recommended
if (!env.SMTP_HOST || !env.SMTP_PORT) {
  console.warn('[SECURITY CHECK] Warning: SMTP_HOST/SMTP_PORT are not set. Email delivery may fail.');
}

// Log OK and exit
console.log('[SECURITY CHECK] OK');
process.exit(0);
