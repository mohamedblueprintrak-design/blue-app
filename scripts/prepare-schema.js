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
const updatedContent = content.replace(
  /(datasource db \{[\s\S]*?provider\s*=\s*")[^"]*("[\s\S]*?\})/g,
  `$1${provider}$2`
);

if (content !== updatedContent) {
  fs.writeFileSync(schemaPath, updatedContent, 'utf8');
  console.log(`[Prisma] Updated database provider to "${provider}" in schema.prisma`);
} else {
  console.log(`[Prisma] Database provider is already "${provider}" in schema.prisma`);
}
