/**
 * BluePrint Stress Test
 *
 * Pushes the system beyond expected production load to find breaking points.
 * 200 peak VUs over ~5 minutes.
 *
 * Run:  k6 run stress.js
 * Env:  BASE_URL, TEST_EMAIL, TEST_PASSWORD
 */

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Trend } from 'k6/metrics';
import { BASE_URL, THRESHOLDS, login, thinkTime, randomPick } from './config.js';

// ─────────────────────────────────────────────────────────────────────────────
// Custom metrics
// ─────────────────────────────────────────────────────────────────────────────

const dashboardTrend = new Trend('stress_dashboard_duration', true);
const projectsTrend  = new Trend('stress_projects_duration', true);
const invoicesTrend  = new Trend('stress_invoices_duration', true);
const clientsTrend   = new Trend('stress_clients_duration', true);
const tasksTrend     = new Trend('stress_tasks_duration', true);

// ─────────────────────────────────────────────────────────────────────────────
// Options — aggressive ramp
// ─────────────────────────────────────────────────────────────────────────────

export const options = {
  stages: [
    { duration: '1m', target: 50 },    // ramp up to 50
    { duration: '1m', target: 50 },    // hold at 50
    { duration: '1m', target: 200 },   // ramp up to 200
    { duration: '2m', target: 200 },   // hold at 200
    { duration: '30s', target: 0 },    // ramp down
  ],
  thresholds: THRESHOLDS.stress,
  tags: { test_type: 'stress' },
};

// ─────────────────────────────────────────────────────────────────────────────
// Setup
// ─────────────────────────────────────────────────────────────────────────────

export function setup() {
  const healthRes = http.get(`${BASE_URL}/api/health`);
  return { healthy: healthRes.status === 200 };
}

// ─────────────────────────────────────────────────────────────────────────────
// Test — same endpoints as load test but at higher concurrency
// ─────────────────────────────────────────────────────────────────────────────

export default function (data) {
  const auth = login();

  // ── Health check ──────────────────────────────────────────────────────────
  group('Health Check', () => {
    const res = http.get(`${BASE_URL}/api/health`);
    check(res, { 'health 200': (r) => r.status === 200 });
  });

  sleep(thinkTime(0.3, 0.8));

  // ── Public stats (lightweight) ────────────────────────────────────────────
  group('Public Stats', () => {
    const res = http.get(`${BASE_URL}/api/public/stats`);
    check(res, { 'stats 200': (r) => r.status === 200 });
  });

  sleep(thinkTime(0.3, 0.8));

  if (!auth.success) {
    // Skip authenticated endpoints if login failed
    sleep(thinkTime());
    return;
  }

  // ── Dashboard (heavy query) ───────────────────────────────────────────────
  group('Dashboard', () => {
    const res = http.get(`${BASE_URL}/api/dashboard`);
    dashboardTrend.add(res.timings.duration);
    check(res, {
      'dashboard 200': (r) => r.status === 200,
      'dashboard under 3s': (r) => r.timings.duration < 3000,
    });
  });

  sleep(thinkTime(0.5, 1.5));

  // ── Projects list ─────────────────────────────────────────────────────────
  group('Projects', () => {
    const page = Math.floor(Math.random() * 5) + 1;
    const statuses = ['', 'ACTIVE', 'COMPLETED', 'DELAYED', 'ON_HOLD'];
    const status = randomPick(statuses);
    const url = `${BASE_URL}/api/projects?page=${page}&limit=20${status ? `&status=${status}` : ''}`;
    const res = http.get(url);
    projectsTrend.add(res.timings.duration);
    check(res, {
      'projects 200': (r) => r.status === 200,
    });
  });

  sleep(thinkTime(0.5, 1.5));

  // ── Invoices list ─────────────────────────────────────────────────────────
  group('Invoices', () => {
    const res = http.get(`${BASE_URL}/api/invoices?page=1&limit=20`);
    invoicesTrend.add(res.timings.duration);
    check(res, {
      'invoices 200': (r) => r.status === 200,
    });
  });

  sleep(thinkTime(0.5, 1.5));

  // ── Clients list ──────────────────────────────────────────────────────────
  group('Clients', () => {
    const res = http.get(`${BASE_URL}/api/clients?page=1&limit=20`);
    clientsTrend.add(res.timings.duration);
    check(res, {
      'clients 200': (r) => r.status === 200,
    });
  });

  sleep(thinkTime(0.5, 1.5));

  // ── Tasks list ────────────────────────────────────────────────────────────
  group('Tasks', () => {
    const res = http.get(`${BASE_URL}/api/tasks?page=1&limit=20`);
    tasksTrend.add(res.timings.duration);
    check(res, {
      'tasks 200': (r) => r.status === 200,
    });
  });

  sleep(thinkTime(0.5, 1.5));

  // ── Search (expensive query) ──────────────────────────────────────────────
  group('Search', () => {
    const queries = ['villa', 'فيلا', 'project', 'مشروع', 'tower'];
    const q = randomPick(queries);
    const res = http.get(`${BASE_URL}/api/search?q=${encodeURIComponent(q)}`);
    check(res, {
      'search 200': (r) => r.status === 200,
    });
  });

  sleep(thinkTime());
}
