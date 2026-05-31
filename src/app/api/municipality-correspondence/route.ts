/**
 * Municipality Correspondence API
 * المراسلات البلدية - واجهة برمجة التطبيقات
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireVerifiedPermission, orgFilter, orgCreate } from '@/app/api/utils/auth';
import { Permission } from '@/lib/auth/types';
import { log } from '@/lib/logger';
import { z } from 'zod';
import { Municipality as MunicipalityEnum } from '@prisma/client';

const VALID_TYPES = ["SUBMISSION", "RESPONSE", "REJECTION", "APPROVAL", "INQUIRY", "AMENDMENT"];
const VALID_STATUSES = ["PENDING", "UNDER_REVIEW", "APPROVED", "REJECTED", "AMENDMENT_REQUIRED"];

// Zod schema for municipality correspondence creation
const municipalityCorrespondenceCreateSchema = z.object({
  projectId: z.string().min(1, 'Project ID is required'),
  referenceNumber: z.string().max(100).optional().default(''),
  municipality: z.string().max(100).optional().default(''),
  correspondenceType: z.enum(['SUBMISSION', 'RESPONSE', 'REJECTION', 'APPROVAL', 'INQUIRY', 'AMENDMENT']).default('SUBMISSION'),
  subject: z.string().max(500).optional().default(''),
  content: z.string().max(10000).optional().default(''),
  submissionDate: z.string().optional().default(''),
  responseDate: z.string().optional().default(''),
  status: z.enum(['PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'AMENDMENT_REQUIRED']).default('PENDING'),
  notes: z.string().max(2000).optional().default(''),
  responseNotes: z.string().max(2000).optional().default(''),
});

// GET - List municipality correspondence records
export async function GET(request: NextRequest) {
  try {
    const result = await requireVerifiedPermission(request, Permission.PROJECT_READ);
    if ('error' in result) return result.error;
    const ctx = result.user;

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");
    const status = searchParams.get("status");
    const type = searchParams.get("type");
    const municipality = searchParams.get("municipality");

    // MunicipalityCorrespondence has direct organizationId
    const where: Record<string, unknown> = { ...orgFilter(ctx) };
    if (projectId) where.projectId = projectId;
    if (status && VALID_STATUSES.includes(status)) where.status = status;
    if (type && VALID_TYPES.includes(type)) where.correspondenceType = type;
    if (municipality) where.municipality = municipality;

    const records = await db.municipalityCorrespondence.findMany({
      where,
      orderBy: { submissionDate: "desc" },
    });

    return NextResponse.json({ success: true, data: records });
  } catch (error) {
    log.error("Error fetching municipality correspondence:", error);
    return NextResponse.json(
      { success: false, error: { message: "Failed to fetch records" } },
      { status: 500 }
    );
  }
}

// POST - Create new correspondence record
export async function POST(request: NextRequest) {
  try {
    const result = await requireVerifiedPermission(request, Permission.PROJECT_CREATE);
    if ('error' in result) return result.error;
    const ctx = result.user;

    const rawBody = await request.json();

    // Zod validation for municipality correspondence creation
    const validation = municipalityCorrespondenceCreateSchema.safeParse(rawBody);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: { message: validation.error.issues[0].message } },
        { status: 400 }
      );
    }
    const { projectId, referenceNumber, municipality, correspondenceType, subject, content, submissionDate, responseDate, status, notes, responseNotes } = validation.data;

    const record = await db.municipalityCorrespondence.create({
      data: {
        projectId,
        referenceNumber: referenceNumber || "",
        municipality: (municipality || undefined) as MunicipalityEnum | undefined,
        correspondenceType: correspondenceType || "SUBMISSION",
        subject: subject || "",
        content: content || "",
        submissionDate: submissionDate ? new Date(submissionDate) : new Date(),
        responseDate: responseDate ? new Date(responseDate) : null,
        status: status && VALID_STATUSES.includes(status) ? status : "PENDING",
        notes: notes || "",
        responseNotes: responseNotes || "",
        ...orgCreate(ctx),
      },
    });

    return NextResponse.json({ success: true, data: record }, { status: 201 });
  } catch (error) {
    log.error("Error creating municipality correspondence:", error);
    return NextResponse.json(
      { success: false, error: { message: "Failed to create record" } },
      { status: 500 }
    );
  }
}

// PUT - Update correspondence record
export async function PUT(request: NextRequest) {
  try {
    const result = await requireVerifiedPermission(request, Permission.PROJECT_UPDATE);
    if ('error' in result) return result.error;
    const ctx = result.user;

    const body = await request.json();
    const { id, ...updateFields } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: { message: "id is required" } },
        { status: 400 }
      );
    }

    // Verify org ownership before update
    const existing = await db.municipalityCorrespondence.findFirst({ where: { id, ...orgFilter(ctx) } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: { message: "Record not found" } },
        { status: 404 }
      );
    }

    const updateData: Record<string, unknown> = {};
    if (updateFields.referenceNumber !== undefined) updateData.referenceNumber = updateFields.referenceNumber;
    if (updateFields.municipality !== undefined) updateData.municipality = updateFields.municipality;
    if (updateFields.correspondenceType !== undefined) {
      if (!VALID_TYPES.includes(updateFields.correspondenceType)) {
        return NextResponse.json({ success: false, error: { message: "Invalid correspondence type" } }, { status: 400 });
      }
      updateData.correspondenceType = updateFields.correspondenceType;
    }
    if (updateFields.subject !== undefined) updateData.subject = updateFields.subject;
    if (updateFields.content !== undefined) updateData.content = updateFields.content;
    if (updateFields.submissionDate !== undefined) updateData.submissionDate = updateFields.submissionDate ? new Date(updateFields.submissionDate) : null;
    if (updateFields.responseDate !== undefined) updateData.responseDate = updateFields.responseDate ? new Date(updateFields.responseDate) : null;
    if (updateFields.status !== undefined) {
      if (!VALID_STATUSES.includes(updateFields.status)) {
        return NextResponse.json({ success: false, error: { message: "Invalid status" } }, { status: 400 });
      }
      updateData.status = updateFields.status;
    }
    if (updateFields.notes !== undefined) updateData.notes = updateFields.notes;
    if (updateFields.responseNotes !== undefined) updateData.responseNotes = updateFields.responseNotes;

    const updatedRecord = await db.municipalityCorrespondence.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ success: true, data: updatedRecord });
  } catch (error) {
    log.error("Error updating municipality correspondence:", error);
    return NextResponse.json(
      { success: false, error: { message: "Failed to update record" } },
      { status: 500 }
    );
  }
}

// DELETE - Delete correspondence record
export async function DELETE(request: NextRequest) {
  try {
    const result = await requireVerifiedPermission(request, Permission.PROJECT_UPDATE);
    if ('error' in result) return result.error;
    const ctx = result.user;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: { message: "id is required" } },
        { status: 400 }
      );
    }

    // Verify org ownership before delete
    const existing = await db.municipalityCorrespondence.findFirst({ where: { id, ...orgFilter(ctx) } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: { message: "Record not found" } },
        { status: 404 }
      );
    }

    await db.municipalityCorrespondence.delete({ where: { id } });

    return NextResponse.json({ success: true, message: "Deleted successfully" });
  } catch (error) {
    log.error("Error deleting municipality correspondence:", error);
    return NextResponse.json(
      { success: false, error: { message: "Failed to delete record" } },
      { status: 500 }
    );
  }
}
