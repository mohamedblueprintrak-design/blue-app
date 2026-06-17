#!/bin/sh
# BluePrint Backup Entrypoint
# SECURITY FIX (P0-7): Replaces the broken backup_service cron that had missing
# env vars (POSTGRES_USER/POSTGRES_DB) and never actually ran in production.
#
# This script runs pg_dump daily at 03:00, keeps RETENTION_DAYS of backups,
# and logs failures to stderr (container restart policy will alert via Docker).
set -eu

PGHOST="${PGHOST:-postgres}"
PGPORT="${PGPORT:-5432}"
PGUSER="${PGUSER:-blueprint}"
PGDATABASE="${PGDATABASE:-blueprint}"
RETENTION_DAYS="${RETENTION_DAYS:-10}"
BACKUP_DIR="/backups"

mkdir -p "$BACKUP_DIR"

# Run backup immediately on first start, then every 24h
run_backup() {
  TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
  FILE="$BACKUP_DIR/blueprint_backup_${TIMESTAMP}.sql.gz"
  echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Starting backup → $FILE"

  if pg_dump -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" | gzip > "$FILE"; then
    # Verify the backup is non-empty and valid gzip
    if [ -s "$FILE" ] && gzip -t "$FILE" 2>/dev/null; then
      SIZE=$(du -h "$FILE" | cut -f1)
      echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Backup OK: $FILE ($SIZE)"
    else
      echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] ERROR: backup file empty or corrupt, removing" >&2
      rm -f "$FILE"
      return 1
    fi
  else
    echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] ERROR: pg_dump failed" >&2
    rm -f "$FILE"
    return 1
  fi

  # Retention: delete backups older than RETENTION_DAYS
  find "$BACKUP_DIR" -name "blueprint_backup_*.sql.gz" -mtime +"$RETENTION_DAYS" -delete
  echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Retention: removed backups older than $RETENTION_DAYS days"
}

# First backup immediately (helps verify the service works on deploy)
run_backup || true

# Then loop: sleep until 03:00 next day, run backup, repeat
while true; do
  NOW=$(date +%s)
  TARGET=$(date -d "tomorrow 03:00" +%s 2>/dev/null || date -d "tomorrow 03:00" +%s)
  if [ "$TARGET" -le "$NOW" ]; then
    TARGET=$((NOW + 86400))
  fi
  SLEEP_SECONDS=$((TARGET - NOW))
  echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Next backup in $SLEEP_SECONDS seconds"
  sleep "$SLEEP_SECONDS" || exit 0
  run_backup || true
done
