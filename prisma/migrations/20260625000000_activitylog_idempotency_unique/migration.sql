-- ============================================================================
-- Migration: Add @@unique([action, entityId]) to ActivityLog for idempotency
-- Date: 2026-06-25
--
-- Purpose: Enables atomic idempotency for Stripe webhook processing.
-- Without this constraint, two concurrent webhook deliveries (Stripe retries
-- within seconds) can both pass the findFirst check and both process the
-- event — creating duplicate payment records.
--
-- With this constraint, the webhook handler uses activityLog.create() as an
-- atomic "claim": the first request succeeds, the second hits P2002 (unique
-- constraint violation) and is rejected as a duplicate.
--
-- Note: This constraint only applies to NEW rows. Existing duplicate rows
-- (if any) must be cleaned up before this migration runs. The DO block
-- below removes duplicates, keeping only the oldest row per (action, entityId).
-- ============================================================================

-- Clean up any existing duplicates before adding the constraint.
-- Keep the oldest row (MIN(id) assuming CUID ordering ~ chronological);
-- delete the rest. This is safe because duplicate webhook logs carry the
-- same eventId and represent the same processed event.
DO $$
BEGIN
  -- Delete duplicate ActivityLog rows where (action, entityId) is the same,
  -- keeping only the row with the smallest createdAt (oldest).
  -- We use ctid (physical row identifier) to identify duplicates deterministically.
  DELETE FROM "ActivityLog"
  WHERE id IN (
    SELECT id FROM (
      SELECT
        id,
        ROW_NUMBER() OVER (
          PARTITION BY "action", "entityId"
          ORDER BY "createdAt" ASC, id ASC
        ) AS rn
      FROM "ActivityLog"
      WHERE "action" = 'stripe_webhook'
        AND "entityId" IS NOT NULL
        AND "entityId" <> ''
    ) ranked
    WHERE rn > 1
  );
EXCEPTION
  WHEN undefined_column THEN NULL;
  WHEN undefined_table THEN NULL;
END $$;

-- Add the unique constraint. Wrapped in DO block for idempotency.
DO $$
BEGIN
  ALTER TABLE "ActivityLog"
    ADD CONSTRAINT "ActivityLog_action_entityId_key"
    UNIQUE ("action", "entityId");
EXCEPTION
  WHEN duplicate_table THEN NULL;  -- constraint already exists
  WHEN duplicate_object THEN NULL;
  WHEN undefined_column THEN NULL;
  WHEN undefined_table THEN NULL;
END $$;
