/* eslint-disable import/no-anonymous-default-export */
/**
 * BluePrint Dashboard API Load Test
 *
 * Focused load test for the Dashboard API:
 * - Main dashboard data (stats, charts, activities)
 * - Dashboard layout
 * - Dashboard presets
 * - Public stats (unauthenticated)
 *
 * Run:  k6 run tests/dashboard.js
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

const dashboardTrend = new Trend('dashboard_main_duration', true);
const layoutTrend    = new Trend('dashboard_layout_duration', true);
const presetsTrend   = new Trend('dashboard_presets_duration', true);
const publicStatsTrend = new Trend('dashboard_public_stats_duration', true);
const dashboardErrors = new Rate('dashboard_errors');

// ─────────────────────────────────────────────────────────────────────────────
// Options
// ─────────────────────────────────────────────────────────────────────────────

const stageProfile = __ENV.STAGE_PROFILE || 'load';

export const options = {
  stages: STAGES[stageProfile] || STAGES.load,
  thresholds: {
    ...THRESHOLDS.load,
    'dashboard_main_duration':        ['p(95)<2000'],
    'dashboard_layout_duration':      ['p(95)<1000'],
    'dashboard_presets_duration':     ['p(95)<1000'],
    'dashboard_public_stats_duration': ['p(95)<500'],
  },
  tags: { test_type: 'dashboard', stage_profile: stageProfile },
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
  // ═══════════════════════════════════════════════════════════════════════════
  // 1. Public stats (unauthenticated — lightweight)
  // ═══════════════════════════════════════════════════════════════════════════

  group('Dashboard - Public Stats', () => {
    const res = http.get(`${BASE_URL}/api/public/stats`);
    publicStatsTrend.add(res.timings.duration);

    const ok = check(res, {
      'public stats 200': (r) => r.status === 200,
      'public stats has completedProjects': (r) => {
        try { return JSON.parse(r.body).completedProjects !== undefined; }
        catch { return false; }
      },
    });

    dashboardErrors.add(!ok);
  });

  sleep(thinkTime(0.3, 0.8));

  // Authenticate for protected endpoints
  const auth = login();
  if (!auth.success) {
    console.warn(`VU ${__VU}: login failed — testing public stats only`);
    sleep(thinkTime());
    return;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. Main dashboard data
  // ═══════════════════════════════════════════════════════════════════════════

  group('Dashboard - Main', () => {
    const res = http.get(`${BASE_URL}/api/dashboard`);
    dashboardTrend.add(res.timings.duration);

    const ok = check(res, {
      'dashboard 200': (r) => r.status === 200,
      'dashboard has stats': (r) => {
        try { return JSON.parse(r.body).stats !== undefined; }
        catch { return false; }
      },
      'dashboard under 3s': (r) => r.timings.duration < 3000,
    });

    dashboardErrors.add(!ok);
  });

  sleep(thinkTime(0.5, 1.5));

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. Dashboard layout
  // ═══════════════════════════════════════════════════════════════════════════

  group('Dashboard - Layout', () => {
    const res = http.get(`${BASE_URL}/api/dashboard/layout`);
    layoutTrend.add(res.timings.duration);

    check(res, {
      'dashboard layout 200': (r) => r.status === 200,
    });
  });

  sleep(thinkTime(0.3, 1));

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. Dashboard presets
  // ═══════════════════════════════════════════════════════════════════════════

  group('Dashboard - Presets', () => {
    const res = http.get(`${BASE_URL}/api/dashboard/presets`);
    presetsTrend.add(res.timings.duration);

    check(res, {
      'dashboard presets 200': (r) => r.status === 200,
    });
  });

  sleep(thinkTime());
}
