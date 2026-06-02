/**
 * BluePrint Smoke Test
 *
 * Quick verification that the most critical endpoints are up and returning 200.
 * 2 VUs, 30 seconds — designed to fail fast if the system is broken.
 *
 * Run:  k6 run smoke.js
 * Env:  BASE_URL=http://localhost:3000
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { BASE_URL, THRESHOLDS, login, thinkTime } from './config.js';

// ─────────────────────────────────────────────────────────────────────────────
// Options
// ─────────────────────────────────────────────────────────────────────────────

export const options = {
  vus: 2,
  duration: '30s',
  thresholds: THRESHOLDS.smoke,
  tags: { test_type: 'smoke' },
};

// ─────────────────────────────────────────────────────────────────────────────
// Test
// ─────────────────────────────────────────────────────────────────────────────

export default function () {
  // 1. Health check (unauthenticated — returns basic status)
  const healthRes = http.get(`${BASE_URL}/api/health`);
  check(healthRes, {
    'health status 200': (r) => r.status === 200,
    'health has status field': (r) => {
      try { return JSON.parse(r.body).status !== undefined; }
      catch { return false; }
    },
  });

  sleep(thinkTime(0.5, 1));

  // 2. Public stats (no auth required)
  const statsRes = http.get(`${BASE_URL}/api/public/stats`);
  check(statsRes, {
    'stats status 200': (r) => r.status === 200,
    'stats has completedProjects': (r) => {
      try { return JSON.parse(r.body).completedProjects !== undefined; }
      catch { return false; }
    },
  });

  sleep(thinkTime(0.5, 1));

  // 3. Login endpoint — verify it responds correctly
  const loginRes = http.post(
    `${BASE_URL}/api/auth/login`,
    JSON.stringify({ email: 'nonexistent@smoke.test', password: 'wrong' }),
    { headers: { 'Content-Type': 'application/json' } },
  );
  check(loginRes, {
    'login returns 401 for bad creds': (r) => r.status === 401,
  });

  sleep(thinkTime(0.5, 1));

  // 4. If we have credentials, try a real login + dashboard
  const auth = login();
  if (auth.success) {
    const dashRes = http.get(`${BASE_URL}/api/dashboard`);
    check(dashRes, {
      'dashboard status 200': (r) => r.status === 200,
      'dashboard has stats': (r) => {
        try { return JSON.parse(r.body).stats !== undefined; }
        catch { return false; }
      },
    });
  }

  sleep(thinkTime());
}
