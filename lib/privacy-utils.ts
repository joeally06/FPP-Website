/**
 * Privacy Utilities
 * 
 * GDPR-compliant utilities for handling PII (Personally Identifiable Information)
 * in logs and analytics to protect user privacy.
 */

import { createHash } from 'crypto';

/**
 * Hash an email address using SHA-256
 * Used for logging without exposing actual email addresses
 * 
 * @param email - Email address to hash
 * @returns SHA-256 hash (first 16 characters for readability)
 */
export function hashEmail(email: string): string {
  if (!email) return 'unknown';
  
  const hash = createHash('sha256')
    .update(email.toLowerCase().trim())
    .digest('hex');
  
  // Return first 16 characters for logs (still unique, more readable)
  return hash.substring(0, 16);
}

/**
 * Anonymize an IP address by masking the last octet
 * Used for GDPR compliance when storing IP addresses
 * 
 * @param ip - IP address to anonymize
 * @returns Anonymized IP (e.g., 192.168.1.xxx)
 */
export function anonymizeIP(ip: string): string {
  if (!ip || ip === 'unknown') return 'unknown';
  
  // IPv4
  if (ip.includes('.')) {
    const parts = ip.split('.');
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.${parts[2]}.xxx`;
    }
  }
  
  // IPv6 - mask last 80 bits (keep first 48 bits for network prefix)
  if (ip.includes(':')) {
    const parts = ip.split(':');
    if (parts.length >= 3) {
      return `${parts.slice(0, 3).join(':')}:xxxx:xxxx:xxxx:xxxx`;
    }
  }
  
  return 'unknown';
}

/**
 * Redact sensitive data from objects for logging
 * Replaces email and IP fields with hashed/anonymized versions
 * 
 * @param data - Object containing potentially sensitive data
 * @returns Object with sensitive fields redacted
 */
export function redactSensitiveData(data: Record<string, any>): Record<string, any> {
  const redacted = { ...data };
  
  // Hash email fields
  if (redacted.email) {
    redacted.emailHash = hashEmail(redacted.email);
    delete redacted.email;
  }
  
  // Anonymize IP fields
  if (redacted.ip) {
    redacted.ip = anonymizeIP(redacted.ip);
  }
  
  if (redacted.requester_ip) {
    redacted.requester_ip = anonymizeIP(redacted.requester_ip);
  }
  
  return redacted;
}

/**
 * Create a privacy-safe user identifier for logs
 * Combines hashed email with provider for tracking without PII
 * 
 * @param email - User email
 * @param provider - Auth provider (google, facebook, etc.)
 * @returns Safe identifier (e.g., "a3f7b2c8e1d4f9a2@google")
 */
export function createSafeUserId(email: string, provider?: string): string {
  const hash = hashEmail(email);
  return provider ? `${hash}@${provider}` : hash;
}
