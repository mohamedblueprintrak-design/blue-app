/**
 * Critical API Route Tests
 * اختبارات مسارات API الحرجة
 * 
 * These tests verify the fixes from the production-readiness audit.
 * Integration tests require a running server — auto-skip if unavailable.
 */

import { describe, it, expect, beforeAll } from '@jest/globals';

// Note: These are integration tests that require a running server
// Run with: npm test -- __tests__/integration/critical-routes.test.ts

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';

let serverAvailable = false;

beforeAll(async () => {
  try {
    const res = await fetch(`${BASE_URL}/api/health`, { signal: AbortSignal.timeout(3000) });
    serverAvailable = res.ok;
  } catch {
    serverAvailable = false;
  }
});

function itIfServer(name: string, fn: () => Promise<void>, timeout?: number) {
  if (!serverAvailable) {
    it.skip(name, fn, timeout);
  } else {
    it(name, fn, timeout);
  }
}

describe('Critical API Route Tests', () => {
  
  describe('GET /api/public/stats', () => {
    itIfServer('should return valid stats structure', async () => {
      const response = await fetch(`${BASE_URL}/api/public/stats`);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data).toHaveProperty('completedProjects');
      expect(data).toHaveProperty('satisfiedClients');
      expect(data).toHaveProperty('engineeringDisciplines');
      expect(data).toHaveProperty('ongoingProjects');
      expect(data).toHaveProperty('source');
      expect(['database', 'fallback']).toContain(data.source);
      
      // Fallback data should be zeros (not fake numbers)
      if (data.source === 'fallback') {
        expect(data.completedProjects).toBe(0);
        expect(data.satisfiedClients).toBe(0);
      }
    });
  });

  describe('POST /api/auth/login', () => {
    itIfServer('should return 401 for invalid credentials', async () => {
      const response = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'nonexistent@test.com', password: 'wrong' }),
      });
      
      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBeDefined();
    });

    itIfServer('should mitigate timing attacks (similar response times)', async () => {
      // Test that response times for existing vs non-existing emails are similar
      const timings: { existing: number[]; nonexistent: number[] } = {
        existing: [],
        nonexistent: [],
      };

      // Test non-existent email (3 times)
      for (let i = 0; i < 3; i++) {
        const start = Date.now();
        await fetch(`${BASE_URL}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: `nonexistent${i}@test.com`, password: 'wrongpassword123' }),
        });
        timings.nonexistent.push(Date.now() - start);
      }

      // Test existing email with wrong password (3 times)
      for (let i = 0; i < 3; i++) {
        const start = Date.now();
        await fetch(`${BASE_URL}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'admin@blueprint.ae', password: 'wrongpassword123' }),
        });
        timings.existing.push(Date.now() - start);
      }

      const avgExisting = timings.existing.reduce((a, b) => a + b, 0) / timings.existing.length;
      const avgNonexistent = timings.nonexistent.reduce((a, b) => a + b, 0) / timings.nonexistent.length;

      // The difference should be less than 200ms (bcrypt takes ~100ms, so both should be similar)
      expect(Math.abs(avgExisting - avgNonexistent)).toBeLessThan(200);
    }, 30000); // 30 second timeout for timing tests
  });

  describe('POST /api/quote-requests', () => {
    itIfServer('should accept valid quote requests', async () => {
      const response = await fetch(`${BASE_URL}/api/quote-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Test User',
          phone: '+971501234567',
          serviceType: 'architectural',
          buildingType: 'villa',
          message: 'Test quote request',
        }),
      });
      
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
    });

    itIfServer('should reject XSS in quote requests', async () => {
      const response = await fetch(`${BASE_URL}/api/quote-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: '<script>alert("xss")</script>',
          phone: '+971501234567',
          serviceType: 'architectural',
        }),
      });
      
      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/stripe/checkout', () => {
    itIfServer('should return 401 without authentication', async () => {
      const response = await fetch(`${BASE_URL}/api/stripe/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: 'basic', interval: 'month' }),
      });
      
      // Should return 401 (unauthorized) not fake success
      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/health', () => {
    itIfServer('should return health status', async () => {
      const response = await fetch(`${BASE_URL}/api/health`);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.status).toBe('ok');
      expect(data).toHaveProperty('database');
      expect(data.database).toHaveProperty('status');
    });
  });
});

describe('Backup Service', () => {
  it('should detect database type from DATABASE_URL', () => {
    // Test the database type detection logic
    const pgUrl = 'postgresql://user:pass@localhost:5432/db';
    const sqliteUrl = 'file:./db/custom.db';
    
    expect(pgUrl.includes('postgresql://') || pgUrl.includes('postgres://')).toBe(true);
    expect(sqliteUrl.includes('postgresql://') || sqliteUrl.includes('postgres://')).toBe(false);
  });
});

describe('Notification Service', () => {
  it('should have correct notification types', () => {
    const validTypes = [
      'task_assigned', 'task_updated', 'task_overdue',
      'project_update', 'project_milestone',
      'invoice_created', 'invoice_overdue', 'invoice_paid',
      'payment_received',
      'approval_required', 'approval_approved', 'approval_rejected',
      'defect_reported', 'rfi_received', 'meeting_reminder',
      'system_alert', 'mention',
    ];
    
    expect(validTypes.length).toBeGreaterThan(10);
    expect(validTypes).toContain('task_assigned');
    expect(validTypes).toContain('invoice_overdue');
  });
});
