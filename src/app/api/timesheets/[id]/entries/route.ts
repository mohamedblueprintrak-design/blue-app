import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireVerifiedPermission, orgFilter } from "@/app/api/utils/auth";
import { Permission } from "@/lib/auth/types";
import { log } from "@/lib/logger";

// ============================================
// Validation Schemas
// ============================================

const entryCreateSchema = z.object({
  date: z.string(),
  hours: z.number().min(0).max(24),
  taskType: z.enum(["REGULAR", "OVERTIME", "HOLIDAY"]).optional().default("REGULAR"),
  description: z.string().optional().default(""),
  projectId: z.string().optional().nullable(),
});

const entryUpdateSchema = z.object({
  id: z.string().optional(),
  date: z.string().optional(),
  hours: z.number().min(0).max(24).optional(),
  taskType: z.enum(["REGULAR", "OVERTIME", "HOLIDAY"]).optional(),
  description: z.string().optional(),
  projectId: z.string().optional().nullable(),
});

const batchEntriesSchema = z.object({
  entries: z.array(
    z.union([
      entryCreateSchema,
      entryCreateSchema.extend({ id: z.string() }),
    ])
  ),
});

// ============================================
// POST /api/timesheets/[id]/entries - Add/update entries
// ============================================
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const rbac = await requireVerifiedPermission(request, Permission.EMPLOYEE_UPDATE);
    if ("error" in rbac) return rbac.error;
    const ctx = rbac.user;
    const { id } = await params;

    const timesheet = await db.timesheet.findFirst({
      where: { id, deletedAt: null, employee: { ...orgFilter(ctx) } },
    });

    if (!timesheet) {
      return NextResponse.json({ error: "Timesheet not found" }, { status: 404 });
    }

    if (timesheet.status !== "DRAFT" && timesheet.status !== "REJECTED") {
      return NextResponse.json(
        { error: "Can only add entries to draft or rejected timesheets" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validation = batchEntriesSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", errors: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { entries } = validation.data;

    // Create entries
    const createdEntries = await db.$transaction(
      entries.map((entry) =>
        db.timesheetEntry.create({
          data: {
            timesheetId: id,
            date: new Date(entry.date),
            hours: entry.hours,
            taskType: entry.taskType || "regular",
            description: entry.description || "",
            projectId: entry.projectId || null,
          },
        })
      )
    );

    // Recalculate total hours
    const allEntries = await db.timesheetEntry.findMany({
      where: { timesheetId: id },
    });
    const totalHours = allEntries.reduce((sum, e) => sum + Number(e.hours), 0);

    await db.timesheet.update({
      where: { id },
      data: { totalHours },
    });

    return NextResponse.json({ entries: createdEntries, totalHours }, { status: 201 });
  } catch (error) {
    log.error("POST /api/timesheets/[id]/entries error:", error);
    return NextResponse.json({ error: "Failed to add entries" }, { status: 500 });
  }
}

// ============================================
// PUT /api/timesheets/[id]/entries - Update an entry
// ============================================
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const rbac = await requireVerifiedPermission(request, Permission.EMPLOYEE_UPDATE);
    if ("error" in rbac) return rbac.error;
    const ctx = rbac.user;
    const { id } = await params;

    const timesheet = await db.timesheet.findFirst({
      where: { id, deletedAt: null, employee: { ...orgFilter(ctx) } },
    });

    if (!timesheet) {
      return NextResponse.json({ error: "Timesheet not found" }, { status: 404 });
    }

    if (timesheet.status !== "DRAFT" && timesheet.status !== "REJECTED") {
      return NextResponse.json(
        { error: "Can only update entries in draft or rejected timesheets" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validation = entryUpdateSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", errors: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = validation.data;

    if (!data.id) {
      return NextResponse.json({ error: "Entry ID is required for updates" }, { status: 400 });
    }

    const existingEntry = await db.timesheetEntry.findFirst({
      where: { id: data.id, timesheetId: id },
    });

    if (!existingEntry) {
      return NextResponse.json({ error: "Entry not found" }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    if (data.date !== undefined) updateData.date = new Date(data.date);
    if (data.hours !== undefined) updateData.hours = data.hours;
    if (data.taskType !== undefined) updateData.taskType = data.taskType;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.projectId !== undefined) updateData.projectId = data.projectId || null;

    const entry = await db.timesheetEntry.update({
      where: { id: data.id },
      data: updateData,
    });

    // Recalculate total hours
    const allEntries = await db.timesheetEntry.findMany({
      where: { timesheetId: id },
    });
    const totalHours = allEntries.reduce((sum, e) => sum + Number(e.hours), 0);

    await db.timesheet.update({
      where: { id },
      data: { totalHours },
    });

    return NextResponse.json({ entry, totalHours });
  } catch (error) {
    log.error("PUT /api/timesheets/[id]/entries error:", error);
    return NextResponse.json({ error: "Failed to update entry" }, { status: 500 });
  }
}

// ============================================
// DELETE /api/timesheets/[id]/entries - Delete an entry
// ============================================
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const rbac = await requireVerifiedPermission(request, Permission.EMPLOYEE_UPDATE);
    if ("error" in rbac) return rbac.error;
    const ctx = rbac.user;
    const { id } = await params;

    const timesheet = await db.timesheet.findFirst({
      where: { id, deletedAt: null, employee: { ...orgFilter(ctx) } },
    });

    if (!timesheet) {
      return NextResponse.json({ error: "Timesheet not found" }, { status: 404 });
    }

    if (timesheet.status !== "DRAFT" && timesheet.status !== "REJECTED") {
      return NextResponse.json(
        { error: "Can only delete entries from draft or rejected timesheets" },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const entryId = searchParams.get("entryId");

    if (!entryId) {
      return NextResponse.json({ error: "entryId query parameter is required" }, { status: 400 });
    }

    const existingEntry = await db.timesheetEntry.findFirst({
      where: { id: entryId, timesheetId: id },
    });

    if (!existingEntry) {
      return NextResponse.json({ error: "Entry not found" }, { status: 404 });
    }

    await db.timesheetEntry.delete({
      where: { id: entryId },
    });

    // Recalculate total hours
    const allEntries = await db.timesheetEntry.findMany({
      where: { timesheetId: id },
    });
    const totalHours = allEntries.reduce((sum, e) => sum + Number(e.hours), 0);

    await db.timesheet.update({
      where: { id },
      data: { totalHours },
    });

    return NextResponse.json({ success: true, totalHours });
  } catch (error) {
    log.error("DELETE /api/timesheets/[id]/entries error:", error);
    return NextResponse.json({ error: "Failed to delete entry" }, { status: 500 });
  }
}
