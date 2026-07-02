/**
 * Integration Tests — Role-Based Isolation & Fail-Closed Middleware Guards
 *
 * اختبارات تكاملية — عزل الأدوار وحارس البوابة المغلق افتراضياً في الـ Middleware
 */

import { describe, it, expect } from '@jest/globals';
import { NextRequest } from 'next/server';
import { SignJWT } from 'jose';
import { proxy } from '@/auth-proxy';
import { getJwtSecretBytes } from '@/lib/auth/jwt-secret';

async function generateTestToken(payload: Record<string, unknown>): Promise<string> {
  return new SignJWT({
    type: 'access',
    ...payload,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuer('blueprint-saas')
    .setAudience('blueprint-users')
    .setExpirationTime('15m')
    .setIssuedAt()
    .sign(getJwtSecretBytes());
}

function createMockRequest(url: string, token?: string, method = 'GET'): NextRequest {
  const request = new NextRequest(url, {
    method,
  });
  if (token) {
    request.cookies.set('blue_token', token);
  }
  return request;
}

describe('Middleware Role Isolation & Fail-Closed Guard', () => {
  it('should redirect unauthorized page requests to /unauthorized (e.g. ENGINEER accessing finance)', async () => {
    const token = await generateTestToken({
      userId: 'u1',
      email: 'engineer@blueprint.ae',
      role: 'ENGINEER',
      name: 'Test Engineer',
    });
    const request = createMockRequest('http://localhost:3000/dashboard/finance', token);
    const response = await proxy(request);

    expect(response.status).toBe(307); // NextResponse.redirect uses temporary redirect (307)
    expect(response.headers.get('location')).toContain('/unauthorized');
  });

  it('should allow authorized page requests (e.g. ACCOUNTANT accessing finance)', async () => {
    const token = await generateTestToken({
      userId: 'u2',
      email: 'accountant@blueprint.ae',
      role: 'ACCOUNTANT',
      name: 'Test Accountant',
    });
    const request = createMockRequest('http://localhost:3000/dashboard/finance', token);
    const response = await proxy(request);

    // Should pass through with 200/OK or forward via headers (meaning not blocked/redirected)
    expect(response.status).toBe(200);
    expect(response.headers.get('location')).toBeNull();
    expect(response.headers.get('x-middleware-request-x-user-role')).toBe('ACCOUNTANT');
  });

  it('should return 403 Forbidden for unauthorized API requests (e.g. ENGINEER calling /api/finance)', async () => {
    const token = await generateTestToken({
      userId: 'u1',
      email: 'engineer@blueprint.ae',
      role: 'ENGINEER',
      name: 'Test Engineer',
    });
    const request = createMockRequest('http://localhost:3000/api/finance/revenue', token);
    const response = await proxy(request);

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error).toBe('Unauthorized route access');
  });

  it('should allow public dashboard routes for all roles (e.g. profile and settings)', async () => {
    const token = await generateTestToken({
      userId: 'u1',
      email: 'engineer@blueprint.ae',
      role: 'ENGINEER',
      name: 'Test Engineer',
    });
    const request = createMockRequest('http://localhost:3000/dashboard/profile', token);
    const response = await proxy(request);

    expect(response.status).toBe(200);
    expect(response.headers.get('x-middleware-request-x-user-role')).toBe('ENGINEER');
  });

  it('should support comma-separated multi-roles (e.g. "ENGINEER,ACCOUNTANT" accessing finance)', async () => {
    const token = await generateTestToken({
      userId: 'u3',
      email: 'multi@blueprint.ae',
      role: 'ENGINEER,ACCOUNTANT',
      name: 'Multi Role User',
    });
    const request = createMockRequest('http://localhost:3000/dashboard/finance', token);
    const response = await proxy(request);

    // Authorized because the user has ACCOUNTANT role
    expect(response.status).toBe(200);
    expect(response.headers.get('x-middleware-request-x-user-role')).toBe('ENGINEER,ACCOUNTANT');
  });

  it('should fail-closed and block unmapped paths under /dashboard', async () => {
    const token = await generateTestToken({
      userId: 'u1',
      email: 'engineer@blueprint.ae',
      role: 'ENGINEER',
      name: 'Test Engineer',
    });
    // Accessing an unmapped/random module
    const request = createMockRequest('http://localhost:3000/dashboard/non-existent-module', token);
    const response = await proxy(request);

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toContain('/unauthorized');
  });
});
