/**
 * Unit Tests — Feature Flags
 * اختبارات أعلام الميزات
 */

import { describe, it, expect, beforeEach } from '@jest/globals';

// ═══════════════════════════════════════════════════════════════════════
// Feature Flag System (matching src/lib/feature-flags.ts patterns)
// ═══════════════════════════════════════════════════════════════════════

interface FeatureFlag {
  key: string;
  enabled: boolean;
  description: string;
  allowedRoles?: string[];
  percentage?: number; // For gradual rollout
}

class FeatureFlagService {
  private flags = new Map<string, FeatureFlag>();

  register(flag: FeatureFlag): void {
    this.flags.set(flag.key, flag);
  }

  isEnabled(key: string, userRole?: string): boolean {
    const flag = this.flags.get(key);
    if (!flag) return false;
    if (!flag.enabled) return false;
    if (flag.allowedRoles && !userRole) {
      return false; // Role-restricted flag requires a role
    }
    if (flag.allowedRoles && userRole && !flag.allowedRoles.includes(userRole)) {
      return false;
    }
    if (flag.percentage !== undefined && flag.percentage < 100) {
      // Deterministic rollout based on key hash
      const hash = this.simpleHash(key + (userRole || ''));
      return (hash % 100) < flag.percentage;
    }
    return true;
  }

  getAll(): FeatureFlag[] {
    return Array.from(this.flags.values());
  }

  toggle(key: string, enabled: boolean): boolean {
    const flag = this.flags.get(key);
    if (!flag) return false;
    flag.enabled = enabled;
    return true;
  }

  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash * 31 + str.charCodeAt(i)) | 0;
    }
    return Math.abs(hash);
  }
}

// ═══════════════════════════════════════════════════════════════════════
// Tests
// ═══════════════════════════════════════════════════════════════════════

describe('Feature Flags — Basic Operations', () => {
  let service: FeatureFlagService;

  beforeEach(() => {
    service = new FeatureFlagService();
  });

  it('should register and check feature flags', () => {
    service.register({ key: 'dark_mode', enabled: true, description: 'Dark mode theme' });
    expect(service.isEnabled('dark_mode')).toBe(true);
  });

  it('should return false for unregistered flags', () => {
    expect(service.isEnabled('nonexistent')).toBe(false);
  });

  it('should return false for disabled flags', () => {
    service.register({ key: 'new_dashboard', enabled: false, description: 'New dashboard UI' });
    expect(service.isEnabled('new_dashboard')).toBe(false);
  });

  it('should toggle flags on and off', () => {
    service.register({ key: 'ai_chat', enabled: true, description: 'AI chat feature' });
    expect(service.isEnabled('ai_chat')).toBe(true);

    service.toggle('ai_chat', false);
    expect(service.isEnabled('ai_chat')).toBe(false);

    service.toggle('ai_chat', true);
    expect(service.isEnabled('ai_chat')).toBe(true);
  });

  it('should return false when toggling non-existent flag', () => {
    expect(service.toggle('nonexistent', true)).toBe(false);
  });

  it('should list all registered flags', () => {
    service.register({ key: 'flag1', enabled: true, description: 'Test 1' });
    service.register({ key: 'flag2', enabled: false, description: 'Test 2' });

    const all = service.getAll();
    expect(all.length).toBe(2);
  });
});

describe('Feature Flags — Role-Based Access', () => {
  let service: FeatureFlagService;

  beforeEach(() => {
    service = new FeatureFlagService();
    service.register({
      key: 'admin_panel',
      enabled: true,
      description: 'Admin panel access',
      allowedRoles: ['ADMIN', 'MANAGER'],
    });
  });

  it('should allow access for allowed roles', () => {
    expect(service.isEnabled('admin_panel', 'ADMIN')).toBe(true);
    expect(service.isEnabled('admin_panel', 'MANAGER')).toBe(true);
  });

  it('should deny access for non-allowed roles', () => {
    expect(service.isEnabled('admin_panel', 'VIEWER')).toBe(false);
    expect(service.isEnabled('admin_panel', 'ENGINEER')).toBe(false);
  });

  it('should deny access when no role provided for role-restricted flag', () => {
    expect(service.isEnabled('admin_panel')).toBe(false);
  });

  it('should allow access for non-restricted flags without role', () => {
    service.register({ key: 'public_feature', enabled: true, description: 'Public' });
    expect(service.isEnabled('public_feature')).toBe(true);
    expect(service.isEnabled('public_feature', 'VIEWER')).toBe(true);
  });
});

describe('Feature Flags — Percentage Rollout', () => {
  let service: FeatureFlagService;

  beforeEach(() => {
    service = new FeatureFlagService();
  });

  it('should enable for 100% rollout', () => {
    service.register({
      key: 'full_rollout',
      enabled: true,
      description: 'Full rollout',
      percentage: 100,
    });
    expect(service.isEnabled('full_rollout', 'user1')).toBe(true);
  });

  it('should disable for 0% rollout', () => {
    service.register({
      key: 'no_rollout',
      enabled: true,
      description: 'No rollout',
      percentage: 0,
    });
    expect(service.isEnabled('no_rollout', 'user1')).toBe(false);
  });

  it('should be deterministic for same inputs', () => {
    service.register({
      key: 'gradual',
      enabled: true,
      description: 'Gradual rollout',
      percentage: 50,
    });
    const result1 = service.isEnabled('gradual', 'user1');
    const result2 = service.isEnabled('gradual', 'user1');
    expect(result1).toBe(result2);
  });
});
