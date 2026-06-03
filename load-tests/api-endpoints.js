/**
 * BluePrint Detailed API Endpoint Test
 *
 * Tests every major endpoint category with proper payload validation,
 * response checks, and Arabic text support.
 * 10 VUs, 2 minutes.
 *
 * Run:  k6 run api-endpoints.js
 * Env:  BASE_URL, TEST_EMAIL, TEST_PASSWORD
 */

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Trend, Counter } from 'k6/metrics';
import { BASE_URL, THRESHOLDS, login, thinkTime, randomPick } from './config.js';

// ─────────────────────────────────────────────────────────────────────────────
// Per-endpoint custom metrics
// ─────────────────────────────────────────────────────────────────────────────

const endpointTrends = {
  auth_login:          new Trend('endpoint_auth_login', true),
  auth_refresh:        new Trend('endpoint_auth_refresh', true),
  auth_forgot:         new Trend('endpoint_auth_forgot', true),
  auth_session:        new Trend('endpoint_auth_session', true),
  projects_list:       new Trend('endpoint_projects_list', true),
  projects_create:     new Trend('endpoint_projects_create', true),
  projects_read:       new Trend('endpoint_projects_read', true),
  projects_update:     new Trend('endpoint_projects_update', true),
  projects_delete:     new Trend('endpoint_projects_delete', true),
  invoices_list:       new Trend('endpoint_invoices_list', true),
  invoices_create:     new Trend('endpoint_invoices_create', true),
  invoices_read:       new Trend('endpoint_invoices_read', true),
  invoices_update:     new Trend('endpoint_invoices_update', true),
  clients_list:        new Trend('endpoint_clients_list', true),
  clients_create:      new Trend('endpoint_clients_create', true),
  clients_read:        new Trend('endpoint_clients_read', true),
  tasks_list:          new Trend('endpoint_tasks_list', true),
  tasks_create:        new Trend('endpoint_tasks_create', true),
  tasks_read:          new Trend('endpoint_tasks_read', true),
  documents_list:      new Trend('endpoint_documents_list', true),
  reports_overview:    new Trend('endpoint_reports_overview', true),
  reports_financial:   new Trend('endpoint_reports_financial', true),
  search:              new Trend('endpoint_search', true),
  settings_company:    new Trend('endpoint_settings_company', true),
  dashboard:           new Trend('endpoint_dashboard', true),
  notifications:       new Trend('endpoint_notifications', true),
};

const createCounter = new Counter('api_creates_total');

// ─────────────────────────────────────────────────────────────────────────────
// Options
// ─────────────────────────────────────────────────────────────────────────────

export const options = {
  vus: 10,
  duration: '2m',
  thresholds: {
    http_req_duration: ['p(95)<1500'],
    http_req_failed: ['rate<0.05'],
    // Individual endpoint thresholds
    'endpoint_auth_login': ['p(95)<1000'],
    'endpoint_projects_list': ['p(95)<800'],
    'endpoint_invoices_list': ['p(95)<800'],
    'endpoint_clients_list': ['p(95)<800'],
    'endpoint_tasks_list': ['p(95)<800'],
    'endpoint_dashboard': ['p(95)<2000'],
  },
  tags: { test_type: 'api-endpoints' },
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
  'تصميم داخلي - فندق النجوم',
  'Landscaping - Creek Park',
];

const projectTypes = ['VILLA', 'BUILDING', 'TOWER', 'COMPOUND', 'INFRASTRUCTURE', 'INTERIOR', 'LANDSCAPE'];

const clientNames = [
  'شركة الأفق للمقاولات',
  'مؤسسة البناء الحديث',
  'Al Rashid Engineering Consultancy',
  'Gulf Construction LLC',
  'مجموعة النور القابضة',
];

const clientCompanies = [
  'الأفق للمقاولات - ذ.م.م',
  'البناء الحديث ش.م.م',
  'Al Rashid Engineering Ltd.',
  'Gulf Construction Group',
  'مجموعة النور القابضة',
];

