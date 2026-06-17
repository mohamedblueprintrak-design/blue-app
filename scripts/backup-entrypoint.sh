#!/bin/sh
# BluePrint Backup Entrypoint
# SECURITY FIX (P0-7): Replaces the broken backup_service cron that had missing
# env vars (POSTGRES_USER/POSTGRES_DB) and never actually ran in production.
# SECURITY FIX (P2-31): Adds GPG encryption for backups at rest.
#
# This script runs pg_dump daily at 03:00, encrypts with GPG, keeps
# RETENTION_DAYS of backups, and logs failures to stderr.
set -eu

PGHOST="${PGHOST:-postgres}"
PGPORT="${PGPORT:-5432}"
PGUSER="${PGUSER:-blueprint}"
PGDATABASE="${PGDATABASE:-blueprint}"
RETENTION_DAYS="${RETENTION_DAYS:-10}"
BACKUP_DIR="/backups"

# P2-31: GPG encryption settings.
# If BACKUP_GPG_RECIPIENT is set, backups are encrypted to that recipient.
# If not set, backups remain unencrypted (with a loud warning).
BACKUP_GPG_RECIPIENT="${BACKUP_GPG_RECIPIENT:-}"

if [ -z "$BACKUP_GPG_RECIPIENT" ]; then
  echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] WARNING: BACKUP_GPG_RECIPIENT is not set — backups will be UNENCRYPTED at rest." >&2
  echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Set BACKUP_GPG_RECIPIENT to a GPG key ID/email for encrypted backups." >&2
fi

mkdir -p "$BACKUP_DIR"

# Run backup immediately on first start, then every 24h
run_backup() {
  TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
  BASE_NAME="blueprint_backup_${TIMESTAMP}"
  RAW_FILE="$BACKUP_DIR/${BASE_NAME}.sql.gz"
  FINAL_FILE="$RAW_FILE"

  echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Starting backup → $RAW_FILE"

  # Step 1: pg_dump | gzip → raw file
  if ! pg_dump -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" | gzip > "$RAW_FILE"; then
    echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] ERROR: pg_dump failed" >&2
    rm -f "$RAW_FILE"
    return 1
  fi

  # Verify the backup is non-empty and valid gzip
  if [ ! -s "$RAW_FILE" ] || ! gzip -t "$RAW_FILE" 2>/dev/null; then
    echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] ERROR: backup file empty or corrupt, removing" >&2
    rm -f "$RAW_FILE"
    return 1
  fi

  # Step 2: P2-31 — encrypt with GPG if recipient is configured
  if [ -n "$BACKUP_GPG_RECIPIENT" ]; then
    ENC_FILE="$BACKUP_DIR/${BASE_NAME}.sql.gz.gpg"
    echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Encrypting with GPG (recipient: $BACKUP_GPG_RECIPIENT)…"

    if gpg --batch --yes --trust-model always --recipient "$BACKUP_GPG_RECIPIENT" \
           --encrypt --output "$ENC_FILE" "$RAW_FILE" 2>/dev/null; then
      # Verify encrypted file exists and is non-empty
      if [ -s "$ENC_FILE" ]; then
        # Remove the unencrypted raw file — only keep the encrypted version
        rm -f "$RAW_FILE"
        FINAL_FILE="$ENC_FILE"
        echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Encryption OK: $ENC_FILE"
      else
        echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] ERROR: GPG encryption produced empty file, keeping unencrypted backup" >&2
        rm -f "$ENC_FILE"
      fi
    else
      echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] ERROR: GPG encryption failed, keeping unencrypted backup" >&2
      rm -f "$ENC_FILE"
      # Don't return 1 here — an unencrypted backup is better than no backup.
      # The warning is logged so ops can fix the GPG config.
    fi
  fi

  SIZE=$(du -h "$FINAL_FILE" | cut -f1)
  echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Backup OK: $FINAL_FILE ($SIZE)"

  # Retention: delete backups older than RETENTION_DAYS
  # Match both .sql.gz (unencrypted) and .sql.gz.gpg (encrypted)
  find "$BACKUP_DIR" -name "blueprint_backup_*.sql.gz" -mtime +"$RETENTION_DAYS" -delete
  find "$BACKUP_DIR" -name "blueprint_backup_*.sql.gz.gpg" -mtime +"$RETENTION_DAYS" -delete
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
