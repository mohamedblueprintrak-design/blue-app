#!/usr/bin/env bash
# ============================================
# BluePrint SaaS - Cron Job Setup
# ============================================
# This script configures scheduled tasks for BluePrint.
# Cron endpoints:
#   - GET /api/cron/cleanup  → runs every hour (removes expired sessions, stale tokens, temp files)
#   - GET /api/cron/workers  → runs every 5 minutes (processes background jobs, pending notifications)
#
# The CRON_SECRET environment variable is used to authenticate cron requests.
# Set it in your .env file before running any method below.
#
# Choose ONE of the following methods based on your deployment:
# ============================================

set -euo pipefail

# Load environment variables
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

if [ -f "$PROJECT_DIR/.env" ]; then
    set -a
    source "$PROJECT_DIR/.env"
    set +a
fi

APP_URL="${NEXT_PUBLIC_APP_URL:-http://localhost:3000}"
CRON_SECRET="${CRON_SECRET:-}"

if [ -z "$CRON_SECRET" ]; then
    echo "WARNING: CRON_SECRET is not set. Cron endpoints will reject unauthenticated requests."
    echo "Set CRON_SECRET in your .env file before proceeding."
    echo ""
fi

echo "============================================"
echo " BluePrint Cron Job Setup"
echo "============================================"
echo " App URL: $APP_URL"
echo " CRON_SECRET: ${CRON_SECRET:+<configured>}${CRON_SECRET:-<NOT SET>}"
echo ""
echo "Select a setup method:"
echo "  1) crontab (Linux/macOS direct scheduling)"
echo "  2) systemd timer (Linux with systemd)"
echo "  3) Vercel Cron (Vercel-hosted deployments)"
echo "  4) Show all methods (print config only, no changes)"
echo ""
read -rp "Enter choice [1-4]: " choice

case "$choice" in
    1)
        echo ""
        echo "Setting up crontab entries..."
        AUTH_HEADER=""
        if [ -n "$CRON_SECRET" ]; then
            AUTH_HEADER="Authorization: Bearer $CRON_SECRET"
        fi

        # Create a helper script that curl's the cron endpoints
        CRON_HELPER="$PROJECT_DIR/scripts/cron-run.sh"
        cat > "$CRON_HELPER" << 'HELPER_EOF'
#!/usr/bin/env bash
# BluePrint cron runner - called by crontab/systemd
# Usage: cron-run.sh <endpoint-path>
# Example: cron-run.sh /api/cron/cleanup

ENDPOINT="$1"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Load environment
if [ -f "$PROJECT_DIR/.env" ]; then
    set -a
    source "$PROJECT_DIR/.env"
    set +a
fi

APP_URL="${NEXT_PUBLIC_APP_URL:-http://localhost:3000}"
CRON_SECRET="${CRON_SECRET:-}"

URL="${APP_URL}${ENDPOINT}"

HEADERS=(-s -f -o /dev/null -w "%{http_code}")
if [ -n "$CRON_SECRET" ]; then
    HEADERS+=(-H "Authorization: Bearer $CRON_SECRET")
fi

HTTP_CODE=$(curl "${HEADERS[@]}" "$URL" 2>/dev/null || true)

TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
if [ "$HTTP_CODE" = "200" ]; then
    echo "[$TIMESTAMP] Cron $ENDPOINT: OK (HTTP $HTTP_CODE)"
else
    echo "[$TIMESTAMP] Cron $ENDPOINT: FAILED (HTTP $HTTP_CODE)" >&2
fi
HELPER_EOF
        chmod +x "$CRON_HELPER"

        # Add crontab entries (avoid duplicates)
        CRON_MARKER="# BluePrint cron jobs"
        CLEANUP_CMD="$CRON_HELPER /api/cron/cleanup"
        WORKERS_CMD="$CRON_HELPER /api/cron/workers"

        # Remove old BluePrint cron entries if they exist
        (crontab -l 2>/dev/null | grep -v "$CRON_MARKER" | grep -v "$CLEANUP_CMD" | grep -v "$WORKERS_CMD") | crontab -

        # Add new entries
        (crontab -l 2>/dev/null; echo "$CRON_MARKER"; echo "0 * * * * $CLEANUP_CMD >> $PROJECT_DIR/logs/cron.log 2>&1"; echo "*/5 * * * * $WORKERS_CMD >> $PROJECT_DIR/logs/cron.log 2>&1") | crontab -

        mkdir -p "$PROJECT_DIR/logs"

        echo "Crontab configured. Current entries:"
        crontab -l 2>/dev/null | grep -A2 "$CRON_MARKER" || echo "(none)"
        echo ""
        echo "Logs will be written to: $PROJECT_DIR/logs/cron.log"
        ;;

    2)
        echo ""
        echo "Creating systemd timer and service units..."

        # Create cleanup service
        cat > /etc/tmpfiles.d/blueprint-cleanup.conf 2>/dev/null || true
        cat > /tmp/blueprint-cleanup.service << 'EOF'
[Unit]
Description=BluePrint Cleanup Cron Job
After=network.target

[Service]
Type=oneshot
ExecStart=/usr/bin/curl -sf -o /dev/null -H "Authorization: Bearer %i" http://localhost:3000/api/cron/cleanup
EOF

        cat > /tmp/blueprint-cleanup.timer << 'EOF'
[Unit]
Description=Run BluePrint cleanup every hour

[Timer]
OnCalendar=hourly
Persistent=true

[Install]
WantedBy=timers.target
EOF

        # Create workers service
        cat > /tmp/blueprint-workers.service << 'EOF'
