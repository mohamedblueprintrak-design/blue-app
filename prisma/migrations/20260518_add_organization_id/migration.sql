-- ============================================
-- Migration: Add organizationId to models missing multi-tenant isolation
-- Date: 2026-05-18
-- Description: Fixes critical data isolation vulnerability by adding
--   organizationId to ~31 business models that were missing it.
--   Also removes legacy `serviceType` from Client and redundant
--   `isGovernmental` from Task.
-- ============================================

-- ==================== ADD organizationId COLUMNS ====================

-- Company Settings (org-level config)
ALTER TABLE `CompanySettings` ADD COLUMN `organizationId` TEXT;

-- Municipality Correspondence
ALTER TABLE `MunicipalityCorrespondence` ADD COLUMN `organizationId` TEXT;

-- Project Stages
ALTER TABLE `ProjectStage` ADD COLUMN `organizationId` TEXT;

-- Municipal Rejections
ALTER TABLE `MunicipalRejection` ADD COLUMN `organizationId` TEXT;

-- Government Approvals
ALTER TABLE `GovApproval` ADD COLUMN `organizationId` TEXT;

-- Client Interactions
ALTER TABLE `ClientInteraction` ADD COLUMN `organizationId` TEXT;

-- Site Diaries
ALTER TABLE `SiteDiary` ADD COLUMN `organizationId` TEXT;

-- RFIs
ALTER TABLE `RFI` ADD COLUMN `organizationId` TEXT;

-- Submittals
ALTER TABLE `Submittal` ADD COLUMN `organizationId` TEXT;

-- Change Orders
ALTER TABLE `ChangeOrder` ADD COLUMN `organizationId` TEXT;

-- Transmittals
ALTER TABLE `Transmittal` ADD COLUMN `organizationId` TEXT;

-- BOQ Items
ALTER TABLE `BOQItem` ADD COLUMN `organizationId` TEXT;

-- Employees
ALTER TABLE `Employee` ADD COLUMN `organizationId` TEXT;

-- Attendance
ALTER TABLE `Attendance` ADD COLUMN `organizationId` TEXT;

-- Leaves
ALTER TABLE `Leave` ADD COLUMN `organizationId` TEXT;

-- Suppliers
ALTER TABLE `Supplier` ADD COLUMN `organizationId` TEXT;

-- Inventory Items
ALTER TABLE `InventoryItem` ADD COLUMN `organizationId` TEXT;

-- Quote Requests
ALTER TABLE `QuoteRequest` ADD COLUMN `organizationId` TEXT;

-- Knowledge Articles
ALTER TABLE `KnowledgeArticle` ADD COLUMN `organizationId` TEXT;

-- Notifications
ALTER TABLE `Notification` ADD COLUMN `organizationId` TEXT;

-- Activity Logs
ALTER TABLE `ActivityLog` ADD COLUMN `organizationId` TEXT;

-- Approvals
ALTER TABLE `Approval` ADD COLUMN `organizationId` TEXT;

-- Design Phases
ALTER TABLE `DesignPhase` ADD COLUMN `organizationId` TEXT;

-- Supervision Checklists
ALTER TABLE `SupervisionChecklist` ADD COLUMN `organizationId` TEXT;

-- Violations
ALTER TABLE `Violation` ADD COLUMN `organizationId` TEXT;

-- Commissions
ALTER TABLE `Commission` ADD COLUMN `organizationId` TEXT;

-- Referrals
ALTER TABLE `Referral` ADD COLUMN `organizationId` TEXT;

-- Marketing Campaigns
ALTER TABLE `MarketingCampaign` ADD COLUMN `organizationId` TEXT;

-- Workflow Templates
ALTER TABLE `WorkflowTemplate` ADD COLUMN `organizationId` TEXT;

-- Security Audit Logs
ALTER TABLE `SecurityAuditLog` ADD COLUMN `organizationId` TEXT;

-- Contractor Evaluations
ALTER TABLE `ContractorEvaluation` ADD COLUMN `organizationId` TEXT;

-- ==================== ADD organizationId TO CRITICAL CHILD MODELS ====================
-- These models are queried independently and need org isolation to prevent cross-tenant data leakage

-- Project Comments
ALTER TABLE `ProjectComment` ADD COLUMN `organizationId` TEXT;

-- Project Assignments
ALTER TABLE `ProjectAssignment` ADD COLUMN `organizationId` TEXT;

-- Task Comments
ALTER TABLE `TaskComment` ADD COLUMN `organizationId` TEXT;

-- SLA Breaches
ALTER TABLE `SLABreach` ADD COLUMN `organizationId` TEXT;

-- Notification Settings
ALTER TABLE `NotificationSettings` ADD COLUMN `organizationId` TEXT;

-- AI Chat Conversations
ALTER TABLE `AIChatConversation` ADD COLUMN `organizationId` TEXT;

-- AI Chat Messages
ALTER TABLE `AIChatMessage` ADD COLUMN `organizationId` TEXT;

-- Project Workflows
ALTER TABLE `ProjectWorkflow` ADD COLUMN `organizationId` TEXT;

-- ==================== FIX INVOICE UNIQUE CONSTRAINT ====================
-- Invoice numbers should be unique per-organization, not globally

