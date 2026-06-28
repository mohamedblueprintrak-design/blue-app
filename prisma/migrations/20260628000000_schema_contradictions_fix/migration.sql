-- ============================================================================
-- Migration: Fix schema contradictions in FeatureFlag, Sequence, DashboardPreset
-- Date: 2026-06-28
--
-- 1. FeatureFlag: key @unique (global) → @@unique([key, organizationId])
--    Allows multiple orgs to have flags with the same key.
--    organizationId becomes nullable (null = global flag).
--
-- 2. Sequence: organizationId @default("") → nullable
--    Null means global sequence; non-null means org-specific.
--
-- 3. DashboardPreset: add isSystem boolean column
--    System presets are shared across all orgs (organizationId = null + isSystem = true).
-- ============================================================================

-- ── 1. FeatureFlag ──────────────────────────────────────────────────────

-- Drop the old global unique constraint on key
DO $$ BEGIN
  ALTER TABLE "FeatureFlag" DROP CONSTRAINT IF EXISTS "FeatureFlag_key_key";
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

-- Make organizationId nullable (was required)
DO $$ BEGIN
  ALTER TABLE "FeatureFlag" ALTER COLUMN "organizationId" DROP NOT NULL;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

-- Drop the old FK (was required, now optional)
DO $$ BEGIN
  ALTER TABLE "FeatureFlag" DROP CONSTRAINT IF EXISTS "FeatureFlag_organizationId_fkey";
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

-- Re-add FK as optional (ON DELETE CASCADE)
DO $$ BEGIN
  ALTER TABLE "FeatureFlag" ADD CONSTRAINT "FeatureFlag_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Add new composite unique constraint
DO $$ BEGIN
  ALTER TABLE "FeatureFlag" ADD CONSTRAINT "FeatureFlag_key_organizationId_key"
    UNIQUE ("key", "organizationId");
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── 2. Sequence ─────────────────────────────────────────────────────────

-- Change organizationId from @default("") to nullable
DO $$ BEGIN
  ALTER TABLE "Sequence" ALTER COLUMN "organizationId" DROP DEFAULT;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "Sequence" ALTER COLUMN "organizationId" DROP NOT NULL;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

-- ── 3. DashboardPreset ──────────────────────────────────────────────────

-- Add isSystem column (default false)
DO $$ BEGIN
  ALTER TABLE "DashboardPreset" ADD COLUMN IF NOT EXISTS "isSystem" BOOLEAN NOT NULL DEFAULT false;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Add index on isSystem
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS "DashboardPreset_isSystem_idx" ON "DashboardPreset"("isSystem");
EXCEPTION WHEN undefined_table THEN NULL;
END $$;
