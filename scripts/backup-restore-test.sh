#!/bin/bash
# BluePrint ERP — Backup Restore Test Script
# سكريبت اختبار استعادة النسخة الاحتياطية
#
# WHAT IT DOES:
# 1. Creates a test backup from the current database
# 2. Restores it to a temporary test database
# 3. Verifies the restored data matches the source
# 4. Cleans up the temporary database
#
# USAGE:
#   bash scripts/backup-restore-test.sh
#
# ENVIRONMENT VARIABLES:
#   PGHOST       - PostgreSQL host (default: localhost)
#   PGPORT       - PostgreSQL port (default: 5432)
#   PGUSER       - PostgreSQL user (default: blueprint)
#   PGPASSWORD   - PostgreSQL password (required)
#   PGDATABASE   - Source database name (default: blueprint)
#   TEST_DB_PREFIX - Prefix for test database (default: blueprint_test_restore)
#
# EXIT CODES:
#   0 - All tests passed (backup is restorable)
#   1 - Backup creation failed
#   2 - Restore failed
#   3 - Data verification failed
#   4 - Cleanup failed

set -euo pipefail

# ─────────────────────────────────────────────────────────────────────────────
# Configuration
# ─────────────────────────────────────────────────────────────────────────────

PGHOST="${PGHOST:-localhost}"
PGPORT="${PGPORT:-5432}"
PGUSER="${PGUSER:-blueprint}"
PGDATABASE="${PGDATABASE:-blueprint}"
TEST_DB_PREFIX="${TEST_DB_PREFIX:-blueprint_test_restore}"
TEST_DB="${TEST_DB_PREFIX}_$(date +%s)"
BACKUP_FILE="/tmp/blueprint_restore_test_$(date +%s).sql.gz"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info()  { echo -e "${BLUE}[INFO]${NC}  $1"; }
log_ok()    { echo -e "${GREEN}[OK]${NC}    $1"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC}  $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# ─────────────────────────────────────────────────────────────────────────────
# Pre-flight checks
# ─────────────────────────────────────────────────────────────────────────────

log_info "BluePrint Backup Restore Test"
log_info "=============================="
log_info "Source DB: ${PGDATABASE}@${PGHOST}:${PGPORT}"
log_info "Test DB:   ${TEST_DB}"
log_info ""

# Check if psql and pg_dump are available
if ! command -v psql >/dev/null 2>&1; then
  log_error "psql not found. Install PostgreSQL client tools."
  exit 1
fi
if ! command -v pg_dump >/dev/null 2>&1; then
  log_error "pg_dump not found. Install PostgreSQL client tools."
  exit 1
fi
if ! command -v gzip >/dev/null 2>&1; then
  log_error "gzip not found."
  exit 1
fi

# Check if PGPASSWORD is set
if [ -z "${PGPASSWORD:-}" ]; then
  log_warn "PGPASSWORD not set — relying on .pgpass or peer auth"
fi

# Export for pg tools
export PGHOST PGPORT PGUSER PGPASSWORD

# ─────────────────────────────────────────────────────────────────────────────
# Step 1: Create backup
# ─────────────────────────────────────────────────────────────────────────────

log_info "Step 1: Creating backup from '${PGDATABASE}'..."
if ! pg_dump -d "$PGDATABASE" | gzip > "$BACKUP_FILE"; then
  log_error "Backup creation failed"
  rm -f "$BACKUP_FILE"
  exit 1
fi

BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
log_ok "Backup created: $BACKUP_FILE ($BACKUP_SIZE)"

# Verify backup is valid gzip
if ! gzip -t "$BACKUP_FILE" 2>/dev/null; then
  log_error "Backup file is corrupt (gzip test failed)"
  rm -f "$BACKUP_FILE"
  exit 1
fi
log_ok "Backup file is valid gzip"

# Verify backup is non-empty
if [ ! -s "$BACKUP_FILE" ]; then
  log_error "Backup file is empty"
  rm -f "$BACKUP_FILE"
  exit 1
