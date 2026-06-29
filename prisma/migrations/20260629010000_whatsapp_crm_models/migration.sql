-- ============================================================================
-- Migration: WhatsApp Templates/Messages + CRM Opportunities/Activities
-- Date: 2026-06-29
-- ============================================================================

-- WhatsAppTemplate
CREATE TABLE IF NOT EXISTS "WhatsAppTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'ar',
    "category" TEXT NOT NULL DEFAULT 'MARKETING',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "headerType" TEXT,
    "headerText" TEXT,
    "bodyText" TEXT NOT NULL,
    "footerText" TEXT,
    "buttonType" TEXT,
    "buttons" TEXT,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "WhatsAppTemplate_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "WhatsAppTemplate_organizationId_name_key" ON "WhatsAppTemplate"("organizationId", "name");
CREATE INDEX IF NOT EXISTS "WhatsAppTemplate_organizationId_idx" ON "WhatsAppTemplate"("organizationId");
CREATE INDEX IF NOT EXISTS "WhatsAppTemplate_status_idx" ON "WhatsAppTemplate"("status");
DO $$ BEGIN
    ALTER TABLE "WhatsAppTemplate" ADD CONSTRAINT "WhatsAppTemplate_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- WhatsAppMessage
CREATE TABLE IF NOT EXISTS "WhatsAppMessage" (
    "id" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "from" TEXT,
    "messageText" TEXT,
    "templateId" TEXT,
    "templateParams" TEXT,
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "direction" TEXT NOT NULL DEFAULT 'OUTBOUND',
    "errorMessage" TEXT,
    "invoiceId" TEXT,
    "clientId" TEXT,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "WhatsAppMessage_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "WhatsAppMessage_organizationId_idx" ON "WhatsAppMessage"("organizationId");
CREATE INDEX IF NOT EXISTS "WhatsAppMessage_status_idx" ON "WhatsAppMessage"("status");
CREATE INDEX IF NOT EXISTS "WhatsAppMessage_to_idx" ON "WhatsAppMessage"("to");
CREATE INDEX IF NOT EXISTS "WhatsAppMessage_invoiceId_idx" ON "WhatsAppMessage"("invoiceId");
CREATE INDEX IF NOT EXISTS "WhatsAppMessage_createdAt_idx" ON "WhatsAppMessage"("createdAt");
DO $$ BEGIN
    ALTER TABLE "WhatsAppMessage" ADD CONSTRAINT "WhatsAppMessage_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
    ALTER TABLE "WhatsAppMessage" ADD CONSTRAINT "WhatsAppMessage_templateId_fkey"
    FOREIGN KEY ("templateId") REFERENCES "WhatsAppTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Opportunity
CREATE TABLE IF NOT EXISTS "Opportunity" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "leadId" TEXT,
    "clientId" TEXT,
    "projectId" TEXT,
    "stage" TEXT NOT NULL DEFAULT 'QUALIFICATION',
    "probability" INTEGER NOT NULL DEFAULT 10,
    "estimatedValue" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "expectedCloseDate" TIMESTAMP(3),
    "description" TEXT,
    "lostReason" TEXT,
    "organizationId" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Opportunity_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "Opportunity_organizationId_idx" ON "Opportunity"("organizationId");
CREATE INDEX IF NOT EXISTS "Opportunity_stage_idx" ON "Opportunity"("stage");
CREATE INDEX IF NOT EXISTS "Opportunity_leadId_idx" ON "Opportunity"("leadId");
CREATE INDEX IF NOT EXISTS "Opportunity_deletedAt_idx" ON "Opportunity"("deletedAt");
DO $$ BEGIN
    ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
    ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_leadId_fkey"
    FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CRMActivity
CREATE TABLE IF NOT EXISTS "CRMActivity" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "dueDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "leadId" TEXT,
    "opportunityId" TEXT,
    "clientId" TEXT,
    "assignedToId" TEXT,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CRMActivity_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "CRMActivity_organizationId_idx" ON "CRMActivity"("organizationId");
CREATE INDEX IF NOT EXISTS "CRMActivity_leadId_idx" ON "CRMActivity"("leadId");
CREATE INDEX IF NOT EXISTS "CRMActivity_opportunityId_idx" ON "CRMActivity"("opportunityId");
CREATE INDEX IF NOT EXISTS "CRMActivity_status_idx" ON "CRMActivity"("status");
CREATE INDEX IF NOT EXISTS "CRMActivity_dueDate_idx" ON "CRMActivity"("dueDate");
DO $$ BEGIN
    ALTER TABLE "CRMActivity" ADD CONSTRAINT "CRMActivity_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
    ALTER TABLE "CRMActivity" ADD CONSTRAINT "CRMActivity_leadId_fkey"
    FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
    ALTER TABLE "CRMActivity" ADD CONSTRAINT "CRMActivity_opportunityId_fkey"
    FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
    ALTER TABLE "CRMActivity" ADD CONSTRAINT "CRMActivity_assignedToId_fkey"
    FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