-- Drop the old global unique constraint
DROP INDEX IF EXISTS `Invoice_number_key`;
-- Create the new org-scoped unique constraint
CREATE UNIQUE INDEX `invoice_number_org_unique` ON `Invoice`(`number`, `organizationId`);

-- ==================== FIX InvoicePayment FIELD NAMING ====================
-- Rename `createdBy` to `createdById` for consistency with Prisma naming conventions

ALTER TABLE `InvoicePayment` RENAME COLUMN `createdBy` TO `createdById`;

-- ==================== CREATE INDEXES ====================

CREATE INDEX `CompanySettings_organizationId_idx` ON `CompanySettings`(`organizationId`);
CREATE INDEX `MunicipalityCorrespondence_organizationId_idx` ON `MunicipalityCorrespondence`(`organizationId`);
CREATE INDEX `ProjectStage_organizationId_idx` ON `ProjectStage`(`organizationId`);
CREATE INDEX `MunicipalRejection_organizationId_idx` ON `MunicipalRejection`(`organizationId`);
CREATE INDEX `GovApproval_organizationId_idx` ON `GovApproval`(`organizationId`);
CREATE INDEX `ClientInteraction_organizationId_idx` ON `ClientInteraction`(`organizationId`);
CREATE INDEX `SiteDiary_organizationId_idx` ON `SiteDiary`(`organizationId`);
CREATE INDEX `RFI_organizationId_idx` ON `RFI`(`organizationId`);
CREATE INDEX `Submittal_organizationId_idx` ON `Submittal`(`organizationId`);
CREATE INDEX `ChangeOrder_organizationId_idx` ON `ChangeOrder`(`organizationId`);
CREATE INDEX `Transmittal_organizationId_idx` ON `Transmittal`(`organizationId`);
CREATE INDEX `BOQItem_organizationId_idx` ON `BOQItem`(`organizationId`);
CREATE INDEX `Employee_organizationId_idx` ON `Employee`(`organizationId`);
CREATE INDEX `Attendance_organizationId_idx` ON `Attendance`(`organizationId`);
CREATE INDEX `Leave_organizationId_idx` ON `Leave`(`organizationId`);
CREATE INDEX `Supplier_organizationId_idx` ON `Supplier`(`organizationId`);
CREATE INDEX `InventoryItem_organizationId_idx` ON `InventoryItem`(`organizationId`);
CREATE INDEX `QuoteRequest_organizationId_idx` ON `QuoteRequest`(`organizationId`);
CREATE INDEX `KnowledgeArticle_organizationId_idx` ON `KnowledgeArticle`(`organizationId`);
CREATE INDEX `Notification_organizationId_idx` ON `Notification`(`organizationId`);
CREATE INDEX `ActivityLog_organizationId_idx` ON `ActivityLog`(`organizationId`);
CREATE INDEX `Approval_organizationId_idx` ON `Approval`(`organizationId`);
CREATE INDEX `DesignPhase_organizationId_idx` ON `DesignPhase`(`organizationId`);
CREATE INDEX `SupervisionChecklist_organizationId_idx` ON `SupervisionChecklist`(`organizationId`);
CREATE INDEX `Violation_organizationId_idx` ON `Violation`(`organizationId`);
CREATE INDEX `Commission_organizationId_idx` ON `Commission`(`organizationId`);
CREATE INDEX `Referral_organizationId_idx` ON `Referral`(`organizationId`);
CREATE INDEX `MarketingCampaign_organizationId_idx` ON `MarketingCampaign`(`organizationId`);
CREATE INDEX `WorkflowTemplate_organizationId_idx` ON `WorkflowTemplate`(`organizationId`);
CREATE INDEX `SecurityAuditLog_organizationId_idx` ON `SecurityAuditLog`(`organizationId`);
CREATE INDEX `ContractorEvaluation_organizationId_idx` ON `ContractorEvaluation`(`organizationId`);
CREATE INDEX `ProjectComment_organizationId_idx` ON `ProjectComment`(`organizationId`);
CREATE INDEX `ProjectAssignment_organizationId_idx` ON `ProjectAssignment`(`organizationId`);
CREATE INDEX `TaskComment_organizationId_idx` ON `TaskComment`(`organizationId`);
CREATE INDEX `SLABreach_organizationId_idx` ON `SLABreach`(`organizationId`);
CREATE INDEX `NotificationSettings_organizationId_idx` ON `NotificationSettings`(`organizationId`);
CREATE INDEX `AIChatConversation_organizationId_idx` ON `AIChatConversation`(`organizationId`);
CREATE INDEX `AIChatMessage_organizationId_idx` ON `AIChatMessage`(`organizationId`);
CREATE INDEX `ProjectWorkflow_organizationId_idx` ON `ProjectWorkflow`(`organizationId`);

-- ==================== ADD FOREIGN KEY CONSTRAINTS ====================
-- Note: SQLite doesn't enforce FK constraints by default unless
-- PRAGMA foreign_keys = ON is set. These ALTER TABLE statements
-- add the columns; Prisma handles FK enforcement at the application level.

-- ==================== DROP LEGACY/REDUNDANT FIELDS ====================

-- Remove legacy `serviceType` from Client (was marked as legacy: purpose of visit)
ALTER TABLE `Client` DROP COLUMN `serviceType`;

-- Remove redundant `isGovernmental` from Task (redundant with taskType: GOVERNMENTAL enum)
ALTER TABLE `Task` DROP COLUMN `isGovernmental`;