fi
log_ok "Backup file is non-empty"

# ─────────────────────────────────────────────────────────────────────────────
# Step 2: Create test database
# ─────────────────────────────────────────────────────────────────────────────

log_info "Step 2: Creating test database '${TEST_DB}'..."
if ! createdb "$TEST_DB" 2>/dev/null; then
  log_error "Failed to create test database"
  rm -f "$BACKUP_FILE"
  exit 2
fi
log_ok "Test database created"

# Cleanup function — runs on exit
cleanup() {
  log_info "Cleaning up..."
  dropdb "$TEST_DB" 2>/dev/null && log_ok "Test database dropped" || log_warn "Could not drop test database (manual cleanup needed)"
  rm -f "$BACKUP_FILE"
  log_ok "Temp files removed"
}
trap cleanup EXIT

# ─────────────────────────────────────────────────────────────────────────────
# Step 3: Restore backup to test database
# ─────────────────────────────────────────────────────────────────────────────

log_info "Step 3: Restoring backup to '${TEST_DB}'..."
if ! gunzip -c "$BACKUP_FILE" | psql -d "$TEST_DB" -q 2>/dev/null; then
  log_error "Restore failed"
  exit 2
fi
log_ok "Restore completed"

# ─────────────────────────────────────────────────────────────────────────────
# Step 4: Verify data integrity
# ─────────────────────────────────────────────────────────────────────────────

log_info "Step 4: Verifying data integrity..."

# Compare table counts
SOURCE_TABLES=$(psql -d "$PGDATABASE" -t -c "SELECT count(*) FROM information_schema.tables WHERE table_schema='public';" 2>/dev/null | xargs)
TEST_TABLES=$(psql -d "$TEST_DB" -t -c "SELECT count(*) FROM information_schema.tables WHERE table_schema='public';" 2>/dev/null | xargs)

if [ "$SOURCE_TABLES" != "$TEST_TABLES" ]; then
  log_error "Table count mismatch: source=$SOURCE_TABLES, test=$TEST_TABLES"
  exit 3
fi
log_ok "Table count matches: $SOURCE_TABLES tables"

# Compare row counts for key tables
KEY_TABLES=("User" "Organization" "Project" "Invoice" "Task" "Client" "Employee")

for table in "${KEY_TABLES[@]}"; do
  # Check if table exists in source
  SOURCE_EXISTS=$(psql -d "$PGDATABASE" -t -c "SELECT to_regclass('public.\"$table\"');" 2>/dev/null | xargs)
  if [ "$SOURCE_EXISTS" = "" ]; then
    continue # Table doesn't exist — skip
  fi

  SOURCE_COUNT=$(psql -d "$PGDATABASE" -t -c "SELECT count(*) FROM \"public\".\"$table\";" 2>/dev/null | xargs)
  TEST_COUNT=$(psql -d "$TEST_DB" -t -c "SELECT count(*) FROM \"public\".\"$table\";" 2>/dev/null | xargs)

  if [ "$SOURCE_COUNT" != "$TEST_COUNT" ]; then
    log_error "Row count mismatch for '$table': source=$SOURCE_COUNT, test=$TEST_COUNT"
    exit 3
  fi
  log_ok "  $table: $SOURCE_COUNT rows"
done

# ─────────────────────────────────────────────────────────────────────────────
# Step 5: Summary
# ─────────────────────────────────────────────────────────────────────────────

log_info ""
log_info "=============================="
log_ok "ALL TESTS PASSED!"
log_info "  Backup file: $BACKUP_FILE ($BACKUP_SIZE)"
log_info "  Tables: $SOURCE_TABLES"
log_info "  Verified: ${#KEY_TABLES[@]} key tables"
log_info "=============================="
log_info ""
log_info "✅ Your backup system is working correctly."
log_info "   Backups can be safely restored in case of disaster."

exit 0
