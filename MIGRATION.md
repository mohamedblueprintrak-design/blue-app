# BluePrint ERP: SQLite to PostgreSQL Migration Guide

This guide explains how to migrate the BluePrint ERP application from SQLite to PostgreSQL.

## Why PostgreSQL?

| Feature | SQLite | PostgreSQL |
|---------|--------|------------|
| Concurrent writes | Single writer | Multiple writers |
| Native enums | No (stored as strings) | Yes |
| Production readiness | Development only | Production-grade |
| Scalability | Single file | Network-accessible |
| Docker support | File-based | Native container |
| Backups | File copy | pg_dump, WAL archiving |

## Prerequisites

- PostgreSQL 16+ installed and running
- A database created (e.g., `blueprint`)
- A user with appropriate permissions

## Quick Start

### Option A: Docker Compose (Recommended)

```bash
# 1. Start PostgreSQL container
docker-compose up -d postgres

# 2. Set the DATABASE_URL in .env
# The default in docker-compose.yml uses:
# postgresql://blueprint:<password>@postgres:5432/blueprint?schema=public

# 3. Run migrations
npx prisma migrate deploy

# 4. Seed the database
npx tsx prisma/seed.ts

# 5. Start the app
npm run dev
```

### Option B: Local PostgreSQL

```bash
# 1. Install PostgreSQL (macOS)
brew install postgresql@16
brew services start postgresql@16

# 1. Install PostgreSQL (Ubuntu/Debian)
sudo apt install postgresql-16
sudo systemctl start postgresql

# 2. Create database and user
sudo -u postgres psql
CREATE USER blueprint WITH PASSWORD 'blueprint_dev';
CREATE DATABASE blueprint OWNER blueprint;
GRANT ALL PRIVILEGES ON DATABASE blueprint TO blueprint;
\q

# 3. Update .env
DATABASE_URL="postgresql://blueprint:blueprint_dev@localhost:5432/blueprint?schema=public"

# 4. Run migrations
npx prisma migrate deploy

# 5. Seed the database
npx tsx prisma/seed.ts

# 6. Start the app
npm run dev
```

## Step-by-Step Migration

### 1. Update .env

Change the `DATABASE_URL` in your `.env` file:

```env
# From (SQLite):
DATABASE_URL="file:./db/custom.db"

# To (PostgreSQL):
DATABASE_URL="postgresql://blueprint:blueprint_dev@localhost:5432/blueprint?schema=public"
```

The PostgreSQL URL format:
```
postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public
```

### 2. Verify Schema Configuration

The `prisma/schema.prisma` should already have:
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

If it still says `provider = "sqlite"`, change it to `"postgresql"`.

### 3. Run Migrations

**For a fresh database:**
```bash
npx prisma migrate deploy
```

**For development (creates and applies migrations):**
```bash
npx prisma migrate dev --name init_postgresql
```

**If you need to reset the database:**
```bash
npx prisma migrate reset
```

### 4. Seed the Database

```bash
npx tsx prisma/seed.ts
```

### 5. Verify

```bash
# Check the database connection
npx prisma db pull --print

# Or connect directly
psql -U blueprint -d blueprint -c "\dt"
```

## Migrating Existing Data

If you have existing data in SQLite that you want to migrate to PostgreSQL:

### Option 1: Re-seed (Simplest)

If your data was created by the seed script, simply re-run the seed:
```bash
npx tsx prisma/seed.ts
```

### Option 2: Export and Import

```bash
# 1. Export data from SQLite (example for a single table)
sqlite3 db/custom.db ".mode insert User" "SELECT * FROM User;" > user_data.sql

# 2. Transform and import into PostgreSQL
# This requires manual SQL transformation to match PostgreSQL syntax
psql -U blueprint -d blueprint -f user_data.sql
```

### Option 3: Use pgLoader (Recommended for large datasets)

```bash
# Install pgLoader
sudo apt install pgloader  # Ubuntu/Debian
brew install pgloader      # macOS

# Migrate entire SQLite database to PostgreSQL
pgloader db/custom.db postgresql://blueprint:blueprint_dev@localhost:5432/blueprint
```

## Switching Back to SQLite

If you need to switch back to SQLite for local development:

1. **Edit `prisma/schema.prisma`:**
   ```prisma
   datasource db {
     provider = "sqlite"
     url      = env("DATABASE_URL")
   }
   ```

2. **Remove PostgreSQL-specific annotations** from the schema:
   - Remove all `@db.Text` annotations
   - Remove all `@db.VarChar(N)` annotations
   - These are PostgreSQL-specific and will cause validation errors with SQLite

3. **Update `.env`:**
   ```env
   DATABASE_URL="file:./db/custom.db"
   ```

4. **Reset the database:**
   ```bash
   rm db/custom.db
   npx prisma db push
   npx tsx prisma/seed.ts
   ```

## PostgreSQL-Specific Schema Annotations

The schema includes PostgreSQL-specific type annotations that improve performance and data integrity:

| Annotation | Usage | Example Fields |
|------------|-------|----------------|
| `@db.Text` | Unlimited text (JSON, descriptions) | `description`, `notes`, `paymentSchedule` |
| `@db.VarChar(255)` | Constrained text (emails) | `email`, `toEmail` |
| `@db.VarChar(100)` | Medium text (phones, numbers) | `phone`, `voucherNumber` |

**Important:** These annotations MUST be removed when switching to SQLite.

## Troubleshooting

### "Can't reach database server"
- Make sure PostgreSQL is running
- Check the host and port in DATABASE_URL
- For Docker: use `postgres` as the host (not `localhost`)

### "database 'blueprint' does not exist"
```bash
createdb -U postgres blueprint
```

### "authentication failed"
- Check the username and password in DATABASE_URL
- Make sure the user has permissions:
```sql
GRANT ALL PRIVILEGES ON DATABASE blueprint TO blueprint;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO blueprint;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO blueprint;
```

### "relation already exists"
If you have leftover migration state:
```bash
npx prisma migrate reset
```

### Prisma Client not generating
```bash
npx prisma generate
```

## Docker Production Setup

For production with Docker:

```bash
# 1. Copy .env.example to .env
cp .env.example .env

# 2. Set a strong DATABASE_PASSWORD
# Edit .env and set DATABASE_PASSWORD

# 3. Start all services
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# 4. Run migrations
docker-compose exec app npx prisma migrate deploy

# 5. Seed the database (first time only)
docker-compose exec app npx tsx prisma/seed.ts
```

## Migration Script

A helper script is available at `scripts/migrate-to-postgres.sh`:

```bash
# Set DATABASE_URL first
export DATABASE_URL="postgresql://blueprint:blueprint_dev@localhost:5432/blueprint?schema=public"

# Run the migration script
bash scripts/migrate-to-postgres.sh
```

This script:
1. Validates the DATABASE_URL is a PostgreSQL URL
2. Runs `prisma migrate deploy`
3. Seeds the database
