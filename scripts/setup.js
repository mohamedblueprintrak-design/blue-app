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
      timeout: options.timeout || 300000, // Default 5 min timeout
      ...options,
    });
    if (result.error) {
      // spawnSync error (e.g., EAGAIN, ENOMEM)
      logError(`Command failed: ${cmd} ${args.join(' ')}`);
      logError(`Error: ${result.error.message}`);
      return false;
    }
    if (result.signal === 'SIGTERM' || result.signal === 'SIGKILL') {
      logError(`Command timed out after ${options.timeout || 300000}ms: ${cmd} ${args.join(' ')}`);
      return false;
    }
    return result.status === 0;
  } catch (err) {
    logError(`Exception running ${cmd} ${args.join(' ')}: ${err.message}`);
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
  // Run prepare-schema.js directly with node — no external deps needed
  const prepResult = spawnSync(runner, ['scripts/prepare-schema.js'], {
    stdio: 'inherit',
    cwd: process.cwd(),
    timeout: 30000,
  });
  if (prepResult.status !== 0) {
    logError('Failed to prepare Prisma schema!');
    logError(`Exit code: ${prepResult.status}, Signal: ${prepResult.signal || 'none'}`);
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
  log('  (This may take 3-10 minutes on first run. Please wait...)');
  const installResult = spawnSync(pkgMgr, ['install'], {
    stdio: 'inherit',
    shell: true,
    cwd: process.cwd(),
    timeout: 600000, // 10 minutes
  });
  if (installResult.status !== 0) {
    logError('Failed to install dependencies!');
    logError(`Exit code: ${installResult.status}, Signal: ${installResult.signal || 'none'}`);
    if (installResult.signal === 'SIGTERM' || installResult.signal === 'SIGKILL') {
      logError('The install timed out. Try running "npm install" manually.');
    }
    rl.close();
    process.exit(1);
  }
  logOK('Dependencies installed');

  // ── Step 8: Create database tables ──────────
  logStep(8, 'Creating Database Tables...');
  log('  (Running prisma db push...)');
  // Use npx --yes to auto-confirm any prompts
  // Or use node_modules/.bin/prisma directly
  const prismaBin = path.join('node_modules', '.bin', 'prisma');
  const prismaCmd = fs.existsSync(prismaBin) ? prismaBin : execCmd;
  const prismaArgs = fs.existsSync(prismaBin) ? ['db', 'push'] : ['--yes', 'prisma', 'db', 'push'];

  const dbPushResult = spawnSync(prismaCmd, prismaArgs, {
    stdio: 'inherit',
    shell: true,
    cwd: process.cwd(),
    timeout: 120000,
  });
  if (dbPushResult.status !== 0) {
    logError('Failed to push database schema!');
    logError(`Exit code: ${dbPushResult.status}, Signal: ${dbPushResult.signal || 'none'}`);
    rl.close();
    process.exit(1);
  }
  logOK('Database schema pushed');

  // ── Step 9: Seed data ───────────────────────
  logStep(9, 'Seeding data...');
  if (isDemo) {
    log('  (Running prisma seed... This may take a minute for demo data)');
    const tsxBin = path.join('node_modules', '.bin', 'tsx');
    const seedCmd = fs.existsSync(tsxBin) ? tsxBin : execCmd;
    const seedArgs = fs.existsSync(tsxBin) ? ['prisma/seed.ts'] : ['--yes', 'tsx', 'prisma/seed.ts'];

    const seedResult = spawnSync(seedCmd, seedArgs, {
      stdio: 'inherit',
      shell: true,
      cwd: process.cwd(),
      timeout: 300000,
    });
    if (seedResult.status !== 0) {
      logError('Failed to seed demo data!');
      logError(`Exit code: ${seedResult.status}, Signal: ${seedResult.signal || 'none'}`);
      rl.close();
      process.exit(1);
    }
    logOK('Demo data seeded');
  } else {
    logOK('Skipped demo data for Production Mode');
  }

  // ── Step 10: Generate Prisma Client ─────────
  logStep(10, 'Generating Prisma Client...');
  const genResult = spawnSync(prismaCmd, fs.existsSync(prismaBin) ? ['generate'] : ['--yes', 'prisma', 'generate'], {
    stdio: 'inherit',
    shell: true,
    cwd: process.cwd(),
    timeout: 120000,
  });
  if (genResult.status !== 0) {
    logError('Failed to generate Prisma Client!');
    logError(`Exit code: ${genResult.status}, Signal: ${genResult.signal || 'none'}`);
    rl.close();
    process.exit(1);
  }
  logOK('Prisma Client ready');

  // ── Step 11: Generate setup token (demo only) ──
  let setupToken = '';
  if (isDemo) {
    logStep(11, 'Generating one-time setup token...');
    try {
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
    } catch (tokenErr) {
      logError(`Failed to generate setup token: ${tokenErr.message}`);
      log('  (Setup will continue, but demo credentials will not be available via token.)');
    }
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

  if (isDemo && setupToken) {
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
  } else if (isDemo) {
    log('[INFO] Demo credentials were seeded. Check the console output');
    log('       from the seed step above, or use: admin@blueprint.ae');
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
    log('\nStarting development server...');
    log('  (Press Ctrl+C to stop the server)');
    log('');
    // Use spawnSync with inherit so the server output shows
    runCommand(pkgMgr, ['run', 'dev'], { timeout: 0 }); // No timeout for dev server
  } else {
    log('\nSetup complete. Press Enter to exit...');
    process.stdin.resume();
    process.stdin.once('data', () => process.exit(0));
  }
}

main().catch((err) => {
  console.error('\n[FATAL] Setup failed:', err.message);
  console.error('\nStack trace:', err.stack);
  console.error('\nPlease check the error above and try again.');
  console.error('If the problem persists, check:');
  console.error('  1. Node.js is installed and in PATH');
  console.error('  2. You have write permissions in this directory');
  console.error('  3. No other process is using port 3000');
  process.exit(1);
});
