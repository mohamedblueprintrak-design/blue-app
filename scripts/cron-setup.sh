#!/usr/bin/env bash
# ============================================
# BluePrint ERP — Cron Job Setup (Simplified)
# ============================================
#
# Sets up 2 cron jobs:
#   1. Workers: every 5 minutes → processes email queue, notifications, automations
#   2. Cleanup: every hour → deletes old tokens, notifications, activity logs
#
# Requirements:
#   - .env file with CRON_SECRET and NEXT_PUBLIC_APP_URL
#   - curl installed
#
# Usage:
#   chmod +x scripts/cron-setup.sh
#   ./scripts/cron-setup.sh
#
# To remove:
#   crontab -l | grep -v "BluePrint" | crontab -
#
# ============================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Load .env
if [ -f "$PROJECT_DIR/.env" ]; then
    set -a
    source "$PROJECT_DIR/.env"
    set +a
fi

APP_URL="${NEXT_PUBLIC_APP_URL:-http://localhost:3000}"
CRON_SECRET="${CRON_SECRET:-}"

if [ -z "$CRON_SECRET" ]; then
    echo "ERROR: CRON_SECRET is not set in .env"
    echo "Add CRON_SECRET=your-secret-here to $PROJECT_DIR/.env"
    exit 1
fi

echo "============================================"
echo " BluePrint Cron Job Setup"
echo "============================================"
echo " App URL:     $APP_URL"
echo " CRON_SECRET: <configured>"
echo ""

# Create the helper script
CRON_HELPER="$PROJECT_DIR/scripts/cron-run.sh"
cat > "$CRON_HELPER" << 'HELPER_EOF'
#!/usr/bin/env bash
# BluePrint cron runner — called by crontab
# Usage: cron-run.sh <endpoint-path>
# Example: cron-run.sh /api/cron/cleanup

ENDPOINT="$1"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Load .env
if [ -f "$PROJECT_DIR/.env" ]; then
    set -a
    source "$PROJECT_DIR/.env"
    set +a
fi

APP_URL="${NEXT_PUBLIC_APP_URL:-http://localhost:3000}"
CRON_SECRET="${CRON_SECRET:-}"

URL="${APP_URL}${ENDPOINT}"

# Call the endpoint
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
    -X POST \
    -H "Authorization: Bearer $CRON_SECRET" \
    "$URL" 2>/dev/null || echo "000")

TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
if [ "$HTTP_CODE" = "200" ]; then
    echo "[$TIMESTAMP] OK: $ENDPOINT (HTTP $HTTP_CODE)"
else
    echo "[$TIMESTAMP] FAIL: $ENDPOINT (HTTP $HTTP_CODE)" >&2
fi
HELPER_EOF
chmod +x "$CRON_HELPER"

# Create logs directory
mkdir -p "$PROJECT_DIR/logs"

# Remove old BluePrint cron entries
CRON_MARKER="BluePrint cron jobs"
CLEANUP_CMD="$CRON_HELPER /api/cron/cleanup"
WORKERS_CMD="$CRON_HELPER /api/cron/workers"

(crontab -l 2>/dev/null | grep -v "$CRON_MARKER" | grep -v "$CLEANUP_CMD" | grep -v "$WORKERS_CMD" | grep -v "cron-run.sh") | crontab -

# Add new entries
# Workers: every 5 minutes (processes email queue, notifications, automations)
# Cleanup: every hour at minute 0 (deletes old tokens, logs, notifications)
(crontab -l 2>/dev/null 2>/dev/null || true; \
    echo "# $CRON_MARKER"; \
    echo "*/5 * * * * $WORKERS_CMD >> $PROJECT_DIR/logs/cron-workers.log 2>&1"; \
    echo "0 * * * * $CLEANUP_CMD >> $PROJECT_DIR/logs/cron-cleanup.log 2>&1"; \
) | crontab -

echo "Crontab configured successfully!"
echo ""
echo "Cron entries:"
crontab -l 2>/dev/null | grep -A 3 "$CRON_MARKER"
echo ""
echo "Logs:"
echo "  Workers:  $PROJECT_DIR/logs/cron-workers.log"
echo "  Cleanup:  $PROJECT_DIR/logs/cron-cleanup.log"
echo ""
echo "To test manually:"
echo "  $CRON_HELPER /api/cron/workers"
echo "  $CRON_HELPER /api/cron/cleanup"
echo ""
echo "To remove cron jobs:"
echo "  crontab -l | grep -v 'BluePrint' | crontab -"
