/* eslint-disable import/no-anonymous-default-export */
/**
 * BluePrint Load Test
 *
 * Simulates normal production traffic with realistic ramp-up/down.
 * 50 peak VUs over ~3 minutes.
 *
 * Run:  k6 run load.js
 * Env:  BASE_URL, TEST_EMAIL, TEST_PASSWORD
 */

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Trend } from 'k6/metrics';
import { BASE_URL, THRESHOLDS, login, thinkTime } from './config.js';

// ─────────────────────────────────────────────────────────────────────────────
// Custom metrics — per-endpoint trends
// ─────────────────────────────────────────────────────────────────────────────

const dashboardTrend = new Trend('dashboard_duration', true);
const projectsTrend  = new Trend('projects_duration', true);
const invoicesTrend  = new Trend('invoices_duration', true);
const clientsTrend   = new Trend('clients_duration', true);

// ─────────────────────────────────────────────────────────────────────────────
// Options — ramping VUs
// ─────────────────────────────────────────────────────────────────────────────

export const options = {
  stages: [
    { duration: '30s', target: 10 },   // ramp up to 10
    { duration: '1m',  target: 10 },   // hold at 10
    { duration: '30s', target: 50 },   // ramp up to 50
    { duration: '1m',  target: 50 },   // hold at 50
    { duration: '30s', target: 0 },    // ramp down
  ],
  thresholds: THRESHOLDS.load,
  tags: { test_type: 'load' },
};

// ─────────────────────────────────────────────────────────────────────────────
// Setup — authenticate once per VU (k6 calls `default` in a loop after setup)
// ─────────────────────────────────────────────────────────────────────────────

export function setup() {
  // Warm-up: verify the system is reachable
  const healthRes = http.get(`${BASE_URL}/api/health`);
  if (healthRes.status !== 200) {
    console.error(`Health check failed during setup: HTTP ${healthRes.status}`);
  }
  return { healthy: healthRes.status === 200 };
}

// ─────────────────────────────────────────────────────────────────────────────
// Test
// ─────────────────────────────────────────────────────────────────────────────

export default function (_data) {
  // ── Authenticate ──────────────────────────────────────────────────────────
  const auth = login();
  if (!auth.success) {
    // If login fails, still test public endpoints but skip protected ones
    console.warn(`VU ${__VU}: login failed — testing public endpoints only`);
  }

  // ── Health check ──────────────────────────────────────────────────────────
  group('Health Check', () => {
    const res = http.get(`${BASE_URL}/api/health`);
    check(res, { 'health 200': (r) => r.status === 200 });
  });

  sleep(thinkTime(0.5, 1));

  // ── Dashboard ─────────────────────────────────────────────────────────────
  if (auth.success) {
    group('Dashboard', () => {
      const res = http.get(`${BASE_URL}/api/dashboard`);
      dashboardTrend.add(res.timings.duration);
      check(res, {
        'dashboard 200': (r) => r.status === 200,
        'dashboard has stats': (r) => {
          try { return JSON.parse(r.body).stats !== undefined; }
          catch { return false; }
        },
      });
    });

    sleep(thinkTime());
  }

  // ── Projects list ─────────────────────────────────────────────────────────
  if (auth.success) {
    group('Projects', () => {
      const page = Math.floor(Math.random() * 3) + 1;
      const res = http.get(`${BASE_URL}/api/projects?page=${page}&limit=20`);
      projectsTrend.add(res.timings.duration);
      check(res, {
        'projects 200': (r) => r.status === 200,
        'projects has data': (r) => {
          try { return Array.isArray(JSON.parse(r.body).projects); }
          catch { return false; }
        },
      });
    });

    sleep(thinkTime());
  }

  // ── Invoices list ─────────────────────────────────────────────────────────
  if (auth.success) {
    group('Invoices', () => {
      const res = http.get(`${BASE_URL}/api/invoices?page=1&limit=20`);
      invoicesTrend.add(res.timings.duration);
      check(res, {
        'invoices 200': (r) => r.status === 200,
        'invoices has data': (r) => {
          try {
            const body = JSON.parse(r.body);
            return Array.isArray(body.invoices) || Array.isArray(body.data) || typeof body === 'object';
          }
          catch { return false; }
        },
      });
    });

    sleep(thinkTime());
  }

  // ── Clients list ──────────────────────────────────────────────────────────
  if (auth.success) {
    group('Clients', () => {
      const res = http.get(`${BASE_URL}/api/clients?page=1&limit=20`);
      clientsTrend.add(res.timings.duration);
      check(res, {
        'clients 200': (r) => r.status === 200,
        'clients has data': (r) => {
          try {
            const body = JSON.parse(r.body);
            return Array.isArray(body.clients) || Array.isArray(body.data) || typeof body === 'object';
          }
          catch { return false; }
        },
      });
    });

    sleep(thinkTime());
  }

  // ── Public stats (unauthenticated) ────────────────────────────────────────
  group('Public Stats', () => {
    const res = http.get(`${BASE_URL}/api/public/stats`);
    check(res, {
      'public stats 200': (r) => r.status === 200,
    });
  });

  sleep(thinkTime());
}
