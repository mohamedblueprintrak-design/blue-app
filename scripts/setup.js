#!/usr/bin/env node
/**
 * BluePrint Setup Script (Node.js)
 *
 * This script replaces the complex setup.bat logic with a portable Node.js
 * implementation that avoids all cmd.exe parser pitfalls (goto inside if()
 * blocks, delayed expansion, parenthesis in echo, etc.).
 *
 * setup.bat is now just a 3-line launcher that runs this script.
 */

const { execSync, spawnSync } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// ============================================
// Helpers
// ============================================

function log(msg) {
  console.log(msg);
}

function logOK(msg) {
  console.log(`[OK] ${msg}`);
}

function logError(msg) {
  console.error(`[ERROR] ${msg}`);
}

function logStep(step, msg) {
  console.log(`\nStep ${step}: ${msg}`);
}

function question(rl, prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      resolve(answer.trim());
    });
  });
}

function runCommand(cmd, args, options = {}) {
  try {
    const result = spawnSync(cmd, args, {
      stdio: options.silent ? 'pipe' : 'inherit',
      shell: true,
      cwd: process.cwd(),
      ...options,
    });
    return result.status === 0;
  } catch (err) {
    return false;
  }
}

function generateSecret(bytes = 48) {
  return crypto.randomBytes(bytes).toString('hex');
}

// ============================================
// Main
// ============================================

