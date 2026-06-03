/**
 * BluePrint Projects API Load Test
 *
 * Focused load test for the Projects API:
 * - List projects (paginated, filtered)
 * - Create project
 * - Read single project
 * - Update project
 * - Delete project
 *
 * Run:  k6 run tests/projects.js
 * Env:  BASE_URL, TEST_EMAIL, TEST_PASSWORD
 */

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Trend, Counter, Rate } from 'k6/metrics';
import {
  BASE_URL,
  THRESHOLDS,
  STAGES,
  login,
  thinkTime,
  randomPick,
} from '../config.js';

// ─────────────────────────────────────────────────────────────────────────────
// Custom metrics
// ─────────────────────────────────────────────────────────────────────────────

const listTrend     = new Trend('projects_list_duration', true);
const createTrend   = new Trend('projects_create_duration', true);
const readTrend     = new Trend('projects_read_duration', true);
const updateTrend   = new Trend('projects_update_duration', true);
const deleteTrend   = new Trend('projects_delete_duration', true);
const createCounter = new Counter('projects_created_total');
const projectErrors = new Rate('projects_errors');

// ─────────────────────────────────────────────────────────────────────────────
// Options
// ─────────────────────────────────────────────────────────────────────────────

const stageProfile = __ENV.STAGE_PROFILE || 'load';

export const options = {
  stages: STAGES[stageProfile] || STAGES.load,
  thresholds: {
    ...THRESHOLDS.load,
    'projects_list_duration':   ['p(95)<800'],
    'projects_create_duration': ['p(95)<1500'],
    'projects_read_duration':   ['p(95)<600'],
    'projects_update_duration': ['p(95)<1000'],
  },
  tags: { test_type: 'projects', stage_profile: stageProfile },
};

// ─────────────────────────────────────────────────────────────────────────────
// Test data — supports Arabic text
// ─────────────────────────────────────────────────────────────────────────────

const projectNames = [
  'فيلا محمد الرشيدي',
  'برج التجارة الدولي',
  'مجمع حدائق النخيل',
  'Al Hamra Residential Tower',
  'Marina Bay Villa Complex',
  'مشروع البنية التحتية - المرحلة 2',
];

const projectTypes = ['VILLA', 'BUILDING', 'TOWER', 'COMPOUND', 'INFRASTRUCTURE', 'INTERIOR', 'LANDSCAPE'];
const statuses     = ['', 'ACTIVE', 'COMPLETED', 'DELAYED', 'ON_HOLD'];

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

export default function (data) {
  // Authenticate first
  const auth = login();
  if (!auth.success) {
    console.warn(`VU ${__VU}: login failed — skipping projects test`);
    sleep(thinkTime());
    return;
  }

  let createdProjectId = '';

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. List projects (with random pagination & status filter)
  // ═══════════════════════════════════════════════════════════════════════════

  group('Projects - List', () => {
    const page = Math.floor(Math.random() * 5) + 1;
    const status = randomPick(statuses);
    const url = `${BASE_URL}/api/projects?page=${page}&limit=20${status ? `&status=${status}` : ''}`;
    const res = http.get(url);

    listTrend.add(res.timings.duration);

    const ok = check(res, {
      'projects list 200': (r) => r.status === 200,
      'projects has data': (r) => {
        try { return Array.isArray(JSON.parse(r.body).projects); }
        catch { return false; }
      },
    });

    projectErrors.add(!ok);
  });

  sleep(thinkTime(0.5, 1.5));

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. Create project
  // ═══════════════════════════════════════════════════════════════════════════

  group('Projects - Create', () => {
    const idx = __ITER % projectNames.length;
    const payload = JSON.stringify({
      number: `PRJ-K6-${Date.now()}-${__VU}-${__ITER}`,
      name: projectNames[idx],
      nameEn: `K6 Load Test Project VU${__VU}-Iter${__ITER}`,
      clientId: 'test-client',
      type: randomPick(projectTypes),
      budget: Math.floor(Math.random() * 5000000) + 500000,
      location: randomPick(['Al Hamra, RAK', 'Dubai Marina', 'أبوظبي - الجزيرة', 'Sharjah Industrial']),
      description: `مشروع اختبار الحمل - VU ${__VU} - تكرار ${__ITER}`,
    });

    const res = http.post(`${BASE_URL}/api/projects`, payload, {
      headers: { 'Content-Type': 'application/json' },
    });

    createTrend.add(res.timings.duration);

    check(res, {
      'projects create 201 or 400': (r) => r.status === 201 || r.status === 400,
    });

    if (res.status === 201) {
      try {
        createdProjectId = JSON.parse(res.body).id;
        createCounter.add(1);
      } catch { /* ignore parse error */ }
    }
  });

  sleep(thinkTime(0.5, 1.5));

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. Read single project
  // ═══════════════════════════════════════════════════════════════════════════

  group('Projects - Read', () => {
    const targetId = createdProjectId || 'nonexistent-id';
    const res = http.get(`${BASE_URL}/api/projects/${targetId}`);

    readTrend.add(res.timings.duration);

    check(res, {
      'projects read 200 or 404': (r) => r.status === 200 || r.status === 404,
    });
  });

  sleep(thinkTime(0.5, 1.5));

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. Update project (only if we created one)
  // ═══════════════════════════════════════════════════════════════════════════

  if (createdProjectId) {
    group('Projects - Update', () => {
      const payload = JSON.stringify({
        name: `مشروع محدث - K6 VU${__VU}`,
        progress: Math.floor(Math.random() * 100),
      });

      const res = http.put(`${BASE_URL}/api/projects/${createdProjectId}`, payload, {
        headers: { 'Content-Type': 'application/json' },
      });

      updateTrend.add(res.timings.duration);

      check(res, {
        'projects update 200 or 404': (r) => r.status === 200 || r.status === 404,
      });
    });

    sleep(thinkTime(0.5, 1.5));

    // ═════════════════════════════════════════════════════════════════════════
    // 5. Delete project (cleanup)
    // ═══════════════════════════════════════════════════════════════════════════

    group('Projects - Delete', () => {
      const res = http.del(`${BASE_URL}/api/projects/${createdProjectId}`);

      deleteTrend.add(res.timings.duration);

      check(res, {
        'projects delete 200/204/404': (r) =>
          r.status === 200 || r.status === 204 || r.status === 404,
      });
    });

    sleep(thinkTime(0.5, 1));
  }

  sleep(thinkTime());
}
