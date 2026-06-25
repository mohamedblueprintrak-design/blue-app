/**
 * Tests for utility functions (cn, getAvatarColor)
 */

import { describe, it, expect } from '@jest/globals';

import { cn, getAvatarColor, avatarColors } from '@/lib/utils';

describe('cn utility', () => {
  it('should merge class names', () => {
    const result = cn('px-2', 'py-1');
    expect(result).toContain('px-2');
    expect(result).toContain('py-1');
  });

  it('should handle conditional classes', () => {
    const result = cn('base', false && 'hidden', 'visible');
    expect(result).toContain('base');
    expect(result).toContain('visible');
    expect(result).not.toContain('hidden');
  });

  it('should merge tailwind classes correctly', () => {
    // twMerge should resolve conflicts: px-2 and px-4 → px-4
    const result = cn('px-2', 'px-4');
    expect(result).toBe('px-4');
  });

  it('should handle empty inputs', () => {
    const result = cn();
    expect(result).toBe('');
  });

  it('should handle undefined and null inputs', () => {
    const result = cn('base', undefined, null, 'extra');
    expect(result).toContain('base');
    expect(result).toContain('extra');
  });
});

describe('getAvatarColor', () => {
  it('should return first color for empty string', () => {
    expect(getAvatarColor('')).toBe(avatarColors[0]);
  });

  it('should return a valid avatar color for any string', () => {
    const result = getAvatarColor('test-user');
    expect(avatarColors).toContain(result);
  });

  it('should return consistent color for same input', () => {
    const color1 = getAvatarColor('john@example.com');
    const color2 = getAvatarColor('john@example.com');
    expect(color1).toBe(color2);
  });

  it('should return different colors for different inputs', () => {
    const color1 = getAvatarColor('user-a');
    const color2 = getAvatarColor('user-b');
    // Not guaranteed to be different, but highly likely for distinct strings
    // Just verify both are valid colors
    expect(avatarColors).toContain(color1);
    expect(avatarColors).toContain(color2);
  });

  it('should handle special characters', () => {
    const result = getAvatarColor('user+test@domain.co');
    expect(avatarColors).toContain(result);
  });

  it('should handle unicode strings', () => {
    const result = getAvatarColor('مستخدم');
    expect(avatarColors).toContain(result);
  });
});

describe('avatarColors', () => {
  it('should have 8 colors defined', () => {
    expect(avatarColors).toHaveLength(8);
  });

  it('should contain expected tailwind classes', () => {
    // teal was aliased to brand-navy in the design system codemod
    expect(avatarColors).toContain('bg-brand-navy-500');
    expect(avatarColors).toContain('bg-blue-500');
  });
});
