#!/usr/bin/env node
const assert = (cond, message) => { if (!cond) { console.error('[SECURITY CHECK] FAILED:', message); process.exit(2); } };

console.log('[SECURITY CHECK] Running environment checks...');

const env = process.env;

// If CI or non-production, we'll fail only on high-severity items
const isProd = env.NODE_ENV === 'production';
const isCI = env.GITHUB_ACTIONS === 'true';
const isStrictProd = isProd && !isCI;

// Required in strict production (not CI)
if (isStrictProd) {
  assert(env.NEXTAUTH_SECRET && env.NEXTAUTH_SECRET.length >= 32, 'NEXTAUTH_SECRET must be set and at least 32 characters in production');
  assert(env.NEXTAUTH_URL && env.NEXTAUTH_URL.startsWith('https://'), 'NEXTAUTH_URL should be HTTPS in production');
} else if (isProd && isCI) {
  // In CI, warn if NEXTAUTH_SECRET or NEXTAUTH_URL are missing/weak, but do not fail the pipeline
  if (!env.NEXTAUTH_SECRET || env.NEXTAUTH_SECRET.length < 32) {
    console.warn('[SECURITY CHECK] Warning: NEXTAUTH_SECRET is missing or weak in CI (use 32+ char secret for production)');
  }
  if (!env.NEXTAUTH_URL || !env.NEXTAUTH_URL.startsWith('https://')) {
    console.warn('[SECURITY CHECK] Warning: NEXTAUTH_URL is not HTTPS; ensure production URL is HTTPS');
  }
}

// Always recommended
if (!env.SMTP_HOST || !env.SMTP_PORT) {
  console.warn('[SECURITY CHECK] Warning: SMTP_HOST/SMTP_PORT are not set. Email delivery may fail.');
}

// Log OK and exit
console.log('[SECURITY CHECK] OK');
process.exit(0);
