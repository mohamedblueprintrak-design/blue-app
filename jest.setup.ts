/**
 * Jest Setup File
 * Runs before each test suite to configure environment variables
 * and global test infrastructure.
 */

// Set required environment variables for tests
process.env.JWT_SECRET = 'test-secret-at-least-32-characters-long!';
process.env.ENCRYPTION_KEY = 'a'.repeat(64);
(process.env as Record<string, string>).NODE_ENV = 'test';

// Stripe test configuration — must be set before any module that reads isStripeConfigured at import time
process.env.STRIPE_SECRET_KEY = 'sk_test_123';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';

// Suppress Prisma warnings in tests
process.env.DATABASE_URL = 'file:./test.db';

// Disable Next.js telemetry in tests
process.env.NEXT_TELEMETRY_DISABLED = '1';
