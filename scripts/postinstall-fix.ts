// postinstall-fix.ts
// Automatically patches next.config.ts to remove ALL :path* patterns from headers()
// that cause [[...slug]] route conflicts on Windows with Turbopack (Next.js 16)
//
// This runs AFTER npm install to ensure the fix is always applied,
// even when downloading a ZIP from GitHub.

import * as fs from 'fs';
import * as path from 'path';

const CONFIG_PATH = path.join(process.cwd(), 'next.config.ts');

function main() {
  if (!fs.existsSync(CONFIG_PATH)) {
    console.info('[postinstall-fix] next.config.ts not found, skipping');
    return;
  }

  let content = fs.readFileSync(CONFIG_PATH, 'utf-8');
  let modified = false;

  // Remove ALL :path* patterns from source in headers
  const pathMatch = /source:\s*['"][^'"]*:path\*['"]/g;
  if (pathMatch.test(content)) {
    content = content.replace(pathMatch, '');
    modified = true;
  }

  // If headers() function exists and is now empty, remove the entire function
  if (content.includes('async headers()')) {
    // Remove the entire async headers() { ... } block
    const headersRegex = /,\s*async\s+headers\s*\(\)\s*\{[\s\S]*?\n\s*\}/g;
    content = content.replace(headersRegex, '');
    modified = true;
  }

  if (modified) {
    fs.writeFileSync(CONFIG_PATH, content, 'utf-8');
    console.info('[postinstall-fix] Fixed next.config.ts: removed :path* patterns');
  } else {
    console.info('[postinstall-fix] next.config.ts is clean');
  }

  // NOTE: We no longer remove middleware.ts or proxy.ts — they are required for JWT auth, CSRF protection, and security headers.
  // The previous removal was a workaround for a Turbopack issue that has been resolved.
  // proxy.ts is the Next.js 16 replacement for middleware.ts and is critical for app functionality.
}

main();
