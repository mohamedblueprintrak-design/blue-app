#!/bin/bash
# automated backup script for PostgreSQL

BACKUP_DIR="/var/backups/postgresql"
DATE=$(date +%Y-%m-%d_%H-%M-%S)
FILE="$BACKUP_DIR/backup_$DATE.sql.gz"

echo "Starting backup of database..."
docker exec blueprint-postgres pg_dump -U blueprint blueprint | gzip > "$FILE"

if [ $? -eq 0 ]; then
  echo "Backup successfully created at $FILE"
  # Keep only the last 7 backups to save space
  find $BACKUP_DIR -type f -name "backup_*.sql.gz" -mtime +7 -delete
  echo "Old backups cleaned up."
else
  echo "Backup failed!"
  exit 1
fi
