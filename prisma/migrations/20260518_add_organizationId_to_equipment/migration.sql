-- AlterTable: Add organizationId to Equipment for multi-tenant isolation
ALTER TABLE "Equipment" ADD COLUMN "organizationId" TEXT;

-- CreateIndex: Index for org-scoped queries on Equipment
CREATE INDEX "Equipment_organizationId_idx" ON "Equipment"("organizationId");

-- AddForeignKey: Link Equipment to Organization
ALTER TABLE "Equipment" ADD CONSTRAINT "Equipment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
