-- ============================================================================
-- Migration: Normalize Payment.status to the uppercase vocabulary
-- Date: 2026-09-01
--
-- Problem: Payment.status was written with MIXED CASE conventions:
--   - Column default was 'pending' (lowercase) — applied to every standalone
--     voucher created without an explicit status
--   - Invoice-payment vouchers written as 'APPROVED'
--   - Stripe webhook payments written as 'COMPLETED'
--   - UI (payments page) filters and mutations use UPPERCASE only
--     (p.status === "PENDING" etc.), so lowercase rows were invisible in the
--     pending filter and could not be approved/completed from the UI.
--
-- Fix (single source of truth = UPPERCASE, matching UI + services):
--   1. UPDATE existing rows to UPPER(status)
--   2. Change the column default to 'PENDING'
--
-- The application also now writes 'PENDING' explicitly on the standalone
-- voucher path, so this migration is a safety net for legacy data.
--
-- Idempotent: safe to run again (second run updates 0 rows).
-- ============================================================================

-- 1) Normalize existing rows (Postgres; migrations run via `prisma migrate deploy`)
UPDATE "Payment" SET status = UPPER(status) WHERE status <> UPPER(status);

-- 2) Align the column default with schema.prisma (@default("PENDING"))
ALTER TABLE "Payment" ALTER COLUMN "status" SET DEFAULT 'PENDING';
