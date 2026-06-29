-- ============================================================================
-- Migration: Add BankAccount and BankTransaction models for bank reconciliation
-- Date: 2026-06-29
-- ============================================================================

-- BankAccount table
CREATE TABLE IF NOT EXISTS "BankAccount" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameAr" TEXT,
    "bankName" TEXT NOT NULL,
    "iban" TEXT,
    "accountNumber" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'AED',
    "accountId" TEXT,
    "organizationId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "openingBalance" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "currentBalance" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BankAccount_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "BankAccount_iban_key" ON "BankAccount"("iban");
CREATE INDEX IF NOT EXISTS "BankAccount_organizationId_idx" ON "BankAccount"("organizationId");
CREATE INDEX IF NOT EXISTS "BankAccount_isActive_idx" ON "BankAccount"("isActive");

DO $$ BEGIN
    ALTER TABLE "BankAccount" ADD CONSTRAINT "BankAccount_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "BankAccount" ADD CONSTRAINT "BankAccount_accountId_fkey"
    FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- BankTransaction table
CREATE TABLE IF NOT EXISTS "BankTransaction" (
    "id" TEXT NOT NULL,
    "bankAccountId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "description" TEXT NOT NULL,
    "reference" TEXT,
    "amount" DECIMAL(65,30) NOT NULL,
    "balanceAfter" DECIMAL(65,30) NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'OTHER',
    "isReconciled" BOOLEAN NOT NULL DEFAULT false,
    "reconciledAt" TIMESTAMP(3),
    "journalEntryId" TEXT,
    "matchType" TEXT,
    "matchDetails" TEXT,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BankTransaction_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "BankTransaction_bankAccountId_idx" ON "BankTransaction"("bankAccountId");
CREATE INDEX IF NOT EXISTS "BankTransaction_organizationId_idx" ON "BankTransaction"("organizationId");
CREATE INDEX IF NOT EXISTS "BankTransaction_date_idx" ON "BankTransaction"("date");
CREATE INDEX IF NOT EXISTS "BankTransaction_isReconciled_idx" ON "BankTransaction"("isReconciled");

DO $$ BEGIN
    ALTER TABLE "BankTransaction" ADD CONSTRAINT "BankTransaction_bankAccountId_fkey"
    FOREIGN KEY ("bankAccountId") REFERENCES "BankAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "BankTransaction" ADD CONSTRAINT "BankTransaction_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "BankTransaction" ADD CONSTRAINT "BankTransaction_journalEntryId_fkey"
    FOREIGN KEY ("journalEntryId") REFERENCES "JournalEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