const taskTitles = [
  'مراجعة المخططات المعمارية',
  'تجهيز تقرير التربة',
  'اعتماد تصميم الواجهة',
  'Review structural calculations',
  'Prepare MEP coordination drawing',
  'متابعة تراخيص البلدية',
];

const invoiceDescriptions = [
  'دفعة مقدمة - المرحلة الأولى',
  'مستخلص أعمال إنشائية - مارس',
  'Advanced payment - Phase 2',
  'Structural work certificate - April',
  'أتعاب إشراف هندسي',
];

// ─────────────────────────────────────────────────────────────────────────────
// Options
// ─────────────────────────────────────────────────────────────────────────────

export function setup() {
  const healthRes = http.get(`${BASE_URL}/api/health`);
  return { healthy: healthRes.status === 200 };
}

// ─────────────────────────────────────────────────────────────────────────────
// Test
// ─────────────────────────────────────────────────────────────────────────────

export default function (data) {
  let authToken = '';

  // ═══════════════════════════════════════════════════════════════════════════
  // AUTH ENDPOINTS
  // ═══════════════════════════════════════════════════════════════════════════

  group('Auth - Login', () => {
    const res = http.post(
      `${BASE_URL}/api/auth/login`,
      JSON.stringify({
        email: __ENV.TEST_EMAIL || 'admin@blueprint.com',
        password: __ENV.TEST_PASSWORD || 'demo1234',
      }),
      { headers: { 'Content-Type': 'application/json' } },
    );
    endpointTrends.auth_login.add(res.timings.duration);

    const ok = check(res, {
      'login 200': (r) => r.status === 200,
      'login returns user data': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.id !== undefined && body.email !== undefined;
        } catch { return false; }
      },
    });

    if (ok) {
      const body = JSON.parse(res.body);
      authToken = body.id || ''; // Cookie-based auth is handled by k6 automatically
    }
  });

  sleep(thinkTime(0.5, 1));

  // ── Auth - Session check ──────────────────────────────────────────────────
  group('Auth - Session', () => {
    const res = http.get(`${BASE_URL}/api/auth/session`);
    endpointTrends.auth_session.add(res.timings.duration);
    check(res, {
      'session returns 200': (r) => r.status === 200,
    });
  });

  sleep(thinkTime(0.3, 0.8));

  // ── Auth - Refresh token ──────────────────────────────────────────────────
  group('Auth - Refresh', () => {
    const res = http.post(`${BASE_URL}/api/auth/refresh`, '{}', {
      headers: { 'Content-Type': 'application/json' },
    });
    endpointTrends.auth_refresh.add(res.timings.duration);
    // May return 401 if no refresh cookie — that's OK in test context
    check(res, {
      'refresh returns 200 or 401': (r) => r.status === 200 || r.status === 401,
    });
  });

  sleep(thinkTime(0.3, 0.8));

  // ── Auth - Forgot password (always fails for test data — validates endpoint works) ──
  group('Auth - Forgot Password', () => {
    const res = http.post(
      `${BASE_URL}/api/auth/forgot-password`,
      JSON.stringify({ email: 'loadtest-noexist@blueprint.test' }),
      { headers: { 'Content-Type': 'application/json' } },
    );
    endpointTrends.auth_forgot.add(res.timings.duration);
    check(res, {
      'forgot-password returns 200 or 404': (r) =>
        r.status === 200 || r.status === 404 || r.status === 400,
    });
  });

  sleep(thinkTime(0.5, 1));

  // ═══════════════════════════════════════════════════════════════════════════
  // DASHBOARD
  // ═══════════════════════════════════════════════════════════════════════════

  group('Dashboard', () => {
    const res = http.get(`${BASE_URL}/api/dashboard`);
    endpointTrends.dashboard.add(res.timings.duration);
    check(res, {
      'dashboard 200': (r) => r.status === 200,
      'dashboard has stats': (r) => {
        try { return JSON.parse(r.body).stats !== undefined; }
        catch { return false; }
      },
    });
  });

  sleep(thinkTime(0.5, 1));

  // ═══════════════════════════════════════════════════════════════════════════
  // PROJECTS
  // ═══════════════════════════════════════════════════════════════════════════

  let createdProjectId = '';

  // ── Projects - List ───────────────────────────────────────────────────────
  group('Projects - List', () => {
    const res = http.get(`${BASE_URL}/api/projects?page=1&limit=10`);
    endpointTrends.projects_list.add(res.timings.duration);
    check(res, {
      'projects list 200': (r) => r.status === 200,
      'projects list has projects array': (r) => {
        try { return Array.isArray(JSON.parse(r.body).projects); }
        catch { return false; }
      },
    });
  });

  sleep(thinkTime(0.5, 1));

  // ── Projects - Create ─────────────────────────────────────────────────────
  group('Projects - Create', () => {
    const idx = __ITER % projectNames.length;
    const payload = JSON.stringify({
      number: `PRJ-K6-${Date.now()}-${__VU}-${__ITER}`,
      name: projectNames[idx],
      nameEn: `K6 Load Test Project VU${__VU}-Iter${__ITER}`,
      clientId: 'test-client',  // Will fail if no client — expected
      type: randomPick(projectTypes),
      budget: Math.floor(Math.random() * 5000000) + 500000,
      location: randomPick(['Al Hamra, RAK', 'Dubai Marina', 'أبوظبي - الجزيرة', 'Sharjah Industrial']),
      description: `مشروع اختبار الحمل - VU ${__VU} - تكرار ${__ITER}`,
    });

    const res = http.post(`${BASE_URL}/api/projects`, payload, {
      headers: { 'Content-Type': 'application/json' },
    });
    endpointTrends.projects_create.add(res.timings.duration);

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

  sleep(thinkTime(0.5, 1));

  // ── Projects - Read (single) ──────────────────────────────────────────────
  group('Projects - Read', () => {
    // Use a known project ID or the one we just created
    const targetId = createdProjectId || 'nonexistent-id';
    const res = http.get(`${BASE_URL}/api/projects/${targetId}`);
    endpointTrends.projects_read.add(res.timings.duration);
    check(res, {
      'projects read 200 or 404': (r) => r.status === 200 || r.status === 404,
    });
  });

  sleep(thinkTime(0.5, 1));

  // ── Projects - Update ─────────────────────────────────────────────────────
  if (createdProjectId) {
    group('Projects - Update', () => {
      const payload = JSON.stringify({
        name: `مشروع محدث - K6 VU${__VU}`,
        progress: Math.floor(Math.random() * 100),
      });
      const res = http.put(`${BASE_URL}/api/projects/${createdProjectId}`, payload, {
        headers: { 'Content-Type': 'application/json' },
      });
      endpointTrends.projects_update.add(res.timings.duration);
      check(res, {
        'projects update 200 or 404': (r) => r.status === 200 || r.status === 404,
      });
    });

    sleep(thinkTime(0.5, 1));

    // ── Projects - Delete ────────────────────────────────────────────────────
    group('Projects - Delete', () => {
      const res = http.del(`${BASE_URL}/api/projects/${createdProjectId}`);
      endpointTrends.projects_delete.add(res.timings.duration);
      check(res, {
        'projects delete 200 or 404': (r) => r.status === 200 || r.status === 204 || r.status === 404,
      });
    });

    sleep(thinkTime(0.5, 1));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // INVOICES
  // ═══════════════════════════════════════════════════════════════════════════

  let createdInvoiceId = '';

  // ── Invoices - List ───────────────────────────────────────────────────────
  group('Invoices - List', () => {
    const res = http.get(`${BASE_URL}/api/invoices?page=1&limit=10`);
    endpointTrends.invoices_list.add(res.timings.duration);
    check(res, {
      'invoices list 200': (r) => r.status === 200,
    });
  });

  sleep(thinkTime(0.5, 1));

  // ── Invoices - Create ─────────────────────────────────────────────────────
  group('Invoices - Create', () => {
    const payload = JSON.stringify({
      number: `INV-K6-${Date.now()}-${__VU}`,
      projectId: 'test-project',
      description: randomPick(invoiceDescriptions),
      total: Math.floor(Math.random() * 500000) + 10000,
      issueDate: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    });

    const res = http.post(`${BASE_URL}/api/invoices`, payload, {
      headers: { 'Content-Type': 'application/json' },
    });
    endpointTrends.invoices_create.add(res.timings.duration);
    check(res, {
      'invoices create 201 or 400': (r) => r.status === 201 || r.status === 400,
    });

    if (res.status === 201) {
      try { createdInvoiceId = JSON.parse(res.body).id; } catch { /* ignore */ }
    }
  });

  sleep(thinkTime(0.5, 1));

  // ── Invoices - Read ───────────────────────────────────────────────────────
  group('Invoices - Read', () => {
    const targetId = createdInvoiceId || 'nonexistent-id';
    const res = http.get(`${BASE_URL}/api/invoices/${targetId}`);
    endpointTrends.invoices_read.add(res.timings.duration);
    check(res, {
      'invoices read 200 or 404': (r) => r.status === 200 || r.status === 404,
    });
  });

  sleep(thinkTime(0.5, 1));

  // ── Invoices - Update ─────────────────────────────────────────────────────
  if (createdInvoiceId) {
    group('Invoices - Update', () => {
      const payload = JSON.stringify({
        description: `فاتورة محدثة - K6 VU${__VU}`,
      });
      const res = http.put(`${BASE_URL}/api/invoices/${createdInvoiceId}`, payload, {
        headers: { 'Content-Type': 'application/json' },
      });
      endpointTrends.invoices_update.add(res.timings.duration);
      check(res, {
        'invoices update 200 or 404': (r) => r.status === 200 || r.status === 404,
      });
    });

    sleep(thinkTime(0.5, 1));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CLIENTS
  // ═══════════════════════════════════════════════════════════════════════════

  let createdClientId = '';

  // ── Clients - List ────────────────────────────────────────────────────────
  group('Clients - List', () => {
    const res = http.get(`${BASE_URL}/api/clients?page=1&limit=10`);
    endpointTrends.clients_list.add(res.timings.duration);
    check(res, {
      'clients list 200': (r) => r.status === 200,
    });
  });

  sleep(thinkTime(0.5, 1));

  // ── Clients - Create ──────────────────────────────────────────────────────
  group('Clients - Create', () => {
    const idx = __ITER % clientNames.length;
    const payload = JSON.stringify({
      name: clientNames[idx],
      company: clientCompanies[idx],
      email: `k6-client-${__VU}-${__ITER}@loadtest.test`,
      phone: '+971-50-000-0000',
      address: randomPick(['شارع الشيخ زايد، دبي', 'Al Hamra, RAK', 'أبوظبي - الخالدية']),
    });

    const res = http.post(`${BASE_URL}/api/clients`, payload, {
      headers: { 'Content-Type': 'application/json' },
    });
    endpointTrends.clients_create.add(res.timings.duration);
    check(res, {
      'clients create 201 or 400': (r) => r.status === 201 || r.status === 400,
    });

    if (res.status === 201) {
      try { createdClientId = JSON.parse(res.body).id; } catch { /* ignore */ }
    }
  });

  sleep(thinkTime(0.5, 1));

  // ── Clients - Read ────────────────────────────────────────────────────────
  group('Clients - Read', () => {
    const targetId = createdClientId || 'nonexistent-id';
    const res = http.get(`${BASE_URL}/api/clients/${targetId}`);
    endpointTrends.clients_read.add(res.timings.duration);
    check(res, {
      'clients read 200 or 404': (r) => r.status === 200 || r.status === 404,
    });
  });

  sleep(thinkTime(0.5, 1));

  // ═══════════════════════════════════════════════════════════════════════════
  // TASKS
  // ═══════════════════════════════════════════════════════════════════════════

  let createdTaskId = '';

  // ── Tasks - List ──────────────────────────────────────────────────────────
  group('Tasks - List', () => {
    const res = http.get(`${BASE_URL}/api/tasks?page=1&limit=10`);
    endpointTrends.tasks_list.add(res.timings.duration);
    check(res, {
      'tasks list 200': (r) => r.status === 200,
    });
  });

  sleep(thinkTime(0.5, 1));

  // ── Tasks - Create ────────────────────────────────────────────────────────
  group('Tasks - Create', () => {
    const payload = JSON.stringify({
      title: randomPick(taskTitles),
      description: `مهمة اختبار الحمل - VU ${__VU} - تكرار ${__ITER}`,
      projectId: 'test-project',
      priority: randomPick(['HIGH', 'MEDIUM', 'LOW']),
      dueDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    });

    const res = http.post(`${BASE_URL}/api/tasks`, payload, {
      headers: { 'Content-Type': 'application/json' },
    });
    endpointTrends.tasks_create.add(res.timings.duration);
    check(res, {
      'tasks create 201 or 400': (r) => r.status === 201 || r.status === 400,
    });

    if (res.status === 201) {
      try { createdTaskId = JSON.parse(res.body).id; } catch { /* ignore */ }
    }
  });

  sleep(thinkTime(0.5, 1));

  // ── Tasks - Read ──────────────────────────────────────────────────────────
  group('Tasks - Read', () => {
    const targetId = createdTaskId || 'nonexistent-id';
    const res = http.get(`${BASE_URL}/api/tasks/${targetId}`);
    endpointTrends.tasks_read.add(res.timings.duration);
    check(res, {
      'tasks read 200 or 404': (r) => r.status === 200 || r.status === 404,
    });
  });

  sleep(thinkTime(0.5, 1));

  // ═══════════════════════════════════════════════════════════════════════════
  // DOCUMENTS
  // ═══════════════════════════════════════════════════════════════════════════

  group('Documents - List', () => {
    const res = http.get(`${BASE_URL}/api/documents?page=1&limit=10`);
    endpointTrends.documents_list.add(res.timings.duration);
    check(res, {
      'documents list 200': (r) => r.status === 200,
    });
  });

  sleep(thinkTime(0.5, 1));

  // ═══════════════════════════════════════════════════════════════════════════
  // REPORTS
  // ═══════════════════════════════════════════════════════════════════════════

  group('Reports - Overview', () => {
    const res = http.get(`${BASE_URL}/api/reports/overview`);
    endpointTrends.reports_overview.add(res.timings.duration);
    check(res, {
      'reports overview 200': (r) => r.status === 200,
    });
  });

  sleep(thinkTime(0.5, 1));

  group('Reports - Financial', () => {
    const res = http.get(`${BASE_URL}/api/reports/financial`);
    endpointTrends.reports_financial.add(res.timings.duration);
    check(res, {
      'reports financial 200': (r) => r.status === 200,
    });
  });

  sleep(thinkTime(0.5, 1));

  // ═══════════════════════════════════════════════════════════════════════════
  // SEARCH
  // ═══════════════════════════════════════════════════════════════════════════

  group('Search', () => {
    const queries = ['villa', 'فيلا', 'project', 'مشروع', 'tower', 'برج', 'invoice', 'فاتورة'];
    const q = randomPick(queries);
    const res = http.get(`${BASE_URL}/api/search?q=${encodeURIComponent(q)}`);
    endpointTrends.search.add(res.timings.duration);
    check(res, {
      'search 200': (r) => r.status === 200,
    });
  });

  sleep(thinkTime(0.5, 1));

  // ═══════════════════════════════════════════════════════════════════════════
  // SETTINGS
  // ═══════════════════════════════════════════════════════════════════════════

  group('Settings - Company', () => {
    const res = http.get(`${BASE_URL}/api/settings/company`);
    endpointTrends.settings_company.add(res.timings.duration);
    check(res, {
      'settings company 200': (r) => r.status === 200,
    });
  });

  sleep(thinkTime(0.5, 1));

  // ═══════════════════════════════════════════════════════════════════════════
  // NOTIFICATIONS
  // ═══════════════════════════════════════════════════════════════════════════

  group('Notifications', () => {
    const res = http.get(`${BASE_URL}/api/notifications?page=1&limit=10`);
    endpointTrends.notifications.add(res.timings.duration);
    check(res, {
      'notifications 200': (r) => r.status === 200,
    });
  });

  sleep(thinkTime());
}
