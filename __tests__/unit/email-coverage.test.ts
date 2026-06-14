/**
 * Tests for Email Module
 * Covers: detectProvider, isSmtpConfigured, isResendConfigured, isEmailConfigured,
 * getEmailProvider, sendEmail (dev mode), sendBatchEmails, testEmailConnection,
 * sendEmailWithRetry, emailQueue
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';

// Mock logger
jest.mock('@/lib/logger', () => ({
  log: { warn: jest.fn(), error: jest.fn(), info: jest.fn(), debug: jest.fn() },
}));

// Mock nodemailer
jest.mock('nodemailer', () => ({
  createTransport: jest.fn().mockReturnValue({
    sendMail: jest.fn().mockResolvedValue({ messageId: 'test-msg-id' }),
    verify: jest.fn().mockResolvedValue(true),
  }),
}));

import {
  sendEmail,
  sendBatchEmails,
  sendEmailWithRetry,
  testEmailConnection,
  isSmtpConfigured,
  isResendConfigured,
  isEmailConfigured,
  getEmailProvider,
  emailQueue,
} from '@/lib/email';

// ═══════════════════════════════════════════════════════════════════════
// 1. Configuration Checks
// ═══════════════════════════════════════════════════════════════════════

describe('Email — Configuration', () => {
  const originalEnv = process.env;

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('isSmtpConfigured should return false without SMTP env vars', () => {
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASSWORD;
    delete process.env.SMTP_PASS;
    expect(isSmtpConfigured()).toBe(false);
  });

  it('isSmtpConfigured should return true with all SMTP env vars', () => {
    process.env.SMTP_HOST = 'smtp.example.com';
    process.env.SMTP_USER = 'user@example.com';
    process.env.SMTP_PASSWORD = 'password123';
    expect(isSmtpConfigured()).toBe(true);
  });

  it('isSmtpConfigured should support SMTP_PASS as alternative', () => {
    process.env.SMTP_HOST = 'smtp.example.com';
    process.env.SMTP_USER = 'user@example.com';
    delete process.env.SMTP_PASSWORD;
    process.env.SMTP_PASS = 'password123';
    expect(isSmtpConfigured()).toBe(true);
  });

  it('isResendConfigured should return false without RESEND_API_KEY', () => {
    delete process.env.RESEND_API_KEY;
    expect(isResendConfigured()).toBe(false);
  });

  it('isResendConfigured should return true with RESEND_API_KEY', () => {
    process.env.RESEND_API_KEY = 're_test_key';
    expect(isResendConfigured()).toBe(true);
  });

  it('isEmailConfigured should return false without any provider', () => {
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASSWORD;
    delete process.env.SMTP_PASS;
    delete process.env.RESEND_API_KEY;
    expect(isEmailConfigured()).toBe(false);
  });

  it('isEmailConfigured should return true with SMTP configured', () => {
    process.env.SMTP_HOST = 'smtp.example.com';
    process.env.SMTP_USER = 'user@example.com';
    process.env.SMTP_PASSWORD = 'password123';
    expect(isEmailConfigured()).toBe(true);
  });

  it('getEmailProvider should return dev when nothing is configured', () => {
    delete process.env.EMAIL_PROVIDER;
    delete process.env.RESEND_API_KEY;
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASSWORD;
    delete process.env.SMTP_PASS;
    expect(getEmailProvider()).toBe('dev');
  });

  it('getEmailProvider should return resend when configured', () => {
    process.env.EMAIL_PROVIDER = 'resend';
    process.env.RESEND_API_KEY = 're_test_key';
    expect(getEmailProvider()).toBe('resend');
  });

  it('getEmailProvider should return smtp when configured', () => {
    process.env.EMAIL_PROVIDER = 'smtp';
    process.env.SMTP_HOST = 'smtp.example.com';
    process.env.SMTP_USER = 'user@example.com';
    process.env.SMTP_PASSWORD = 'password123';
    expect(getEmailProvider()).toBe('smtp');
  });

  it('getEmailProvider should fall back to dev when SMTP is incomplete', () => {
    process.env.EMAIL_PROVIDER = 'smtp';
    delete process.env.SMTP_HOST;
    expect(getEmailProvider()).toBe('dev');
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 2. sendEmail (dev mode)
// ═══════════════════════════════════════════════════════════════════════

describe('Email — sendEmail', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Ensure dev mode (no email providers configured)
    delete process.env.EMAIL_PROVIDER;
    delete process.env.RESEND_API_KEY;
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASSWORD;
    delete process.env.SMTP_PASS;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('should return simulated result in dev mode', async () => {
    const result = await sendEmail({
      to: 'test@example.com',
      subject: 'Test Subject',
      html: '<h1>Hello</h1>',
      text: 'Hello',
    });
    expect(result.sent).toBe(false);
    expect(result.simulated).toBe(true);
    expect(result.provider).toBe('dev');
  });

  it('should accept custom from address', async () => {
    const result = await sendEmail({
      to: 'test@example.com',
      subject: 'Test',
      html: '<p>Test</p>',
      from: 'custom@example.com',
    });
    expect(result.simulated).toBe(true);
  });

  it('should handle missing text field', async () => {
    const result = await sendEmail({
      to: 'test@example.com',
      subject: 'Test',
      html: '<p>Test</p>',
    });
    expect(result.simulated).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 3. sendBatchEmails
// ═══════════════════════════════════════════════════════════════════════

describe('Email — sendBatchEmails', () => {
  beforeEach(() => {
    delete process.env.EMAIL_PROVIDER;
    delete process.env.RESEND_API_KEY;
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASSWORD;
    delete process.env.SMTP_PASS;
  });

  it('should handle empty array', async () => {
    const result = await sendBatchEmails([]);
    expect(result.sent).toBe(0);
    expect(result.failed).toBe(0);
    expect(result.simulated).toBe(0);
  });

  it('should simulate all emails in dev mode', async () => {
    const result = await sendBatchEmails([
      { to: 'test1@example.com', subject: 'Test 1', html: '<p>1</p>' },
      { to: 'test2@example.com', subject: 'Test 2', html: '<p>2</p>' },
    ]);
    expect(result.simulated).toBe(2);
    expect(result.sent).toBe(0);
    expect(result.failed).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 4. testEmailConnection
// ═══════════════════════════════════════════════════════════════════════

describe('Email — testEmailConnection', () => {
  const originalEnv = process.env;

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('should report dev mode when nothing configured', async () => {
    delete process.env.EMAIL_PROVIDER;
    delete process.env.RESEND_API_KEY;
    delete process.env.SMTP_HOST;
    const result = await testEmailConnection();
    expect(result.success).toBe(false);
    expect(result.configured).toBe(false);
    expect(result.provider).toBe('dev');
  });

  it('should report success when Resend is configured', async () => {
    process.env.EMAIL_PROVIDER = 'resend';
    process.env.RESEND_API_KEY = 're_test_key';
    const result = await testEmailConnection();
    expect(result.success).toBe(true);
    expect(result.configured).toBe(true);
    expect(result.provider).toBe('resend');
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 5. sendEmailWithRetry / EmailQueue
// ═══════════════════════════════════════════════════════════════════════

describe('Email — sendEmailWithRetry', () => {
  it('should return a queue item ID', () => {
    const id = sendEmailWithRetry({
      to: 'test@example.com',
      subject: 'Retry Test',
      html: '<p>Test</p>',
    });
    expect(typeof id).toBe('string');
    expect(id).toMatch(/^email_/);
  });

  it('should track status of queued email', () => {
    const id = sendEmailWithRetry({
      to: 'test@example.com',
      subject: 'Status Test',
      html: '<p>Test</p>',
    });
    const status = emailQueue.getStatus(id);
    expect(status).toBeDefined();
    expect(status!.id).toBe(id);
    expect(['pending', 'sending', 'sent', 'simulated']).toContain(status!.status);
  });

  it('should provide queue stats', () => {
    emailQueue.getStats(); // Should not throw
    const stats = emailQueue.getStats();
    expect(stats).toHaveProperty('pending');
    expect(stats).toHaveProperty('sending');
    expect(stats).toHaveProperty('sent');
    expect(stats).toHaveProperty('failed');
    expect(stats).toHaveProperty('simulated');
    expect(stats).toHaveProperty('total');
  });
});
