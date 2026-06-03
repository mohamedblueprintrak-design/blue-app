# BluePrint Load Testing Suite

Comprehensive k6 load testing setup for the BluePrint SaaS application. Covers smoke, load, stress, spike, and detailed API endpoint tests.

## Prerequisites

### Install k6

**macOS:**
```bash
brew install k6
```

**Linux (Debian/Ubuntu):**
```bash
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg \
  --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491437C524A
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" \
  | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

**Windows:**
```bash
choco install k6
```

**Docker:**
```bash
docker pull grafana/k6:latest
```

Verify installation:
```bash
k6 version
```

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `BASE_URL` | `http://localhost:3000` | Target application URL |
| `TEST_EMAIL` | `admin@blueprint.com` | Login email for test user |
| `TEST_PASSWORD` | `demo1234` | Login password for test user |
| `API_TOKEN` | _(empty)_ | Pre-generated JWT token (optional; cookie auth is used by default) |
| `CRON_SECRET` | _(empty)_ | Cron endpoint secret (for admin-level tests) |

## Running Tests

All commands should be run from the `load-tests/` directory:

```bash
cd load-tests
```

### Smoke Test (Quick Verification)
```bash
# Default: 2 VUs, 30 seconds
k6 run smoke.js

# With custom base URL
BASE_URL=https://staging.blueprint.app k6 run smoke.js
```

### Load Test (Normal Traffic Simulation)
```bash
# 50 peak VUs, ~3 minutes
k6 run load.js

# With custom credentials
TEST_EMAIL=admin@blueprint.com TEST_PASSWORD=mypassword k6 run load.js
```

### Stress Test (Find Breaking Point)
```bash
# 200 peak VUs, ~5 minutes
k6 run stress.js
```

### Spike Test (Sudden Surge)
```bash
# 10 → 500 → 10 VUs
k6 run spike.js
```

### API Endpoint Test (Detailed Per-Endpoint)
```bash
# 10 VUs, 2 minutes — measures every endpoint individually
k6 run api-endpoints.js
```

### Using Bun Scripts
```bash
bun run test:smoke
bun run test:load
bun run test:stress
bun run test:spike
bun run test:api
```

### Running with Docker
```bash
docker run --rm -i \
  -e BASE_URL=http://host.docker.internal:3000 \
  -v $(pwd):/scripts \
  grafana/k6 run /scripts/smoke.js
```

## Test Profiles Summary

| Test | VUs | Duration | Purpose | Thresholds |
|---|---|---|---|---|
| **Smoke** | 2 | 30s | Verify system is up | p95 < 500ms, < 1% failures |
| **Load** | 0→10→50→0 | ~3.5m | Normal traffic simulation | p95 < 1s, < 5% failures |
| **Stress** | 0→50→200→0 | ~5.5m | Find breaking point | p95 < 2s, < 10% failures |
| **Spike** | 10→500→10 | ~1.7m | Sudden surge resilience | p95 < 3s, < 15% failures |
| **API** | 10 | 2m | Per-endpoint performance | p95 < 1.5s, < 5% failures |

## Interpreting Results

### Key Metrics

- **http_req_duration** — Request response time. Look at p(95) and p(99), not just the average.
- **http_req_failed** — Percentage of non-2xx responses. Should be near zero for smoke/load.
- **http_reqs** — Total requests made. Helps calculate throughput (req/s).
- **iterations** — Number of full test iterations completed by all VUs.
- **VU capacity** — If VUs are waiting, you may need more k6 resources or fewer VUs.

### Threshold Pass/Fail

When k6 finishes, it prints a summary with each threshold:

```
✓ http_req_duration..........: p(95)=420ms  ← PASS (under 1000ms)
✗ http_req_failed............: rate=6.2%    ← FAIL (over 5%)
```

A failed threshold causes k6 to exit with a non-zero code — useful for CI pipelines.

### Common Issues

| Symptom | Likely Cause | Fix |
|---|---|---|
| High p(95) under low load | Slow DB queries, missing indexes | Check query plans, add indexes |
| Increasing latency over time | Memory leak, connection pool exhaustion | Monitor server memory, check pool settings |
| 429 responses during stress | Rate limiting kicking in | Adjust rate limits or test with realistic traffic |
| 502/503 during spike | Server overwhelmed | Scale horizontally, add queue/caching |
| Login failures | Rate limit on auth endpoint | Space out login attempts, increase auth rate limit |

## Arabic Text Support

All test scripts include Arabic text in payloads to validate RTL content handling:

- Project names: `فيلا محمد الرشيدي`, `برج التجارة الدولي`
- Client names: `شركة الأفق للمقاولات`
- Task titles: `مراجعة المخططات المعمارية`
- Search queries: `فيلا`, `مشروع`, `فاتورة`

## CI Integration

### GitHub Actions

```yaml
name: Load Tests
on:
  schedule:
    - cron: '0 6 * * 1'  # Weekly on Monday at 6 AM UTC
  workflow_dispatch:

jobs:
  smoke:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Install k6
        run: |
          curl https://github.com/grafana/k6/releases/download/v0.50.0/k6-v0.50.0-linux-amd64.tar.gz -L | tar xvz
          sudo mv k6-*/k6 /usr/local/bin/
      - name: Run Smoke Test
        working-directory: load-tests
        env:
          BASE_URL: ${{ secrets.STAGING_URL }}
          TEST_EMAIL: ${{ secrets.TEST_EMAIL }}
          TEST_PASSWORD: ${{ secrets.TEST_PASSWORD }}
        run: k6 run smoke.js

  load:
    runs-on: ubuntu-latest
    needs: smoke
    steps:
      - uses: actions/checkout@v4
      - name: Install k6
        run: |
          curl https://github.com/grafana/k6/releases/download/v0.50.0/k6-v0.50.0-linux-amd64.tar.gz -L | tar xvz
          sudo mv k6-*/k6 /usr/local/bin/
      - name: Run Load Test
        working-directory: load-tests
        env:
          BASE_URL: ${{ secrets.STAGING_URL }}
          TEST_EMAIL: ${{ secrets.TEST_EMAIL }}
          TEST_PASSWORD: ${{ secrets.TEST_PASSWORD }}
        run: k6 run load.js
```

### K6 Cloud / Grafana Cloud

To push results to Grafana Cloud for dashboards and historical comparison:

```bash
# Login once
k6 login cloud --token <YOUR_K6_CLOUD_TOKEN>

# Run with cloud output
k6 cloud smoke.js
```

### Output to InfluxDB

```bash
k6 run --out influxdb=http://localhost:8086/k6 smoke.js
```

## Architecture Notes

- **Cookie-based auth**: k6 automatically stores and re-sends cookies from `Set-Cookie` headers, so the BluePrint JWT cookies (`blue_token`, `blue_refresh_token`) are handled transparently.
- **Rate limiting**: The BluePrint app enforces rate limits on auth and API endpoints. During stress/spike tests, some 429 responses are expected and the checks account for this.
- **Test data**: Created resources (projects, clients, etc.) use `K6-` prefixed identifiers for easy cleanup.
- **Think time**: Random delays (1–3 seconds by default) simulate realistic user behavior between actions.
