/**
 * BluePrint Auth Load Test
 *
 * Focused load test for authentication flows:
 * - Login with valid credentials
 * - Login with invalid credentials
 * - Session validation
 * - Token refresh
 * - Forgot-password endpoint
 *
 * Run:  k6 run tests/auth.js
 * Env:  BASE_URL, TEST_EMAIL, TEST_PASSWORD
 */

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Trend, Rate } from 'k6/metrics';
import {
  BASE_URL,
  THRESHOLDS,
  STAGES,
  login,
  thinkTime,
} from '../config.js';

// ─────────────────────────────────────────────────────────────────────────────
// Custom metrics
// ─────────────────────────────────────────────────────────────────────────────

const loginTrend         = new Trend('auth_login_duration', true);
const loginInvalidTrend  = new Trend('auth_login_invalid_duration', true);
const sessionTrend       = new Trend('auth_session_duration', true);
const refreshTrend       = new Trend('auth_refresh_duration', true);
const forgotPasswordTrend = new Trend('auth_forgot_password_duration', true);
const authErrorRate      = new Rate('auth_errors');

// ─────────────────────────────────────────────────────────────────────────────
// Options — use the "load" stage profile by default; override via env
// ─────────────────────────────────────────────────────────────────────────────

const stageProfile = __ENV.STAGE_PROFILE || 'load';

export const options = {
  stages: STAGES[stageProfile] || STAGES.load,
  thresholds: THRESHOLDS.load,
  tags: { test_type: 'auth', stage_profile: stageProfile },
};

// ─────────────────────────────────────────────────────────────────────────────
// Setup — warm-up health check
// ─────────────────────────────────────────────────────────────────────────────

export function setup() {
  const res = http.get(`${BASE_URL}/api/health`);
  return { healthy: res.status === 200 };
}

// ─────────────────────────────────────────────────────────────────────────────
// Test
// ─────────────────────────────────────────────────────────────────────────────

export default function (data) {
  // ═══════════════════════════════════════════════════════════════════════════
  // 1. Login — valid credentials
  // ═══════════════════════════════════════════════════════════════════════════

  group('Auth - Valid Login', () => {
    const auth = login();

    loginTrend.add(auth.success ? 1 : 0, { duration: auth.status });

    const ok = check(auth, {
      'login returns 200': (a) => a.success,
    });

    authErrorRate.add(!ok);

    if (!ok) {
      console.warn(`VU ${__VU}: valid login failed with status ${auth.status}`);
    }
  });

  sleep(thinkTime(0.5, 1.5));

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. Login — invalid credentials
  // ═══════════════════════════════════════════════════════════════════════════

  group('Auth - Invalid Login', () => {
    const res = http.post(
      `${BASE_URL}/api/auth/login`,
      JSON.stringify({ email: 'no-user@loadtest.test', password: 'wrong-password' }),
      { headers: { 'Content-Type': 'application/json' } },
    );

    loginInvalidTrend.add(res.timings.duration);

    const ok = check(res, {
      'invalid login returns 401': (r) => r.status === 401,
    });

    authErrorRate.add(!ok && res.status >= 500);
  });

  sleep(thinkTime(0.3, 1));

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. Session check
  // ═══════════════════════════════════════════════════════════════════════════

  group('Auth - Session', () => {
    const res = http.get(`${BASE_URL}/api/auth/session`);
    sessionTrend.add(res.timings.duration);

    check(res, {
      'session endpoint responds': (r) => r.status === 200 || r.status === 401,
    });
  });

  sleep(thinkTime(0.3, 0.8));

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. Token refresh
  // ═══════════════════════════════════════════════════════════════════════════

  group('Auth - Refresh', () => {
    const res = http.post(
      `${BASE_URL}/api/auth/refresh`,
      '{}',
      { headers: { 'Content-Type': 'application/json' } },
    );
    refreshTrend.add(res.timings.duration);

    check(res, {
      'refresh returns 200 or 401': (r) => r.status === 200 || r.status === 401,
    });
  });

  sleep(thinkTime(0.3, 0.8));

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. Forgot password (non-existent email — validates endpoint is alive)
  // ═══════════════════════════════════════════════════════════════════════════

  group('Auth - Forgot Password', () => {
    const res = http.post(
      `${BASE_URL}/api/auth/forgot-password`,
      JSON.stringify({ email: `k6-test-${__VU}-${__ITER}@loadtest.test` }),
      { headers: { 'Content-Type': 'application/json' } },
    );
    forgotPasswordTrend.add(res.timings.duration);

    check(res, {
      'forgot-password returns 200/400/404': (r) =>
        r.status === 200 || r.status === 400 || r.status === 404,
    });
  });

  sleep(thinkTime());
}
