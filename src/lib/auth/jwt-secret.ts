
/**
 * Centralized Secret Management
 * إدارة مركزية للمفاتيح السرية
 *
 * SECURITY: Single source of truth for secrets across the application
 * - Production: JWT_SECRET is MANDATORY
 * - Development: Falls back to a dev secret with warning
 *
 * All files that need secrets should import from this module.
 * Do NOT duplicate secrets in individual files.
 */

/**
 * Get JWT secret as Uint8Array for jose library
 * SECURITY: JWT_SECRET is REQUIRED in production
 */
export function getJwtSecretBytes(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  const nodeEnv = process.env.NODE_ENV;

  // Production: JWT_SECRET is MANDATORY
  if (nodeEnv === 'production') {
    if (!secret) {
      throw new Error(
        'FATAL: JWT_SECRET environment variable is required in production. ' +
        'Generate one with: openssl rand -base64 48'
      );
    }
    if (secret.length < 32) {
      throw new Error(
        'FATAL: JWT_SECRET must be at least 32 characters long. ' +
        `Current length: ${secret.length}. Generate with: openssl rand -base64 48`
      );
    }
    // Reject known placeholder values in production
    if (
      secret.includes('change-me') ||
      secret.includes('change_this') ||
      secret.includes('your_') ||
      secret === 'blueprint-dev-secret-do-not-use-in-production-min32chars!' ||
      // Reject the dev secret that was previously committed — it must be rotated
      secret === 'bp-dev-jwt-secret-key-2024-blueprint-rak' ||
      // Reject any secret with common dev patterns
      secret.includes('-dev-') && secret.includes('secret')
    ) {
      throw new Error(
        'FATAL: JWT_SECRET appears to be a placeholder value. ' +
        'Generate a secure secret with: openssl rand -base64 48'
      );
    }
    return new TextEncoder().encode(secret);
  }

  // Development/Test: Require JWT_SECRET from environment (no hardcoded fallback)
  // Previously, a hardcoded fallback secret existed here, which was a security risk.
  // Now, JWT_SECRET MUST be set in .env even for development.
  if (!secret || secret.length < 32) {
    throw new Error(
      'FATAL: JWT_SECRET environment variable is required.' +
      '\n   Set JWT_SECRET in your .env file (min 32 characters)' +
      '\n   Generate with: openssl rand -base64 48' +
      '\n   For development, add to .env: JWT_SECRET=dev-secret-at-least-32-characters-long!'
    );
  }

  return new TextEncoder().encode(secret);
}

/**
 * Get JWT secret as a string (for compatibility with some libraries)
 */
export function getJwtSecretString(): string {
  const bytes = getJwtSecretBytes();
  return new TextDecoder().decode(bytes);
}