async function main() {
  log('==================================================');
  log('  BluePrint - Engineering Consultancy ERP');
  log('==================================================\n');

  // ── Prerequisites ──────────────────────────
  log('[Checking prerequisites...]');

  let runner = 'node';
  let pkgMgr = 'npm';
  let execCmd = 'npx';

  // Check for bun
  const bunCheck = spawnSync('where', ['bun'], { stdio: 'pipe', shell: true });
  if (bunCheck.status === 0) {
    runner = 'bun';
    pkgMgr = 'bun';
    execCmd = 'bunx';
    logOK('Bun found');
  } else {
    // Check for node
    const nodeCheck = spawnSync('where', ['node'], { stdio: 'pipe', shell: true });
    if (nodeCheck.status !== 0) {
      logError('Neither Bun nor Node.js found! Please install Node.js.');
      process.exit(1);
    }
    logOK('Node.js found');
  }

  // Check for git
  const gitCheck = spawnSync('where', ['git'], { stdio: 'pipe', shell: true });
  if (gitCheck.status !== 0) {
    logError('Git not found. Please install Git.');
    process.exit(1);
  }
  logOK('Git found');
  logOK('Ready to setup\n');

  // ── Step 1: Choose Mode ────────────────────
  log('================================================');
  log('  Step 1: Choose Mode');
  log('================================================');
  log('');
  log('  [1] Demo Mode');
  log('      - Auto-filled login credentials');
  log('      - Sample projects, invoices, tasks');
  log('');
  log('  [2] Production Mode');
  log('      - Requires SMTP for email');
  log('      - No demo data');
  log('');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  let modeChoice = await question(rl, 'Enter choice (1 or 2, default=1): ');
  if (!modeChoice) modeChoice = '1';
  if (modeChoice !== '1' && modeChoice !== '2') modeChoice = '1';

  const isDemo = modeChoice === '1';
  const demoMode = isDemo ? 'true' : 'false';
  const nodeEnv = isDemo ? 'development' : 'production';

  // ── Step 2: Choose Database ─────────────────
  log('\n================================================');
  log('  Step 2: Choose Database');
  log('================================================');
  log('');
  log('  [1] PostgreSQL - For production');
  log('  [2] SQLite - For quick demo');
  log('');

  let dbChoice = await question(rl, 'Enter choice (1 or 2, default=2): ');
  if (!dbChoice) dbChoice = '2';
  if (dbChoice !== '1' && dbChoice !== '2') dbChoice = '2';

  const isPostgres = dbChoice === '1';
  const databaseUrl = isPostgres
    ? 'postgresql://blueprint:blueprint_dev@localhost:5432/blueprint?schema=public'
    : 'file:./db/custom.db';

  // ── Step 3: Generate Secrets ────────────────
  logStep(3, 'Generating Secrets...');
  const jwtSecret = generateSecret(48);
  const encryptionKey = generateSecret(48);
  const csrfSecret = generateSecret(48);
  logOK('Secrets generated');

  // ── Step 4: Create .env ─────────────────────
  logStep(4, 'Creating .env file...');

  if (fs.existsSync('.env')) {
    fs.copyFileSync('.env', '.env.backup');
    logOK('Old .env backed up to .env.backup');
  }

  const envContent = [
    `DATABASE_URL=${databaseUrl}`,
    `JWT_SECRET="${jwtSecret}"`,
    `NEXTAUTH_SECRET="${jwtSecret}"`,
    `CSRF_SECRET="${csrfSecret}"`,
    `ENCRYPTION_KEY="${encryptionKey}"`,
    `DEMO_MODE=${demoMode}`,
    `NODE_ENV=${nodeEnv}`,
    `NEXTAUTH_URL="http://localhost:3000"`,
    `SMTP_HOST=""`,
    `SMTP_PORT="587"`,
    `SMTP_USER=""`,
    `SMTP_PASS=""`,
    `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=""`,
    `STRIPE_SECRET_KEY=""`,
    `STRIPE_WEBHOOK_SECRET=""`,
  ].join('\n') + '\n';

  fs.writeFileSync('.env', envContent, 'utf8');
  logOK('.env configured');

  // ── Step 5: Prepare Prisma schema ───────────
  logStep(5, 'Preparing Prisma schema...');
  if (!runCommand(runner, ['scripts/prepare-schema.js'])) {
    logError('Failed to prepare Prisma schema!');
    rl.close();
    process.exit(1);
  }
  logOK('Prisma schema prepared');

  // ── Step 6: Clean old files ─────────────────
  logStep(6, 'Cleaning old files...');
  if (fs.existsSync('.next')) {
    fs.rmSync('.next', { recursive: true, force: true });
  }
  if (!isPostgres && fs.existsSync('db/custom.db')) {
    fs.unlinkSync('db/custom.db');
  }
  logOK('Cleaned');

  // ── Step 7: Install dependencies ────────────
  logStep(7, `Installing dependencies (${pkgMgr} install)...`);
  if (!runCommand(pkgMgr, ['install'])) {
    logError('Failed to install dependencies!');
    rl.close();
    process.exit(1);
  }
  logOK('Dependencies installed');

  // ── Step 8: Create database tables ──────────
  logStep(8, 'Creating Database Tables...');
  if (!runCommand(execCmd, ['prisma', 'db', 'push'])) {
    logError('Failed to push database schema!');
    rl.close();
    process.exit(1);
  }
  logOK('Database schema pushed');

  // ── Step 9: Seed data ───────────────────────
  logStep(9, 'Seeding data...');
  if (isDemo) {
    if (!runCommand(execCmd, ['tsx', 'prisma/seed.ts'])) {
      logError('Failed to seed demo data!');
      rl.close();
      process.exit(1);
    }
    logOK('Demo data seeded');
  } else {
    logOK('Skipped demo data for Production Mode');
  }

  // ── Step 10: Generate Prisma Client ─────────
  logStep(10, 'Generating Prisma Client...');
  if (!runCommand(execCmd, ['prisma', 'generate'])) {
    logError('Failed to generate Prisma Client!');
    rl.close();
    process.exit(1);
  }
  logOK('Prisma Client ready');

  // ── Step 11: Generate setup token (demo only) ──
  let setupToken = '';
  if (isDemo) {
    logStep(11, 'Generating one-time setup token...');
    const token = crypto.randomBytes(24).toString('hex');
    const hash = crypto.createHash('sha256').update(token).digest('hex');
    const now = Date.now();
    const tokenData = {
      version: 1,
      tokens: [{ hash, createdAt: now, consumed: false }],
      updatedAt: new Date().toISOString(),
    };
    fs.writeFileSync('.setup-tokens.json', JSON.stringify(tokenData, null, 2), 'utf8');
    setupToken = token;
    logOK('Setup token generated');
  }

  // ── Summary ─────────────────────────────────
  log('\n==================================================');
  log('           [OK] Setup Complete!');
  log('==================================================\n');
  log('------------------------------------------------');
  log(`  Mode:     ${isDemo ? 'DEMO' : 'PRODUCTION'}`);
  log('  URL:      http://localhost:3000');
  log(`  Database: ${isPostgres ? 'PostgreSQL' : 'SQLite'}`);
  log('------------------------------------------------\n');

  if (isDemo) {
    log('[SECURE] To view demo login credentials:');
    log('');
    log('  1. Open this URL in your browser:');
    log('     http://localhost:3000/setup-complete');
    log('');
    log('  2. Enter the following setup token (one-time use only):');
    log('');
    log(`     ${setupToken}`);
    log('');
    log('  [!] Save this token now - it will not be shown again.');
    log('      The token is valid for 24 hours from now.');
    log('');
  } else {
    log('[WARN] NOTE FOR PRODUCTION:');
    log('Please edit .env to configure your SMTP and Stripe keys before going live.');
    log('');
  }

  // ── Ask to start server ─────────────────────
  let startDev = await question(rl, 'Start server now? (y/n, default=y): ');
  if (!startDev) startDev = 'y';

  rl.close();

  if (startDev.toLowerCase() === 'y') {
    log('\nStarting development server...\n');
    runCommand(pkgMgr, ['run', 'dev']);
  } else {
    log('\nSetup complete. Press Enter to exit...');
    process.stdin.resume();
    process.stdin.once('data', () => process.exit(0));
  }
}

main().catch((err) => {
  console.error('\n[FATAL] Setup failed:', err.message);
  process.exit(1);
});
