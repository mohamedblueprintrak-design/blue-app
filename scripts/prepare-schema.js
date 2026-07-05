/**
 * scripts/prepare-schema.js
 *
 * This script flips the Prisma datasource provider between `sqlite` and
 * `postgresql` based on DATABASE_URL / DATABASE_PROVIDER at install time,
 * and adjusts Decimal precision annotations accordingly.
 *
 * DESIGN TRADE-OFF (P3-32, tracked for refactor in v0.4.0):
 * Mutating `prisma/schema.prisma` in place at install time is not ideal —
 * it produces surprising diffs on `bun install` and can mask the source of
 * schema changes. The lower-risk fix applied here (Option B from the audit)
 * is to GUARD the script so it only mutates when DATABASE_URL is set.
 * This prevents the schema from flipping to `sqlite` (the default) on every
 * `bun install` in CI / fresh clones where no .env exists yet. The
 * mutation is also idempotent (line 59 already skips the write when the
 * content has not changed).
 *
 * The proper long-term fix (Option A) is to render the schema into a
 * temporary `prisma/schema.generated.prisma` and point `package.json`'s
 * `prisma.schema` field at it — scheduled for v0.4.0.
 */

if (!process.env.DATABASE_URL) {
  console.log('[prepare-schema] DATABASE_URL not set, skipping schema preparation');
  process.exit(0);
}

const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, '../prisma/schema.prisma');
const envPath = path.join(__dirname, '../.env');

if (!fs.existsSync(schemaPath)) {
  console.error('schema.prisma not found!');
  process.exit(1);
}

let databaseUrl = process.env.DATABASE_URL || '';
let databaseProvider = process.env.DATABASE_PROVIDER || '';

// If env vars are empty, manually parse the .env file if it exists
if (!databaseUrl && fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const dbUrlMatch = envContent.match(/^DATABASE_URL\s*=\s*["']?([^"'\r\n]+)/m);
  if (dbUrlMatch) {
    databaseUrl = dbUrlMatch[1];
  }
  const dbProviderMatch = envContent.match(/^DATABASE_PROVIDER\s*=\s*["']?([^"'\r\n]+)/m);
  if (dbProviderMatch) {
    databaseProvider = dbProviderMatch[1];
  }
}

let provider = 'sqlite';
if (
  databaseUrl.startsWith('postgresql://') ||
  databaseUrl.startsWith('postgres://') ||
  databaseProvider === 'postgresql'
) {
  provider = 'postgresql';
}

let content = fs.readFileSync(schemaPath, 'utf8');

// Replace the provider in the datasource block
let updatedContent = content.replace(
  /(datasource db \{[\s\S]*?provider\s*=\s*")[^"]*("[\s\S]*?\})/g,
  `$1${provider}$2`
);

// Apply/Remove @db.Decimal(18, 2) based on provider
if (provider === 'postgresql') {
  // Add @db.Decimal(18, 2) to all Decimal fields
  updatedContent = updatedContent.replace(/(\b\w+\s+)Decimal(\s+.*)?$/gm, (match, fieldNameAndSpaces, rest) => {
    if (rest && rest.includes('@db.Decimal')) {
      return match;
    }
    return `${fieldNameAndSpaces}Decimal @db.Decimal(18, 2)${rest || ''}`;
  });
} else {
  // Remove @db.Decimal(...) if switching back to sqlite
  updatedContent = updatedContent.replace(/ @db\.Decimal\([^)]*\)/g, '');
}

if (content !== updatedContent) {
  fs.writeFileSync(schemaPath, updatedContent, 'utf8');
  console.log(`[Prisma] Updated database provider to "${provider}" and adjusted Decimal precision in schema.prisma`);
} else {
  console.log(`[Prisma] Database provider is already "${provider}" in schema.prisma`);
}
