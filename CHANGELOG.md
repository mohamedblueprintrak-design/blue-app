# Changelog

All notable changes to this project will be documented in this file.

## [0.2.0] - 2026-06-18

### Added
- Exponentiated process shutdown management with `shutdown.ts` lifecycle orchestrator.
- Health endpoint monitoring extensions (Redis connection/ping latency, BullMQ status, and chat-service health check).
- Rate limiter middleware to `chat-service` for WebSocket connections (IP and connection-based limits).
- Verification of 100% matched Arabic (`ar.json`) and English (`en.json`) localization translation keys.

### Changed
- Consolidated JWT logic by replacing Node-only `jsonwebtoken` library with Edge-compatible `jose`.
- Consolidated Prisma schemas, merging SQLite and PostgreSQL schemas into a single dynamic schema provider logic.
- Standardized WebSocket chat room naming convention to prefix rooms with `org:`.
- Fixed `/api/demo/reset` endpoint to enforce authenticated sessions.
- Enhanced `/api/auth/demo-credentials` to perform secure server-side login instead of returning plaintext passwords to the client.
- Fixed multi-tenancy filters in `TaskService` to use direct `organizationId` instead of nested project-creator organization checks.
- Enforced soft-delete record filtration in base repository layer (`deletedAt: null`).
- Corrected Prisma non-existent schema properties (`username`, `lastLoginAt`, `fullName`) in `UserRepository`.

### Security
- Fixed JWT/header exposure in `/api/dashboard` server logs.
- Integrated `checkPasswordBreached` validation check upon registration and password resets.
- Prevented negative payment allocations in `InvoiceService`.
- Added authentication validation check to WebSocket `join_organization` event listeners.

## [0.1.0] - 2026-05-31

### Added
- Initial project workspace configuration.
- Setup script with SQLite database provider support.
