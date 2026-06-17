/**
 * Tests for Email Templates
 * Covers: escapeHtml, sanitizeUrl, all template functions
 */

import { describe, it, expect } from '@jest/globals';

import { emailTemplates } from '@/lib/email-templates';

// ═══════════════════════════════════════════════════════════════════════
// 1. welcome template
// ═══════════════════════════════════════════════════════════════════════

describe('Email Templates — welcome', () => {
  it('should generate welcome email with name', () => {
    const result = emailTemplates.welcome('أحمد');
    expect(result.subject).toBe('مرحباً بك في BluePrint');
    expect(result.html).toContain('أحمد');
    expect(result.html).toContain('BluePrint');
    expect(result.text).toContain('أحمد');
  });

  it('should include login button when URL provided', () => {
    const result = emailTemplates.welcome('أحمد', 'https://example.com/login');
    expect(result.html).toContain('https://example.com/login');
  });

  it('should not include login button when URL is not provided', () => {
    const result = emailTemplates.welcome('أحمد');
    expect(result.html).not.toContain('class="button"');
  });

  it('should escape HTML in name', () => {
    const result = emailTemplates.welcome('<script>alert("xss")</script>');
    expect(result.html).not.toContain('<script>');
    expect(result.html).toContain('&lt;script&gt;');
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 2. invoiceCreated template
// ═══════════════════════════════════════════════════════════════════════

describe('Email Templates — invoiceCreated', () => {
  it('should generate invoice email with all fields', () => {
    const result = emailTemplates.invoiceCreated('العميل', 'INV-001', 5000, '2024-12-31', 'https://example.com/invoice');
    expect(result.subject).toContain('INV-001');
    expect(result.html).toContain('العميل');
    expect(result.html).toContain('INV-001');
    expect(result.html).toContain('2024-12-31');
    expect(result.html).toContain('https://example.com/invoice');
  });

  it('should work without optional fields', () => {
    const result = emailTemplates.invoiceCreated('العميل', 'INV-002', 1000);
    expect(result.subject).toContain('INV-002');
    expect(result.html).toContain('العميل');
  });

  it('should format amount as AED currency', () => {
    const result = emailTemplates.invoiceCreated('Client', 'INV-003', 199);
    expect(result.html).toContain('199');
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 3. taskAssigned template
// ═══════════════════════════════════════════════════════════════════════

describe('Email Templates — taskAssigned', () => {
  it('should generate task assignment email', () => {
    const result = emailTemplates.taskAssigned('أحمد', 'تصميم المبنى', 'مشروع البرج', '2024-12-31', 'HIGH', 'https://example.com/task');
    expect(result.subject).toContain('تصميم المبنى');
    expect(result.html).toContain('أحمد');
    expect(result.html).toContain('تصميم المبنى');
    expect(result.html).toContain('مشروع البرج');
  });

  it('should work without optional fields', () => {
    const result = emailTemplates.taskAssigned('أحمد', 'مهمة بسيطة', 'مشروع صغير');
    expect(result.html).toContain('مهمة بسيطة');
  });

  it('should show priority label in Arabic', () => {
    const result = emailTemplates.taskAssigned('أحمد', 'مهمة', 'مشروع', undefined, 'URGENT');
    expect(result.html).toContain('عاجل جداً');
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 4. passwordReset template
// ═══════════════════════════════════════════════════════════════════════

describe('Email Templates — passwordReset', () => {
  it('should generate password reset email', () => {
    const result = emailTemplates.passwordReset('أحمد', 'https://example.com/reset');
    expect(result.subject).toContain('إعادة تعيين');
    expect(result.html).toContain('أحمد');
    expect(result.html).toContain('https://example.com/reset');
    expect(result.html).toContain('30');
  });

  it('should respect custom expiry time', () => {
    const result = emailTemplates.passwordReset('أحمد', 'https://example.com/reset', 60);
    expect(result.html).toContain('60');
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 5. emailVerification template
// ═══════════════════════════════════════════════════════════════════════

describe('Email Templates — emailVerification', () => {
  it('should generate verification email', () => {
    const result = emailTemplates.emailVerification('أحمد', 'https://example.com/verify');
    expect(result.subject).toContain('تحقق');
    expect(result.html).toContain('أحمد');
    expect(result.html).toContain('https://example.com/verify');
    expect(result.html).toContain('24');
  });

  it('should respect custom expiry hours', () => {
    const result = emailTemplates.emailVerification('أحمد', 'https://example.com/verify', 48);
    expect(result.html).toContain('48');
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 6. emailVerified template
// ═══════════════════════════════════════════════════════════════════════

describe('Email Templates — emailVerified', () => {
  it('should generate verified email', () => {
    const result = emailTemplates.emailVerified('أحمد');
    expect(result.subject).toContain('تم التحقق');
    expect(result.html).toContain('أحمد');
  });

  it('should include login button when URL provided', () => {
    const result = emailTemplates.emailVerified('أحمد', 'https://example.com/login');
    expect(result.html).toContain('https://example.com/login');
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 7. twoFactorEnabled template
// ═══════════════════════════════════════════════════════════════════════

describe('Email Templates — twoFactorEnabled', () => {
  it('should generate 2FA enabled email', () => {
    const result = emailTemplates.twoFactorEnabled('أحمد');
    expect(result.subject).toContain('المصادقة الثنائية');
    expect(result.html).toContain('أحمد');
    expect(result.html).toContain('رموز الاسترداد');
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 8. twoFactorCode template
// ═══════════════════════════════════════════════════════════════════════

describe('Email Templates — twoFactorCode', () => {
  it('should generate 2FA code email', () => {
    const result = emailTemplates.twoFactorCode('أحمد', '123456');
    expect(result.subject).toContain('رمز التحقق');
    expect(result.html).toContain('أحمد');
    expect(result.html).toContain('123456');
    expect(result.html).toContain('5');
  });

  it('should respect custom expiry minutes', () => {
    const result = emailTemplates.twoFactorCode('أحمد', '654321', 10);
    expect(result.html).toContain('10');
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 9. newLoginNotification template
// ═══════════════════════════════════════════════════════════════════════

describe('Email Templates — newLoginNotification', () => {
  it('should generate login notification email', () => {
    const result = emailTemplates.newLoginNotification('أحمد', 'Chrome/Windows', 'دبي، الإمارات', '2024-06-14 10:30');
    expect(result.subject).toContain('تسجيل دخول');
    expect(result.html).toContain('أحمد');
    expect(result.html).toContain('Chrome/Windows');
    expect(result.html).toContain('دبي، الإمارات');
  });

  it('should include security URL when provided', () => {
    const result = emailTemplates.newLoginNotification('أحمد', 'Chrome', 'Dubai', '10:30', 'https://example.com/security');
    expect(result.html).toContain('https://example.com/security');
    expect(result.html).toContain('تأمين حسابي');
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 10. notificationEmail template
// ═══════════════════════════════════════════════════════════════════════

describe('Email Templates — notificationEmail', () => {
  it('should generate notification email', () => {
    const result = emailTemplates.notificationEmail({
      name: 'أحمد',
      title: 'إشعار جديد',
      message: 'تم تحديث المشروع',
    });
    expect(result.subject).toContain('إشعار جديد');
    expect(result.html).toContain('أحمد');
    expect(result.html).toContain('تم تحديث المشروع');
  });

  it('should include link when provided', () => {
    const result = emailTemplates.notificationEmail({
      name: 'أحمد',
      title: 'إشعار',
      message: 'رسالة',
      link: 'https://example.com/details',
    });
    expect(result.html).toContain('https://example.com/details');
    expect(result.html).toContain('عرض التفاصيل');
  });

  it('should escape HTML in dynamic fields', () => {
    const result = emailTemplates.notificationEmail({
      name: '<b>test</b>',
      title: '<script>alert(1)</script>',
      message: '<img src=x onerror=alert(1)>',
    });
    expect(result.html).not.toContain('<script>');
    expect(result.html).not.toContain('<img src=x');
    expect(result.html).toContain('&lt;script&gt;');
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 11. URL Sanitization (via templates)
// ═══════════════════════════════════════════════════════════════════════

describe('Email Templates — URL sanitization', () => {
  it('should allow https:// URLs', () => {
    const result = emailTemplates.welcome('User', 'https://example.com/login');
    expect(result.html).toContain('https://example.com/login');
  });

  it('should allow http:// URLs', () => {
    const result = emailTemplates.welcome('User', 'http://localhost:3000/login');
    expect(result.html).toContain('http://localhost:3000/login');
  });

  it('should sanitize javascript: URLs', () => {
    const result = emailTemplates.welcome('User', 'javascript:alert(1)');
    // The sanitizeUrl function should return empty string for javascript: URLs
    // so the button should not appear (no href with the dangerous URL)
    expect(result.html).not.toContain('javascript:alert(1)');
  });
});
