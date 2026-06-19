# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.0] - 2026-06-19

### Added
- **Step-up 2FA middleware** (`src/lib/auth/step-up-2fa.ts`) for sensitive operations:
  - Requires `X-2FA-Code` header for one-time verification
  - 5-minute step-up session window to avoid re-prompting within the same task
  - Single-use: cleared after one-shot operations (delete-account, cancel-subscription)
  - Graceful bypass for users without 2FA enabled (with security log)
- **Setup-complete page** (`/setup-complete`) for one-time demo credentials display:
  - New API route `POST /api/auth/setup-complete` validates one-time tokens
  - Tokens stored hashed (SHA-256) in `.setup-tokens.json` (mode 600)
  - Tokens are single-use, expire after 24 hours
  - Page includes copy buttons + auto-clear after 2 minutes
  - `setup.sh` updated to generate + print token instead of plaintext password
- **E2E billing flow tests** (`e2e/invoice-payment-flow.spec.ts`) — 12 test cases covering:
  - Login → invoices → payments → billing page navigation
  - API contract verification (GET /api/invoices, /api/payments, /api/stripe/plans)
  - Stripe webhook security: rejects unsigned + tampered-signature events
  - Logout flow verification
- **Integration test for step-up 2FA** (`__tests__/integration/step-up-2fa-flow.test.ts`) — tests:
  - Sensitive routes return 403 STEP_UP_2FA_REQUIRED when 2FA enabled but no code
  - Sensitive routes return 403 STEP_UP_2FA_INVALID when code is wrong
  - Step-up session reused within 5-minute window
  - Session cleared after one-shot operations

### Changed
- **README.md overhaul** — full rewrite:
  - Removed incorrect Vercel deployment recommendation (app requires WebSocket + workers)
  - Added complete Tech Stack section (Sentry, BullMQ, Redis, Socket.io, PWA, etc.)
  - Added Security section pointing to docs/security-audit.md
  - Added Monitoring & Health section
  - Added License section (Commercial Proprietary)
  - Added Contributing + Changelog references
  - Added Project Structure overview
  - Corrected Docker deployment instructions
- **CSP header** (`src/lib/middleware/security.ts`) — replaced `'unsafe-inline'` for styles
  with per-request nonce-based style-src, matching the existing script-src approach.
- **`setup.sh`** — now generates a one-time setup token instead of printing plaintext
  credentials to the terminal. Users open `/setup-complete` in the browser to view
  credentials once.
- **`docs/security-audit.md`** — fixed typos and grammar issues:
  - "iddleware.ts]" → "[middleware.ts]"
  - "تتم استحالة القيام بها إلا" → "تتم حصرياً عبر"
  - Corrected shutdown.ts path reference
- **ESLint cleanup** — removed 9 unused `eslint-disable` directives from pre-existing files
  (auto-fixed via `eslint --fix`). CI was failing with `--max-warnings=0`.

### Security
- **CVE/GHSA-p6gq-j5cr-w38f** — upgraded `nodemailer` from 8.0.11 to 9.0.1.
  Vulnerability: Message-level raw option bypasses disableFileAccess/disableUrlAccess,
  enabling arbitrary file read and full-response SSRF in the delivered message.
- **Step-up 2FA** now protects the following sensitive routes:
  - `DELETE /api/profile/delete-account`
  - `PUT /api/profile/password` (change password)
  - `PUT /api/stripe/subscriptions` (upgrade/downgrade subscription)
  - `DELETE /api/stripe/subscriptions` (cancel subscription)
- **Demo credentials** no longer printed to terminal in plaintext — replaced with
  one-time token system (single-use, 24h expiry, SHA-256 hashed).

### Removed
- Closed GitHub issue #6 (i18n missing translations) — was already fixed but never closed.
- Closed GitHub issue #24 (`@ts-nocheck` in chat-service) — was already fixed but never closed.

---

## [0.2.0] - 2026-06-18

### Added
- Exponentiated process shutdown management with `shutdown.ts` lifecycle orchestrator.
- Health endpoint monitoring extensions (Redis connection/ping latency, BullMQ status, and chat-service health check).
- Rate limiter middleware to `chat-service` for WebSocket connections (IP and connection-based limits).
- Verification of 100% matched Arabic (`ar.json`) and English (`en.json`) localization translation keys.
- CSP nonce integration in request headers for Next.js App Router.
- Commitlint + Conventional Commits enforcement via `.husky/commit-msg`.
- Dependabot configuration for weekly dependency updates.
- `CHANGELOG.md`, `CONTRIBUTING.md`, `LICENSE` (Commercial Proprietary), and `NOTICE` files.

### Changed
- Consolidated JWT logic by replacing Node-only `jsonwebtoken` library with Edge-compatible `jose`.
- Consolidated Prisma schemas, merging SQLite and PostgreSQL schemas into a single dynamic schema provider logic.
- Standardized WebSocket chat room naming convention to prefix rooms with `org:`.
- Fixed `/api/demo/reset` endpoint to enforce authenticated sessions.
- Enhanced `/api/auth/demo-credentials` to perform secure server-side login instead of returning plaintext passwords to the client.
- Fixed multi-tenancy filters in `TaskService` to use direct `organizationId` instead of nested project-creator organization checks.
- Enforced soft-delete record filtration in base repository layer (`deletedAt: null`).
- Corrected Prisma non-existent schema properties (`username`, `lastLoginAt`, `fullName`) in `UserRepository`.
- Secured E2E test credentials — moved from hardcoded values to `.env.test` (loaded by `playwright.config.ts`).
- Moved `audit_full.txt` to `docs/security-audit.md` and expanded with CSP, graceful shutdown, and health monitoring sections.

### Security
- Fixed JWT/header exposure in `/api/dashboard` server logs.
- Integrated `checkPasswordBreached` validation check upon registration and password resets.
- Prevented negative payment allocations in `InvoiceService`.
- Added authentication validation check to WebSocket `join_organization` event listeners.
- Fixed IDOR bypass in chat-service catch block (reject subscription on DB failure).
- Removed `download/` folder (scratch files: `github_repo.json`, `qa-landing-page.png`).
- Added `.env.test` to `.gitignore`.

---

## [0.1.0] - 2026-05-31

### Added
- Initial project workspace configuration.
- Setup script with SQLite database provider support.
