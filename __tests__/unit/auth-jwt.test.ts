import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import {
  generateAccessToken,
  generatePasswordResetToken,
  generateEmailVerificationToken,
  generateToken,
  verifyToken,
  verifyPasswordResetToken,
  verifyEmailVerificationToken,
  getTokenExpiration,
  isTokenExpired,
  decodeToken
} from '../../src/lib/auth/modules/jwt';

// We need to mock getJwtSecretBytes because it requires an environment variable
jest.mock('../../src/lib/auth/jwt-secret', () => ({
  getJwtSecretBytes: jest.fn().mockReturnValue(new TextEncoder().encode('test-secret-key-that-is-at-least-32-chars'))
}));

describe('JWT Auth Module', () => {
  const mockPayload = {
    userId: 'user123',
    email: 'test@example.com',
    username: 'testuser',
    role: 'ADMIN',
    organizationId: 'org123'
  };

  describe('Token Generation & Verification', () => {
    it('generates and verifies an access token', async () => {
      const token = await generateAccessToken(mockPayload);
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(0);

      const decoded = await verifyToken(token);
      expect(decoded).not.toBeNull();
      expect(decoded?.userId).toBe(mockPayload.userId);
      expect(decoded?.email).toBe(mockPayload.email);
      expect(decoded?.role).toBe(mockPayload.role);
      expect(decoded?.type).toBe('access');
    });

    it('generates and verifies a password reset token', async () => {
      const token = await generatePasswordResetToken(mockPayload.userId);
      expect(typeof token).toBe('string');

      const decoded = await verifyPasswordResetToken(token);
      expect(decoded).not.toBeNull();
      expect(decoded?.userId).toBe(mockPayload.userId);

      // Verify that access token verifier rejects it
      const accessDecoded = await verifyToken(token);
      expect(accessDecoded).toBeNull();
    });

    it('generates and verifies an email verification token', async () => {
      const token = await generateEmailVerificationToken(mockPayload.email, mockPayload.userId);
      expect(typeof token).toBe('string');

      const decoded = await verifyEmailVerificationToken(token);
      expect(decoded).not.toBeNull();
      expect(decoded?.email).toBe(mockPayload.email);
      expect(decoded?.userId).toBe(mockPayload.userId);

      // Verify that access token verifier rejects it
      const accessDecoded = await verifyToken(token);
      expect(accessDecoded).toBeNull();
    });

    it('generates a custom token and sets default expiration if none provided', async () => {
      const token = await generateToken({ customProp: 'value' });
      expect(typeof token).toBe('string');
    });

    it('returns null when verifying an invalid token', async () => {
      const result = await verifyToken('invalid.token.string');
      expect(result).toBeNull();
    });
  });

  describe('Token Utilities', () => {
    it('correctly calculates token expiration dates', () => {
      const now = new Date();
      
      const inOneMinute = getTokenExpiration('1m');
      expect(inOneMinute.getTime()).toBeGreaterThan(now.getTime());
      
      const inOneHour = getTokenExpiration('1h');
      expect(inOneHour.getTime()).toBeGreaterThan(inOneMinute.getTime());
      
      const inOneDay = getTokenExpiration('1d');
      expect(inOneDay.getTime()).toBeGreaterThan(inOneHour.getTime());
    });

    it('throws error for invalid expiration format', () => {
      expect(() => getTokenExpiration('invalid')).toThrow('Invalid expiration format: invalid');
      expect(() => getTokenExpiration('5y')).toThrow('Invalid expiration format: 5y');
    });

    it('checks if token is expired', () => {
      const past = Math.floor(Date.now() / 1000) - 100;
      const future = Math.floor(Date.now() / 1000) + 100;
      
      expect(isTokenExpired(past)).toBe(true);
      expect(isTokenExpired(future)).toBe(false);
    });

    it('decodes token safely in development', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      const token = await generateAccessToken(mockPayload);
      const decoded = decodeToken(token);
      
      expect(decoded).not.toBeNull();
      expect(decoded?.userId).toBe(mockPayload.userId);
      
      process.env.NODE_ENV = originalEnv;
    });

    it('returns null when decoding token in production', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      
      const token = await generateAccessToken(mockPayload);
      const decoded = decodeToken(token);
      
      expect(decoded).toBeNull();
      
      process.env.NODE_ENV = originalEnv;
    });
  });
});
