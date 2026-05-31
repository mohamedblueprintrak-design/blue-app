/**
 * Password Management Module
 * وحدة إدارة كلمات المرور
 * 
 * Handles password hashing, verification, and validation
 */

import { hash, compare } from 'bcryptjs';
import { randomInt, createHash } from 'crypto';

// ============================================
// Configuration
// ============================================

const PASSWORD_CONFIG = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSpecialChar: true,
  bcryptRounds: 12,
};

// ============================================
// Types
// ============================================

export interface PasswordValidationResult {
  valid: boolean;
  errors: string[];
  strength: 'weak' | 'medium' | 'strong' | 'very-strong';
}

// ============================================
// Password Hashing
// ============================================

/**
 * Hash a password using bcrypt
 * Uses the configured number of rounds (default: 12)
 */
export async function hashPassword(password: string): Promise<string> {
  return hash(password, PASSWORD_CONFIG.bcryptRounds);
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(
  password: string, 
  hashedPassword: string
): Promise<boolean> {
  return compare(password, hashedPassword);
}

// ============================================
// Password Validation
// ============================================

/**
 * Validate password strength
 * Checks against configured requirements
 */
export function validatePasswordStrength(password: string): PasswordValidationResult {
  const errors: string[] = [];
  const checks = {
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
    special: false,
  };
  
  // Length check
  if (password.length >= PASSWORD_CONFIG.minLength) {
    checks.length = true;
  } else {
    errors.push(`Password must be at least ${PASSWORD_CONFIG.minLength} characters long`);
  }
  
  // Uppercase check
  if (/[A-Z]/.test(password)) {
    checks.uppercase = true;
  } else if (PASSWORD_CONFIG.requireUppercase) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  // Lowercase check
  if (/[a-z]/.test(password)) {
    checks.lowercase = true;
  } else if (PASSWORD_CONFIG.requireLowercase) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  // Number check
  if (/[0-9]/.test(password)) {
    checks.number = true;
  } else if (PASSWORD_CONFIG.requireNumber) {
    errors.push('Password must contain at least one number');
  }
  
  // Special character check
  if (/[!@#$%^&*(),.?":{}|<>_\-+=[\]\\;'`~]/.test(password)) {
    checks.special = true;
  } else if (PASSWORD_CONFIG.requireSpecialChar) {
    errors.push('Password must contain at least one special character');
  }
  
  // Calculate strength
  const passedChecks = Object.values(checks).filter(Boolean).length;
  let strength: PasswordValidationResult['strength'] = 'weak';
  
  if (passedChecks >= 5 && password.length >= 12) {
    strength = 'very-strong';
  } else if (passedChecks >= 5) {
    strength = 'strong';
  } else if (passedChecks >= 4) {
    strength = 'medium';
  }
  
  return {
    valid: errors.length === 0,
    errors,
    strength,
  };
}

/**
 * Generate a secure random password
 */
export function generateSecurePassword(length: number = 16): string {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const special = '!@#$%^&*()_+-=[]{}|;:,.<>?';
  
  const allChars = uppercase + lowercase + numbers + special;
  
  let password = '';
  
  // Ensure at least one of each required type
  password += uppercase[randomInt(0, uppercase.length)];
  password += lowercase[randomInt(0, lowercase.length)];
  password += numbers[randomInt(0, numbers.length)];
  password += special[randomInt(0, special.length)];
  
  // Fill the rest randomly
  for (let i = password.length; i < length; i++) {
    password += allChars[randomInt(0, allChars.length)];
  }
  
  // Shuffle the password using Fisher-Yates with crypto
  const arr = password.split('');
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randomInt(0, i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.join('');
}

/**
 * Check if password has been compromised using HaveIBeenPwned k-anonymity API.
 * Uses the range API so only the first 5 chars of the SHA-1 hash are sent —
 * the full password is never transmitted. Returns true if the password appears
 * in the breach database.
 *
 * Graceful degradation: returns false if the API is unreachable, so users are
 * not blocked by network issues.
 */
export async function checkPasswordBreached(password: string): Promise<boolean> {
  try {
    const sha1 = createHash('sha1').update(password).digest('hex').toUpperCase();
    const prefix = sha1.substring(0, 5);
    const suffix = sha1.substring(5);

    const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: { 'Add-Padding': 'true' },
    });

    if (!response.ok) return false; // Graceful degradation if API unavailable

    const text = await response.text();
    const lines = text.split('\n');

    for (const line of lines) {
      const [hashSuffix, count] = line.trim().split(':');
      if (hashSuffix === suffix && parseInt(count, 10) > 0) {
        return true;
      }
    }

    return false;
  } catch {
    // Graceful degradation - don't block password if API is unreachable
    return false;
  }
}
