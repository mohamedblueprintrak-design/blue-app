#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────────
# BluePrint Load Test Runner
#
# Usage:
#   ./run.sh                  # Run smoke test (default)
#   ./run.sh smoke            # Quick verification (5 VUs, 30s)
#   ./run.sh load             # Normal traffic simulation (50 VUs, ~9m)
#   ./run.sh stress           # Find breaking point (100 VUs, ~9m)
#   ./run.sh spike            # Sudden surge test (200 VUs, ~70s)
#   ./run.sh all              # Run all test types sequentially
#   ./run.sh auth             # Auth-focused load test
#   ./run.sh projects         # Projects API load test
#   ./run.sh dashboard        # Dashboard API load test
#   ./run.sh api              # Detailed API endpoint test
#
# Environment:
#   BASE_URL        — Target URL (default: http://localhost:3000)
#   TEST_EMAIL      — Login email (default: admin@blueprint.com)
#   TEST_PASSWORD   — Login password (default: demo1234)
#   STAGE_PROFILE   — Override stage profile for focused tests
# ──────────────────────────────────────────────────────────────────────────────

set -euo pipefail

# ──────────────────────────────────────────────────────────────────────────────
# Configuration
# ──────────────────────────────────────────────────────────────────────────────

BASE_URL="${BASE_URL:-http://localhost:3000}"
TEST_EMAIL="${TEST_EMAIL:-admin@blueprint.com}"
TEST_PASSWORD="${TEST_PASSWORD:-demo1234}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

export BASE_URL TEST_EMAIL TEST_PASSWORD

# Color helpers
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

log_header() {
  echo ""
  echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
  echo -e "${CYAN}  $1${NC}"
  echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
  echo ""
}

log_info() {
  echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
  echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

# ──────────────────────────────────────────────────────────────────────────────
# Pre-flight checks
# ──────────────────────────────────────────────────────────────────────────────

check_k6() {
  if ! command -v k6 &> /dev/null; then
    log_error "k6 is not installed!"
    echo ""
    echo "Install k6:"
    echo "  macOS:   brew install k6"
    echo "  Linux:   See https://k6.io/docs/get-started/installation/"
    echo "  Windows: choco install k6"
    echo "  Docker:  docker pull grafana/k6:latest"
    exit 1
  fi

  K6_VERSION=$(k6 version 2>/dev/null || echo "unknown")
  log_info "Using k6 version: ${K6_VERSION}"
}

check_health() {
  log_info "Checking health at ${BASE_URL}/api/health ..."
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}/api/health" 2>/dev/null || echo "000")

  if [ "${HTTP_CODE}" != "200" ]; then
    log_warn "Health check returned HTTP ${HTTP_CODE} — the target may be down or unreachable."
    log_warn "Continuing anyway..."
  else
    log_info "Health check passed (HTTP 200)"
  fi
}

# ──────────────────────────────────────────────────────────────────────────────
# Test runners
# ──────────────────────────────────────────────────────────────────────────────

run_test() {
  local name="$1"
  local script="$2"

  log_header "Running: ${name}"
  log_info "Script: ${script}"
  log_info "Target: ${BASE_URL}"
  echo ""

  k6 run "${script}"

  local exit_code=$?
  if [ $exit_code -eq 0 ]; then
    log_info "${name} completed successfully"
  else
    log_error "${name} failed with exit code ${exit_code}"
  fi

  return $exit_code
}

# ──────────────────────────────────────────────────────────────────────────────
# Main
# ──────────────────────────────────────────────────────────────────────────────

TEST_TYPE="${1:-smoke}"

check_k6
check_health

case "${TEST_TYPE}" in
  smoke)
    run_test "Smoke Test" "${SCRIPT_DIR}/smoke.js"
    ;;

  load)
    run_test "Load Test" "${SCRIPT_DIR}/load.js"
    ;;

  stress)
    run_test "Stress Test" "${SCRIPT_DIR}/stress.js"
    ;;

  spike)
    run_test "Spike Test" "${SCRIPT_DIR}/spike.js"
    ;;

  api)
    run_test "API Endpoint Test" "${SCRIPT_DIR}/api-endpoints.js"
    ;;

  auth)
    run_test "Auth Load Test" "${SCRIPT_DIR}/tests/auth.js"
    ;;

  projects)
    run_test "Projects Load Test" "${SCRIPT_DIR}/tests/projects.js"
    ;;

  dashboard)
    run_test "Dashboard Load Test" "${SCRIPT_DIR}/tests/dashboard.js"
    ;;

  all)
    log_header "Running ALL load tests sequentially"

    FAILED=0

    run_test "Smoke Test" "${SCRIPT_DIR}/smoke.js" || FAILED=$((FAILED + 1))
    run_test "Auth Load Test" "${SCRIPT_DIR}/tests/auth.js" || FAILED=$((FAILED + 1))
    run_test "Projects Load Test" "${SCRIPT_DIR}/tests/projects.js" || FAILED=$((FAILED + 1))
    run_test "Dashboard Load Test" "${SCRIPT_DIR}/tests/dashboard.js" || FAILED=$((FAILED + 1))
    run_test "Load Test" "${SCRIPT_DIR}/load.js" || FAILED=$((FAILED + 1))
    run_test "API Endpoint Test" "${SCRIPT_DIR}/api-endpoints.js" || FAILED=$((FAILED + 1))
    run_test "Stress Test" "${SCRIPT_DIR}/stress.js" || FAILED=$((FAILED + 1))
    run_test "Spike Test" "${SCRIPT_DIR}/spike.js" || FAILED=$((FAILED + 1))

    echo ""
    if [ $FAILED -eq 0 ]; then
      log_info "All tests passed!"
    else
      log_error "${FAILED} test(s) failed."
      exit 1
    fi
    ;;

  *)
    echo "Usage: $0 {smoke|load|stress|spike|api|auth|projects|dashboard|all}"
    echo ""
    echo "Test types:"
    echo "  smoke     — Quick verification (5 VUs, 30s)"
    echo "  load      — Normal traffic simulation (50 VUs, ~9m)"
    echo "  stress    — Find breaking point (100 VUs, ~9m)"
    echo "  spike     — Sudden surge test (200 VUs, ~70s)"
    echo "  api       — Detailed API endpoint test"
    echo "  auth      — Auth-focused load test"
    echo "  projects  — Projects API load test"
    echo "  dashboard — Dashboard API load test"
    echo "  all       — Run all tests sequentially"
    exit 1
    ;;
esac
