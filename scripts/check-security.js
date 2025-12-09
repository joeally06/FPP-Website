#!/usr/bin/env node
const assert = (cond, message) => { if (!cond) { console.error('[SECURITY CHECK] FAILED:', message); process.exit(2); } };

console.log('[SECURITY CHECK] Running environment checks...');

const env = process.env;

// If CI or non-production, we'll fail only on high-severity items
const isProd = env.NODE_ENV === 'production';
const isCI = env.GITHUB_ACTIONS === 'true';
const isStrictProd = isProd && !isCI;

/**
 * Validates NEXTAUTH_SECRET entropy and strength
 * @param {string} secret - The secret to validate
 * @returns {object} { valid: boolean, reason: string }
 */
function validateSecretEntropy(secret) {
  if (!secret || secret.length < 32) {
    return { valid: false, reason: 'Secret must be at least 32 characters' };
  }

  // Allow pure hex secrets (from openssl rand -hex 32) - they're cryptographically secure
  const isValidHex = /^[a-f0-9]{64,}$/i.test(secret);
  if (isValidHex) {
    return { valid: true, reason: 'Secret is valid (hex-encoded)' };
  }

  // Allow base64 secrets (from openssl rand -base64 32) - they're cryptographically secure
  const isValidBase64 = /^[A-Za-z0-9+/]{43,}={0,2}$/.test(secret);
  if (isValidBase64) {
    return { valid: true, reason: 'Secret is valid (base64-encoded)' };
  }

  // For other secrets, check for entropy - require multiple character classes
  const hasUppercase = /[A-Z]/.test(secret);
  const hasLowercase = /[a-z]/.test(secret);
  const hasNumbers = /[0-9]/.test(secret);
  const hasSpecialChars = /[^A-Za-z0-9]/.test(secret);

  const characterClasses = [hasUppercase, hasLowercase, hasNumbers, hasSpecialChars].filter(Boolean).length;

  if (characterClasses < 3) {
    return { 
      valid: false, 
      reason: 'Secret must contain at least 3 of: uppercase, lowercase, numbers, special characters' 
    };
  }

  // Check for obvious weak patterns
  const weakPatterns = [
    /^(.)\1+$/, // All same character
    /^(abc|123|password|secret|admin|test)/i, // Common weak prefixes
  ];

  for (const pattern of weakPatterns) {
    if (pattern.test(secret)) {
      return { valid: false, reason: 'Secret contains weak patterns (e.g., repetitive, dictionary words)' };
    }
  }

  return { valid: true, reason: 'Secret is strong' };
}

// Required in strict production (not CI)
if (isStrictProd) {
  assert(env.NEXTAUTH_SECRET && env.NEXTAUTH_SECRET.length >= 32, 'NEXTAUTH_SECRET must be set and at least 32 characters in production');
  
  const secretValidation = validateSecretEntropy(env.NEXTAUTH_SECRET);
  assert(secretValidation.valid, `NEXTAUTH_SECRET is weak: ${secretValidation.reason}. Generate a strong secret with: openssl rand -base64 32`);
  
  assert(env.NEXTAUTH_URL && env.NEXTAUTH_URL.startsWith('https://'), 'NEXTAUTH_URL should be HTTPS in production');
} else if (isProd && isCI) {
  // In CI, warn if NEXTAUTH_SECRET or NEXTAUTH_URL are missing/weak, but do not fail the pipeline
  if (env.NEXTAUTH_SECRET) {
    const secretValidation = validateSecretEntropy(env.NEXTAUTH_SECRET);
    if (!secretValidation.valid) {
      console.warn(`[SECURITY CHECK] Warning: NEXTAUTH_SECRET is weak in CI: ${secretValidation.reason}`);
      console.warn('[SECURITY CHECK] Generate a strong secret with: openssl rand -base64 32');
    }
  } else {
    console.warn('[SECURITY CHECK] Warning: NEXTAUTH_SECRET is missing in CI (use 32+ char secret for production)');
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
