#!/bin/sh
set -e

# Validation for required environment variables
if [ -z "$DATABASE_URL" ]; then
  echo "ERROR: DATABASE_URL environment variable is not set."
  exit 1
fi

if [ -z "$JWT_SECRET" ]; then
  echo "ERROR: JWT_SECRET environment variable is not set."
  exit 1
fi

if [ -z "$ENCRYPTION_KEY" ]; then
  echo "ERROR: ENCRYPTION_KEY environment variable is not set."
  exit 1
fi

# Run Prisma migrations
echo "Running database migrations..."
npx prisma migrate deploy

# Start the application
echo "Starting the application..."
exec "$@"
