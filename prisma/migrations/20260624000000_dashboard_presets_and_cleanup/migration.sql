-- ============================================================================
-- Migration: Add DashboardPreset and Sequence, and clean up User dead columns
-- Date: 2026-06-24
-- ============================================================================

-- CreateTable: DashboardPreset
CREATE TABLE IF NOT EXISTS "DashboardPreset" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "layout" TEXT NOT NULL DEFAULT '[]',
    "widgets" TEXT NOT NULL DEFAULT '[]',
    "organizationId" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DashboardPreset_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Sequence
CREATE TABLE IF NOT EXISTS "Sequence" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "value" INTEGER NOT NULL DEFAULT 0,
    "organizationId" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Sequence_pkey" PRIMARY KEY ("id")
);

-- CreateIndexes
CREATE UNIQUE INDEX IF NOT EXISTS "Sequence_name_organizationId_key" ON "Sequence"("name", "organizationId");
CREATE INDEX IF NOT EXISTS "DashboardPreset_organizationId_idx" ON "DashboardPreset"("organizationId");
CREATE INDEX IF NOT EXISTS "DashboardPreset_createdById_idx" ON "DashboardPreset"("createdById");

-- AddForeignKey constraints wrapped in DO blocks for Postgres idempotency
DO $$ BEGIN
    ALTER TABLE "DashboardPreset" ADD CONSTRAINT "DashboardPreset_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN undefined_column THEN NULL;
    WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "DashboardPreset" ADD CONSTRAINT "DashboardPreset_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN undefined_column THEN NULL;
    WHEN undefined_table THEN NULL;
END $$;

-- Drop dead columns from User if they exist
ALTER TABLE "User" DROP COLUMN IF EXISTS "verifyToken";
ALTER TABLE "User" DROP COLUMN IF EXISTS "verifyTokenExpiry";
ALTER TABLE "User" DROP COLUMN IF EXISTS "resetToken";
ALTER TABLE "User" DROP COLUMN IF EXISTS "resetTokenExpiry";
ALTER TABLE "User" DROP COLUMN IF EXISTS "twoFactorSecret";
ALTER TABLE "User" DROP COLUMN IF EXISTS "backupCodes";
