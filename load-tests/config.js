/**
 * Shared configuration for BluePrint k6 load tests.
 *
 * All test scripts import from this file so thresholds, base URLs,
 * stage profiles, and helper functions are centralized.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Environment
// ─────────────────────────────────────────────────────────────────────────────

export const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
export const API_TOKEN = __ENV.API_TOKEN || '';
export const CRON_SECRET = __ENV.CRON_SECRET || '';

// Test user credentials — override via env vars in CI
export const TEST_EMAIL = __ENV.TEST_EMAIL || 'admin@blueprint.com';
export const TEST_PASSWORD = __ENV.TEST_PASSWORD || 'demo1234';

// ─────────────────────────────────────────────────────────────────────────────
// Stage profiles — reusable ramp patterns
// ─────────────────────────────────────────────────────────────────────────────

export const STAGES = {
  smoke: [{ duration: '30s', target: 5 }],
  load: [
    { duration: '2m', target: 50 },
    { duration: '5m', target: 50 },
    { duration: '2m', target: 0 },
  ],
  stress: [
    { duration: '2m', target: 100 },
    { duration: '5m', target: 100 },
    { duration: '2m', target: 0 },
  ],
  spike: [
    { duration: '10s', target: 200 },
    { duration: '1m', target: 0 },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// Thresholds per test type
// ─────────────────────────────────────────────────────────────────────────────

export const THRESHOLDS = {
  smoke: {
    http_req_duration: ['p(95)<500'],    // 95 % under 500 ms
    http_req_failed: ['rate<0.01'],       // < 1 % failures
  },
  load: {
    http_req_duration: ['p(95)<1000'],   // 95 % under 1 s
    http_req_failed: ['rate<0.05'],       // < 5 % failures
  },
  stress: {
    http_req_duration: ['p(95)<2000'],   // 95 % under 2 s
    http_req_failed: ['rate<0.10'],       // < 10 % failures
  },
  spike: {
    http_req_duration: ['p(95)<3000'],   // 95 % under 3 s (during spike)
    http_req_failed: ['rate<0.15'],       // < 15 % failures (spike tolerance)
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Common helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build common request headers.
 * If a JWT token is provided, Authorization header is included.
 * The BluePrint app uses cookie-based auth — the `token` here is mainly for
 * API tests that may pass the token via the Authorization header.
 */
export function getHeaders(token = API_TOKEN) {
  const headers = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

/**
 * Authenticate against /api/auth/login and return the session cookies.
 * k6 automatically stores and re-sends cookies from Set-Cookie headers,
 * so the caller only needs to use the returned cookies jar for subsequent
 * requests if `jar` mode is needed.
 *
 * Returns `{ cookies, token }` where `cookies` is the k6 cookie jar and
 * `token` is the value of the `blue_token` cookie (if present).
 */
export function login(email = TEST_EMAIL, password = TEST_PASSWORD) {
  const url = `${BASE_URL}/api/auth/login`;
  const payload = JSON.stringify({ email, password });

  const res = http.post(url, payload, {
    headers: { 'Content-Type': 'application/json' },
    timeout: '30s',
  });

  const success = res.status === 200;

  if (!success) {
    console.warn(`Login failed for ${email}: HTTP ${res.status}`);
  }

  // Extract the access-token cookie value if available
  let token = '';
  if (success) {
    const tokenCookie = res.cookies?.blue_token?.[0];
    if (tokenCookie) {
      token = tokenCookie.value;
    }
  }

  return {
    success,
    status: res.status,
    token,
    cookies: res.cookies,
  };
}

/**
 * Generate a random think-time delay (simulates user reading time).
 * Returns a value between `min` and `max` seconds (default 1-3 s).
 */
export function thinkTime(min = 1, max = 3) {
  return Math.random() * (max - min) + min;
}

/**
 * Pick a random element from an array.
 */
export function randomPick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
