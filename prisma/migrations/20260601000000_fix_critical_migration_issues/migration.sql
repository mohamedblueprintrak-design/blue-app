-- ============================================================================
-- Migration: Fix critical migration issues
-- Date: 2026-06-01
-- Author: P0-9 Migration Fixer
-- ============================================================================
-- PURPOSE:
--   This migration addresses three critical migration issues found during
--   the security/infra audit of the blue-app repository. It is written in
--   pure PostgreSQL (double-quoted identifiers, no MySQL/SQLite backticks)
--   and is fully idempotent so it is safe to re-run on databases that have
--   already been bootstrapped via `prisma db push`.
--
-- ISSUES FIXED:
--
--   (1) EIGHT MISSING MODELS — NO CREATE TABLE MIGRATION
--       The following models are declared in prisma/schema.prisma but were
--       never created by a migration. They only existed in dev databases
--       bootstrapped via `prisma db push`, which means production databases
--       provisioned through `prisma migrate deploy` are missing them:
--         - FeatureFlag
--         - GuaranteeLetter
--         - InvoicePayment
--         - ProgressClaim
--         - PushSubscription
--         - Retainage
--         - Timesheet
--         - TimesheetEntry
--       This migration creates each one with `CREATE TABLE IF NOT EXISTS`
--       so it is a no-op on DBs where the table already exists.
--
--   (2) MISSING FOREIGN KEY CONSTRAINTS FOR organizationId COLUMNS
--       Migration `20260518_add_organization_id` added an `organizationId`
--       column + index to 39 tables but did NOT add a `FOREIGN KEY ...
--       REFERENCES Organization(id)` constraint for any of them. This
--       allows orphaned rows that reference non-existent organizations,
--       defeating multi-tenant data integrity. This migration adds the
--       missing FK constraints with `ON DELETE CASCADE` (matching the
--       schema's NOT NULL intent) using idempotent DO blocks.
--
--   (3) DIALECT MISMATCH (MITIGATION)
--       Migration `20260518_add_organization_id` uses MySQL/SQLite backtick
--       quoting (`` ` ``) which is invalid PostgreSQL syntax. While this
--       NEW migration cannot retroactively fix that file's syntax (it must
--       be addressed separately — either by rewriting that migration or by
--       `prisma migrate resolve --applied` followed by manual ALTERs), this
--       migration is itself pure PostgreSQL so it does not compound the
--       problem. The `IF NOT EXISTS` / `IF EXISTS` / DO-block patterns
--       ensure this migration is safe regardless of whether migration 2
--       has been successfully applied.
--
-- IDEMPOTENCY NOTES:
--   - All CREATE TABLE statements use `IF NOT EXISTS`.
--   - All CREATE INDEX statements use `IF NOT EXISTS`.
--   - All ADD CONSTRAINT statements are wrapped in `DO $$ BEGIN ... EXCEPTION
--     WHEN duplicate_object THEN NULL; WHEN undefined_column THEN NULL; END $$;`
--     blocks so they are no-ops if the constraint (or the underlying column)
--     already exists / is missing.
--   - This migration is safe to run on a fresh DB, a db-pushed DB, or a DB
--     where migration 2 was only partially applied.
-- ============================================================================


-- ============================================================================
-- PART 1: CREATE THE 8 MISSING TABLES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1.1 FeatureFlag
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "FeatureFlag" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameAr" TEXT,
    "description" TEXT,
    "descriptionAr" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "enabledForOrgs" TEXT,
    "enabledForRoles" TEXT,
    "percentage" INTEGER NOT NULL DEFAULT 100,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeatureFlag_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "FeatureFlag_key_key" ON "FeatureFlag"("key");
CREATE INDEX IF NOT EXISTS "FeatureFlag_organizationId_idx" ON "FeatureFlag"("organizationId");

-- ----------------------------------------------------------------------------
-- 1.2 GuaranteeLetter
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "GuaranteeLetter" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'PERFORMANCE',
    "guaranteeNumber" TEXT NOT NULL DEFAULT '',
    "bankName" TEXT NOT NULL DEFAULT '',
    "amount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'AED',
    "issueDate" TIMESTAMP(3),
    "expiryDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "beneficiaryName" TEXT NOT NULL DEFAULT '',
    "documentUrl" TEXT NOT NULL DEFAULT '',
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GuaranteeLetter_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "GuaranteeLetter_projectId_idx" ON "GuaranteeLetter"("projectId");
CREATE INDEX IF NOT EXISTS "GuaranteeLetter_type_idx" ON "GuaranteeLetter"("type");
CREATE INDEX IF NOT EXISTS "GuaranteeLetter_status_idx" ON "GuaranteeLetter"("status");
CREATE INDEX IF NOT EXISTS "GuaranteeLetter_organizationId_idx" ON "GuaranteeLetter"("organizationId");
CREATE INDEX IF NOT EXISTS "GuaranteeLetter_expiryDate_idx" ON "GuaranteeLetter"("expiryDate");
CREATE INDEX IF NOT EXISTS "GuaranteeLetter_deletedAt_idx" ON "GuaranteeLetter"("deletedAt");

-- ----------------------------------------------------------------------------
-- 1.3 InvoicePayment (junction table between Invoice and Payment)
--     NOTE: schema declares `createdById` (renamed from legacy `createdBy`
--     by migration 2). On DBs where migration 2 was never applied, this
--     CREATE TABLE creates the column directly with the new name.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "InvoicePayment" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvoicePayment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "InvoicePayment_invoiceId_idx" ON "InvoicePayment"("invoiceId");
CREATE INDEX IF NOT EXISTS "InvoicePayment_paymentId_idx" ON "InvoicePayment"("paymentId");

-- ----------------------------------------------------------------------------
-- 1.4 ProgressClaim
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "ProgressClaim" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "claimNumber" TEXT NOT NULL DEFAULT '',
    "period" TEXT NOT NULL DEFAULT '',
    "claimDate" TIMESTAMP(3),
    "totalClaimAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "approvedAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "previousCertified" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "currentCertified" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "retentionAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "netPayment" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "certifiedDate" TIMESTAMP(3),
    "certifiedById" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProgressClaim_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ProgressClaim_projectId_idx" ON "ProgressClaim"("projectId");
CREATE INDEX IF NOT EXISTS "ProgressClaim_status_idx" ON "ProgressClaim"("status");
CREATE INDEX IF NOT EXISTS "ProgressClaim_organizationId_idx" ON "ProgressClaim"("organizationId");
CREATE INDEX IF NOT EXISTS "ProgressClaim_claimNumber_idx" ON "ProgressClaim"("claimNumber");
CREATE INDEX IF NOT EXISTS "ProgressClaim_deletedAt_idx" ON "ProgressClaim"("deletedAt");

-- ----------------------------------------------------------------------------
-- 1.5 PushSubscription (no organizationId — user-scoped)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "PushSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PushSubscription_endpoint_key" ON "PushSubscription"("endpoint");
CREATE INDEX IF NOT EXISTS "PushSubscription_userId_idx" ON "PushSubscription"("userId");

-- ----------------------------------------------------------------------------
-- 1.6 Retainage
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "Retainage" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "invoiceId" TEXT,
    "percentage" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "retainedAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "releaseDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'HELD',
    "releasedAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "releasedDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Retainage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Retainage_projectId_idx" ON "Retainage"("projectId");
CREATE INDEX IF NOT EXISTS "Retainage_status_idx" ON "Retainage"("status");
CREATE INDEX IF NOT EXISTS "Retainage_organizationId_idx" ON "Retainage"("organizationId");

-- ----------------------------------------------------------------------------
-- 1.7 Timesheet
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "Timesheet" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "projectId" TEXT,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "weekEnd" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "totalHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT NOT NULL DEFAULT '',
    "rejectedReason" TEXT,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3),
    "organizationId" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Timesheet_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Timesheet_employeeId_weekStart_key" ON "Timesheet"("employeeId", "weekStart");
CREATE INDEX IF NOT EXISTS "Timesheet_employeeId_idx" ON "Timesheet"("employeeId");
CREATE INDEX IF NOT EXISTS "Timesheet_projectId_idx" ON "Timesheet"("projectId");
CREATE INDEX IF NOT EXISTS "Timesheet_approvedById_idx" ON "Timesheet"("approvedById");
CREATE INDEX IF NOT EXISTS "Timesheet_organizationId_idx" ON "Timesheet"("organizationId");
CREATE INDEX IF NOT EXISTS "Timesheet_weekStart_idx" ON "Timesheet"("weekStart");
CREATE INDEX IF NOT EXISTS "Timesheet_status_idx" ON "Timesheet"("status");
CREATE INDEX IF NOT EXISTS "Timesheet_deletedAt_idx" ON "Timesheet"("deletedAt");

-- ----------------------------------------------------------------------------
-- 1.8 TimesheetEntry (child of Timesheet, no organizationId)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "TimesheetEntry" (
    "id" TEXT NOT NULL,
    "timesheetId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "hours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "taskType" TEXT NOT NULL DEFAULT 'STANDARD',
    "description" TEXT NOT NULL DEFAULT '',
    "projectId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TimesheetEntry_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "TimesheetEntry_timesheetId_idx" ON "TimesheetEntry"("timesheetId");
CREATE INDEX IF NOT EXISTS "TimesheetEntry_projectId_idx" ON "TimesheetEntry"("projectId");


-- ============================================================================
-- PART 2: ADD FK CONSTRAINTS FOR organizationId COLUMNS
--         ADDED BY MIGRATION `20260518_add_organization_id`
-- ============================================================================
-- These 39 tables received an `organizationId TEXT` column + index from
-- migration 2, but NO foreign key constraint. We add the FK here with
-- ON DELETE CASCADE (matching the schema's NOT NULL intent for these
-- business tables) wrapped in idempotent DO blocks.
--
-- Exception handlers:
--   - duplicate_object : constraint already exists -> skip
--   - undefined_column : column missing (migration 2 didn't run) -> skip
--   - undefined_table  : table missing entirely -> skip
-- ============================================================================

-- 2.1 ADD organizationId FKs for the 31 tables in migration 2's
--     "ADD organizationId COLUMNS" section.

DO $$ BEGIN ALTER TABLE "CompanySettings" ADD CONSTRAINT "CompanySettings_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "MunicipalityCorrespondence" ADD CONSTRAINT "MunicipalityCorrespondence_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "ProjectStage" ADD CONSTRAINT "ProjectStage_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "MunicipalRejection" ADD CONSTRAINT "MunicipalRejection_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "GovApproval" ADD CONSTRAINT "GovApproval_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "ClientInteraction" ADD CONSTRAINT "ClientInteraction_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "SiteDiary" ADD CONSTRAINT "SiteDiary_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "RFI" ADD CONSTRAINT "RFI_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Submittal" ADD CONSTRAINT "Submittal_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "ChangeOrder" ADD CONSTRAINT "ChangeOrder_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Transmittal" ADD CONSTRAINT "Transmittal_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "BOQItem" ADD CONSTRAINT "BOQItem_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Employee" ADD CONSTRAINT "Employee_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Leave" ADD CONSTRAINT "Leave_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Supplier" ADD CONSTRAINT "Supplier_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "QuoteRequest" ADD CONSTRAINT "QuoteRequest_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "KnowledgeArticle" ADD CONSTRAINT "KnowledgeArticle_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Notification" ADD CONSTRAINT "Notification_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Approval" ADD CONSTRAINT "Approval_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "DesignPhase" ADD CONSTRAINT "DesignPhase_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "SupervisionChecklist" ADD CONSTRAINT "SupervisionChecklist_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Violation" ADD CONSTRAINT "Violation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Commission" ADD CONSTRAINT "Commission_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Referral" ADD CONSTRAINT "Referral_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "MarketingCampaign" ADD CONSTRAINT "MarketingCampaign_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "WorkflowTemplate" ADD CONSTRAINT "WorkflowTemplate_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "SecurityAuditLog" ADD CONSTRAINT "SecurityAuditLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "ContractorEvaluation" ADD CONSTRAINT "ContractorEvaluation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $$;

-- 2.2 ADD organizationId FKs for the 8 tables in migration 2's
--     "ADD organizationId TO CRITICAL CHILD MODELS" section.

DO $$ BEGIN ALTER TABLE "ProjectComment" ADD CONSTRAINT "ProjectComment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "ProjectAssignment" ADD CONSTRAINT "ProjectAssignment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "TaskComment" ADD CONSTRAINT "TaskComment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "SLABreach" ADD CONSTRAINT "SLABreach_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "NotificationSettings" ADD CONSTRAINT "NotificationSettings_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "AIChatConversation" ADD CONSTRAINT "AIChatConversation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "AIChatMessage" ADD CONSTRAINT "AIChatMessage_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "ProjectWorkflow" ADD CONSTRAINT "ProjectWorkflow_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $$;


-- ============================================================================
-- PART 3: ADD FK CONSTRAINTS FOR THE 8 NEW TABLES (non-organization relations)
-- ============================================================================
-- For each new table created in Part 1, add the foreign key constraints
-- declared in schema.prisma (other than the organizationId FK which is also
-- added here for completeness). All are wrapped in idempotent DO blocks so
-- they are no-ops if the table already exists with constraints (db push).
-- ============================================================================

-- 3.1 FeatureFlag -> Organization
DO $$ BEGIN ALTER TABLE "FeatureFlag" ADD CONSTRAINT "FeatureFlag_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $$;

-- 3.2 GuaranteeLetter -> Project, Organization
DO $$ BEGIN ALTER TABLE "GuaranteeLetter" ADD CONSTRAINT "GuaranteeLetter_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "GuaranteeLetter" ADD CONSTRAINT "GuaranteeLetter_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $$;

-- 3.3 InvoicePayment -> Invoice (CASCADE), Payment (CASCADE), User (SET NULL)
DO $$ BEGIN ALTER TABLE "InvoicePayment" ADD CONSTRAINT "InvoicePayment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "InvoicePayment" ADD CONSTRAINT "InvoicePayment_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "InvoicePayment" ADD CONSTRAINT "InvoicePayment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $$;

-- 3.4 ProgressClaim -> Project (CASCADE), Organization (CASCADE), User/certifiedBy (SET NULL)
DO $$ BEGIN ALTER TABLE "ProgressClaim" ADD CONSTRAINT "ProgressClaim_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "ProgressClaim" ADD CONSTRAINT "ProgressClaim_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "ProgressClaim" ADD CONSTRAINT "ProgressClaim_certifiedById_fkey" FOREIGN KEY ("certifiedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $$;

-- 3.5 PushSubscription -> User (CASCADE)
DO $$ BEGIN ALTER TABLE "PushSubscription" ADD CONSTRAINT "PushSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $$;

-- 3.6 Retainage -> Project (CASCADE), Invoice (SET NULL), Organization (CASCADE)
DO $$ BEGIN ALTER TABLE "Retainage" ADD CONSTRAINT "Retainage_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Retainage" ADD CONSTRAINT "Retainage_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Retainage" ADD CONSTRAINT "Retainage_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $$;

-- 3.7 Timesheet -> Employee (CASCADE), Project (SET NULL), User/approvedBy (SET NULL), Organization (CASCADE)
DO $$ BEGIN ALTER TABLE "Timesheet" ADD CONSTRAINT "Timesheet_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Timesheet" ADD CONSTRAINT "Timesheet_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Timesheet" ADD CONSTRAINT "Timesheet_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Timesheet" ADD CONSTRAINT "Timesheet_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $$;

-- 3.8 TimesheetEntry -> Timesheet (CASCADE), Project (SET NULL)
DO $$ BEGIN ALTER TABLE "TimesheetEntry" ADD CONSTRAINT "TimesheetEntry_timesheetId_fkey" FOREIGN KEY ("timesheetId") REFERENCES "Timesheet"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "TimesheetEntry" ADD CONSTRAINT "TimesheetEntry_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $$;


-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
-- Summary:
--   - 8 CREATE TABLE IF NOT EXISTS statements (FeatureFlag, GuaranteeLetter,
--     InvoicePayment, ProgressClaim, PushSubscription, Retainage, Timesheet,
--     TimesheetEntry) with all columns, primary keys, @@unique and @@index.
--   - 39 idempotent FK additions for organizationId columns added by
--     migration `20260518_add_organization_id` (ON DELETE CASCADE).
--   - 19 idempotent FK additions for the 8 new tables (relations to
--     Organization, Project, Invoice, Payment, User, Employee, Timesheet).
--   - All statements are pure PostgreSQL (double-quoted identifiers, no
--     backticks) and idempotent (safe to re-run on db-pushed databases).
-- ============================================================================
