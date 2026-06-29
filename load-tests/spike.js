/* eslint-disable import/no-anonymous-default-export */
/**
 * BluePrint Spike Test
 *
 * Simulates a sudden traffic surge to verify the system doesn't crash
 * and recovers after the spike subsides.
 *
 * 10 → 500 → 10 VUs
 *
 * Run:  k6 run spike.js
 * Env:  BASE_URL, TEST_EMAIL, TEST_PASSWORD
 */

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Trend, Rate } from 'k6/metrics';
import { BASE_URL, THRESHOLDS, login, thinkTime } from './config.js';

// ─────────────────────────────────────────────────────────────────────────────
// Custom metrics
// ─────────────────────────────────────────────────────────────────────────────

const healthTrend     = new Trend('spike_health_duration', true);
const apiTrend        = new Trend('spike_api_duration', true);
const recoveryTrend   = new Trend('spike_recovery_duration', true);
const errorRate       = new Rate('spike_errors');

// ─────────────────────────────────────────────────────────────────────────────
// Options — dramatic spike pattern
// ─────────────────────────────────────────────────────────────────────────────

export const options = {
  stages: [
    { duration: '30s', target: 10 },   // baseline
    { duration: '10s', target: 500 },  // spike!
    { duration: '30s', target: 500 },  // hold spike
    { duration: '10s', target: 10 },   // drop back
    { duration: '30s', target: 10 },   // recovery observation
  ],
  thresholds: THRESHOLDS.spike,
  tags: { test_type: 'spike' },
};

// ─────────────────────────────────────────────────────────────────────────────
// Setup
// ─────────────────────────────────────────────────────────────────────────────

export function setup() {
  const res = http.get(`${BASE_URL}/api/health`);
  return { healthy: res.status === 200 };
}

// ─────────────────────────────────────────────────────────────────────────────
// Test
// ─────────────────────────────────────────────────────────────────────────────

export default function (_data) {
  // ── Health check (lightweight — primary spike indicator) ──────────────────
  group('Health Check', () => {
    const res = http.get(`${BASE_URL}/api/health`);
    healthTrend.add(res.timings.duration);
    const _ok = check(res, {
      'health 200': (r) => r.status === 200,
      'health under 1s': (r) => r.timings.duration < 1000,
    });
    errorRate.add(!_ok);
  });

  sleep(thinkTime(0.2, 0.5));

  // ── Public stats ──────────────────────────────────────────────────────────
  group('Public Stats', () => {
    const res = http.get(`${BASE_URL}/api/public/stats`);
    const _ok = check(res, {
      'stats 200': (r) => r.status === 200,
    });
    errorRate.add(!_ok);
  });

  sleep(thinkTime(0.2, 0.5));

  // ── Authenticate and hit protected endpoints ──────────────────────────────
  const auth = login();

  if (auth.success) {
    // Dashboard — heaviest protected endpoint
    group('Dashboard (spike)', () => {
      const res = http.get(`${BASE_URL}/api/dashboard`);
      apiTrend.add(res.timings.duration);
      const _ok = check(res, {
        'dashboard 200 or 429': (r) => r.status === 200 || r.status === 429,
        'dashboard under 5s': (r) => r.timings.duration < 5000,
      });
      errorRate.add(res.status >= 500);
    });

    sleep(thinkTime(0.3, 0.8));

    // Projects list — common endpoint
    group('Projects (spike)', () => {
      const res = http.get(`${BASE_URL}/api/projects?page=1&limit=20`);
      apiTrend.add(res.timings.duration);
      const _ok = check(res, {
        'projects 200 or 429': (r) => r.status === 200 || r.status === 429,
      });
      errorRate.add(res.status >= 500);
    });

    sleep(thinkTime(0.3, 0.8));

    // Recovery check — dashboard again (measures if system recovers)
    group('Recovery Check', () => {
      const res = http.get(`${BASE_URL}/api/dashboard`);
      recoveryTrend.add(res.timings.duration);
      check(res, {
        'recovery dashboard 200': (r) => r.status === 200,
      });
    });
  }

  sleep(thinkTime(0.2, 0.5));
}

// ─────────────────────────────────────────────────────────────────────────────
// Teardown — final health check
// ─────────────────────────────────────────────────────────────────────────────

export function teardown(_data) {
  const res = http.get(`${BASE_URL}/api/health`);
  console.info(`Post-spike health check: HTTP ${res.status}`);
  if (res.status !== 200) {
    console.error('System did NOT recover after spike!');
  }
}
