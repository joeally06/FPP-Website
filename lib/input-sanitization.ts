// Input Validation and Sanitization for Santa Letters
// Protects against XSS, SQL Injection, Prompt Injection, and other attacks

import validator from 'validator';
import DOMPurify from 'isomorphic-dompurify';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  sanitized?: {
    childName: string;
    childAge: number | null;
    parentEmail: string;
    letterContent: string;
  };
}

/**
 * Validates and sanitizes all inputs for Santa letter submission
 * @param childName - Child's name
 * @param childAge - Child's age (can be null)
 * @param parentEmail - Parent's email address
 * @param letterContent - The letter content
 * @returns ValidationResult with errors or sanitized data
 */
export function validateAndSanitizeSantaLetter(
  childName: string,
  childAge: number | null,
  parentEmail: string,
  letterContent: string
): ValidationResult {
  const errors: string[] = [];

  // 1. Child Name Validation and Sanitization
  const sanitizedName = DOMPurify.sanitize(childName.trim(), {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  });

  if (!sanitizedName || sanitizedName.length < 2) {
    errors.push('Child name must be at least 2 characters');
  }
  if (sanitizedName.length > 50) {
    errors.push('Child name must be less than 50 characters');
  }

  // Block suspicious patterns in name
  if (/[<>{}[\]\\]|script|javascript|onclick|onerror/i.test(sanitizedName)) {
    errors.push('Child name contains invalid characters');
  }

  // Block excessive special characters
  const nameSpecialChars = (sanitizedName.match(/[^a-zA-Z\s'-]/g) || []).length;
  if (nameSpecialChars > 3) {
    errors.push('Child name contains too many special characters');
  }

  // 2. Age Validation
  let sanitizedAge: number | null = null;
  if (childAge !== null && childAge !== undefined) {
    const age = Number(childAge);
    if (isNaN(age) || age < 1 || age > 18) {
      errors.push('Age must be between 1 and 18');
    } else {
      sanitizedAge = Math.floor(age); // Ensure integer
    }
  }

  // 3. Email Validation and Sanitization
  const trimmedEmail = parentEmail.trim();
  const sanitizedEmail = validator.normalizeEmail(trimmedEmail, {
    all_lowercase: true,
    gmail_remove_dots: false,
  }) || '';

  if (!validator.isEmail(sanitizedEmail)) {
    errors.push('Invalid email address');
  }

  // Block email header injection attempts
  if (/[\r\n]/.test(trimmedEmail)) {
    errors.push('Email contains invalid characters');
  }

  // Block suspicious email patterns
  if (/[<>{}[\]\\]/.test(trimmedEmail)) {
    errors.push('Email contains prohibited characters');
  }

  // 4. Letter Content Validation and Sanitization
  // SECURITY: Normalize Unicode to detect homoglyph attacks (e.g., Cyrillic 'а' vs Latin 'a')
  const normalizedLetter = letterContent.trim().normalize('NFKC');
  const sanitizedLetter = DOMPurify.sanitize(normalizedLetter, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  });

  if (!sanitizedLetter || sanitizedLetter.length < 10) {
    errors.push('Letter must be at least 10 characters');
  }
  if (sanitizedLetter.length > 2000) {
    errors.push('Letter must be less than 2000 characters');
  }
  
  // SECURITY: Detect excessive non-Latin characters (potential encoding attacks)
  const nonLatinChars = (sanitizedLetter.match(/[^\u0000-\u007F\u0080-\u00FF\u0100-\u017F]/g) || []).length;
  const nonLatinRatio = nonLatinChars / sanitizedLetter.length;
  if (nonLatinRatio > 0.7 && sanitizedLetter.length > 50) {
    errors.push('Letter contains excessive non-Latin characters');
  }

  // 5. Detect Prompt Injection Attempts
  const promptInjectionPatterns = [
    // English patterns
    /ignore\s+(previous|all|earlier|prior)\s+(instructions|prompts|commands)/i,
    /you\s+are\s+now/i,
    /system\s+prompt/i,
    /pretend\s+(you|to)\s+(are|be)/i,
    /forget\s+(everything|all|your|previous)/i,
    /new\s+instructions?:/i,
    /act\s+as\s+(if|a|an)/i,
    /roleplay/i,
    /disregard\s+(previous|all|above)/i,
    /override\s+(your|the)\s+(instructions|settings)/i,
    /bypass\s+(your|the)\s+(instructions|rules|settings)/i,
    /skip\s+(previous|all|above)/i,
    /jailbreak/i,
    /admin\s+mode/i,
    /developer\s+mode/i,
    /god\s+mode/i,
    /root\s+access/i,
    /sudo\s+mode/i,
    
    // Common instruction markers
    /\[INST\]/i,
    /<\|.*?\|>/,
    /```.*?(ignore|bypass|override)/i,
    /<system>/i,
    /<\/system>/i,
    
    // Multilingual prompt injection attempts
    // Spanish
    /ignora\s+(las\s+)?instrucciones/i,
    /olvidate\s+de\s+todo/i,
    // French
    /ignore\s+les\s+instructions/i,
    /oublie\s+tout/i,
    // German
    /ignoriere\s+(die\s+)?anweisungen/i,
    /vergiss\s+alles/i,
    // Portuguese
    /ignore\s+as\s+instruções/i,
    /esqueça\s+tudo/i,
    // Italian
    /ignora\s+le\s+istruzioni/i,
    /dimentica\s+tutto/i,
    // Chinese (Simplified)
    /忽略.*指令/,
    /忘记.*指示/,
    /新.*指令/,
    // Russian
    /игнорируй.*инструкции/i,
    /забудь.*всё/i,
    // Japanese
    /指示.*無視/,
    /忘れ.*すべて/,
    // Korean
    /지시.*무시/,
    /모든.*잊어/,
    
    // Emotion manipulation attempts
    /if\s+you\s+don'?t\s+do\s+this/i,
    /or\s+else/i,
    /you\s+must\s+do/i,
    /i\s+command\s+you/i,
  ];

  for (const pattern of promptInjectionPatterns) {
    if (pattern.test(sanitizedLetter)) {
      errors.push('Letter content contains prohibited phrases');
      break;
    }
  }

  // 6. Check for excessive special characters (potential obfuscation)
  const specialCharCount = (sanitizedLetter.match(/[^a-zA-Z0-9\s.,!?'-]/g) || []).length;
  const specialCharRatio = specialCharCount / sanitizedLetter.length;
  
  if (specialCharRatio > 0.2) {
    errors.push('Letter contains too many special characters');
  }

  // 7. Check for repeated characters (potential spam/bot)
  const repeatedPattern = /(.)\1{20,}/; // Same character repeated 20+ times
  if (repeatedPattern.test(sanitizedLetter)) {
    errors.push('Letter contains suspicious repeated patterns');
  }

  // 8. Check for excessive URLs or email addresses (spam indicators)
  const urlPattern = /(https?:\/\/|www\.)/gi;
  const emailPattern = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi;
  const urlCount = (sanitizedLetter.match(urlPattern) || []).length;
  const emailCount = (sanitizedLetter.match(emailPattern) || []).length;

  if (urlCount > 1 || emailCount > 1) {
    errors.push('Letter contains too many URLs or email addresses');
  }

  // 9. Additional security checks
  // Block SQL injection attempts
  const sqlPatterns = [
    /(\bselect\b|\binsert\b|\bupdate\b|\bdelete\b|\bdrop\b|\bunion\b).*(\bfrom\b|\binto\b|\bwhere\b)/i,
    /--\s*$/,
    /[';].*or.*[=1]/i,
  ];

  for (const pattern of sqlPatterns) {
    if (pattern.test(sanitizedLetter) || pattern.test(sanitizedName)) {
      errors.push('Input contains prohibited patterns');
      break;
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitized: errors.length === 0 ? {
      childName: sanitizedName,
      childAge: sanitizedAge,
      parentEmail: sanitizedEmail,
      letterContent: sanitizedLetter,
    } : undefined,
  };
}

/**
 * Additional helper: Escape HTML for safe display
 * @param text - Text to escape
 * @returns HTML-escaped text
 */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Additional helper: Validate IP address format
 * @param ip - IP address string
 * @returns true if valid IPv4 or IPv6
 */
export function isValidIP(ip: string): boolean {
  return validator.isIP(ip, 4) || validator.isIP(ip, 6);
}
