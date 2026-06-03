#!/bin/bash
# BluePrint - PostgreSQL Migration Script
# This script helps migrate from SQLite to PostgreSQL
#
# Usage:
#   export DATABASE_URL="postgresql://blueprint:blueprint_dev@localhost:5432/blueprint?schema=public"
#   bash scripts/migrate-to-postgres.sh
#
# Or with Docker:
#   docker-compose up -d postgres
#   bash scripts/migrate-to-postgres.sh

set -e

echo "============================================"
echo "  BluePrint PostgreSQL Migration"
echo "============================================"
echo ""

# Check if DATABASE_URL is set for PostgreSQL
if [[ -z "$DATABASE_URL" ]]; then
    echo "ERROR: DATABASE_URL is not set"
    echo ""
    echo "Set it to a PostgreSQL URL, for example:"
    echo "  export DATABASE_URL=\"postgresql://blueprint:blueprint_dev@localhost:5432/blueprint?schema=public\""
    echo ""
    echo "For Docker Compose, start PostgreSQL first:"
    echo "  docker-compose up -d postgres"
    echo ""
    echo "Then set DATABASE_URL pointing to the Docker container."
    exit 1
fi

if [[ ! "$DATABASE_URL" =~ ^postgresql:// ]]; then
    echo "ERROR: DATABASE_URL must be a PostgreSQL URL"
    echo "   Current: $DATABASE_URL"
    echo ""
    echo "Expected format: postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public"
    exit 1
fi

echo "Database URL: ${DATABASE_URL%%@*}@*** (password hidden)"
echo ""

# Step 1: Verify schema provider
SCHEMA_PROVIDER=$(grep 'provider = ' prisma/schema.prisma | head -1 | grep -o '"[^"]*"' | tr -d '"')
if [[ "$SCHEMA_PROVIDER" != "postgresql" ]]; then
    echo "WARNING: Prisma schema provider is '$SCHEMA_PROVIDER', expected 'postgresql'"
    echo "  The schema should have: provider = \"postgresql\""
    echo "  Please update prisma/schema.prisma before continuing."
    echo ""
    read -p "Continue anyway? (y/N): " CONTINUE
    if [[ "$CONTINUE" != "y" && "$CONTINUE" != "Y" ]]; then
        echo "Migration cancelled."
        exit 1
    fi
fi

# Step 2: Generate Prisma client
echo "[1/4] Generating Prisma client..."
bunx prisma generate
echo "  OK"
echo ""

# Step 3: Run migrations
echo "[2/4] Running Prisma migrations..."
bunx prisma migrate deploy
echo "  OK"
echo ""

# Step 4: Seed database
echo "[3/4] Seeding database..."
bunx tsx prisma/seed.ts
echo "  OK"
echo ""

# Step 5: Verify
echo "[4/4] Verifying database connection..."
if bunx prisma db pull --print > /dev/null 2>&1; then
    echo "  OK - Database is accessible"
else
    echo "  WARN - Could not verify database connection, but migration completed"
fi
echo ""

echo "============================================"
echo "  Migration Complete!"
echo "============================================"
echo ""
echo "  Login: admin@blueprint.ae / Admin@BP2024!"
echo "  Start the app: bun run dev"
echo ""
echo "  For more information, see MIGRATION.md"
echo "============================================"