[Unit]
Description=BluePrint Workers Cron Job
After=network.target

[Service]
Type=oneshot
ExecStart=/usr/bin/curl -sf -o /dev/null -H "Authorization: Bearer %i" http://localhost:3000/api/cron/workers
EOF

        cat > /tmp/blueprint-workers.timer << 'EOF'
[Unit]
Description=Run BluePrint workers every 5 minutes

[Timer]
OnCalendar=*:0/5
Persistent=true

[Install]
WantedBy=timers.target
EOF

        echo ""
        echo "Systemd unit files created in /tmp/. To install:"
        echo ""
        echo "  sudo cp /tmp/blueprint-cleanup.service /etc/systemd/system/"
        echo "  sudo cp /tmp/blueprint-cleanup.timer /etc/systemd/system/"
        echo "  sudo cp /tmp/blueprint-workers.service /etc/systemd/system/"
        echo "  sudo cp /tmp/blueprint-workers.timer /etc/systemd/system/"
        echo ""
        echo "  # Replace YOUR_CRON_SECRET with the value from your .env file"
        echo "  sudo systemctl enable --now blueprint-cleanup.timer"
        echo "  sudo systemctl enable --now blueprint-workers.timer"
        echo ""
        echo "  # Verify timers are active:"
        echo "  sudo systemctl list-timers 'blueprint-*'"
        ;;

    3)
        echo ""
        echo "Vercel Cron configuration is already set in vercel.json at the project root."
        echo ""
        echo "Contents of vercel.json:"
        echo "---"
        if [ -f "$PROJECT_DIR/vercel.json" ]; then
            cat "$PROJECT_DIR/vercel.json"
        else
            echo "(vercel.json not found)"
        fi
        echo ""
        echo "---"
        echo ""
        echo "Vercel automatically invokes cron endpoints with a CRON_SECRET header."
        echo "Make sure CRON_SECRET is set in your Vercel project environment variables."
        echo ""
        echo "To verify cron jobs are registered:"
        echo "  vercel inspect <deployment-url>"
        echo ""
        echo "To manually trigger (for testing):"
        echo "  curl -H \"Authorization: Bearer \$CRON_SECRET\" \$APP_URL/api/cron/cleanup"
        echo "  curl -H \"Authorization: Bearer \$CRON_SECRET\" \$APP_URL/api/cron/workers"
        ;;

    4)
        echo ""
        echo "============================================"
        echo " Method 1: crontab"
        echo "============================================"
        echo ""
        echo "Add these lines to your crontab (crontab -e):"
        echo ""
        echo "  # BluePrint cron jobs"
        echo "  0 * * * *   curl -sf -o /dev/null -H \"Authorization: Bearer YOUR_CRON_SECRET\" http://localhost:3000/api/cron/cleanup"
        echo "  */5 * * * * curl -sf -o /dev/null -H \"Authorization: Bearer YOUR_CRON_SECRET\" http://localhost:3000/api/cron/workers"
        echo ""
        echo ""
        echo "============================================"
        echo " Method 2: systemd timer"
        echo "============================================"
        echo ""
        echo "Create these files in /etc/systemd/system/:"
        echo ""
        echo "--- blueprint-cleanup.timer ---"
        echo "[Unit]"
        echo "Description=Run BluePrint cleanup every hour"
        echo ""
        echo "[Timer]"
        echo "OnCalendar=hourly"
        echo "Persistent=true"
        echo ""
        echo "[Install]"
        echo "WantedBy=timers.target"
        echo ""
        echo "--- blueprint-cleanup.service ---"
        echo "[Unit]"
        echo "Description=BluePrint Cleanup Cron Job"
        echo "After=network.target"
        echo ""
        echo "[Service]"
        echo "Type=oneshot"
        echo "ExecStart=/usr/bin/curl -sf -o /dev/null -H \"Authorization: Bearer YOUR_CRON_SECRET\" http://localhost:3000/api/cron/cleanup"
        echo ""
        echo "--- blueprint-workers.timer ---"
        echo "[Unit]"
        echo "Description=Run BluePrint workers every 5 minutes"
        echo ""
        echo "[Timer]"
        echo "OnCalendar=*:0/5"
        echo "Persistent=true"
        echo ""
        echo "[Install]"
        echo "WantedBy=timers.target"
        echo ""
        echo "--- blueprint-workers.service ---"
        echo "[Unit]"
        echo "Description=BluePrint Workers Cron Job"
        echo "After=network.target"
        echo ""
        echo "[Service]"
        echo "Type=oneshot"
        echo "ExecStart=/usr/bin/curl -sf -o /dev/null -H \"Authorization: Bearer YOUR_CRON_SECRET\" http://localhost:3000/api/cron/workers"
        echo ""
        echo "Then: sudo systemctl enable --now blueprint-cleanup.timer blueprint-workers.timer"
        echo ""
        echo ""
        echo "============================================"
        echo " Method 3: Vercel Cron"
        echo "============================================"
        echo ""
        echo "vercel.json (already in project root):"
        echo '{'
        echo '  "crons": ['
        echo '    { "path": "/api/cron/cleanup", "schedule": "0 * * * *" },'
        echo '    { "path": "/api/cron/workers", "schedule": "*/5 * * * *" }'
        echo '  ]'
        echo '}'
        echo ""
        echo "Vercel automatically invokes these on the defined schedule."
        echo "Set CRON_SECRET in your Vercel project environment variables."
        ;;

    *)
        echo "Invalid choice. Exiting."
        exit 1
        ;;
esac

echo ""
echo "Done."
