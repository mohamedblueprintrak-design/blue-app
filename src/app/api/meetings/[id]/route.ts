import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { requireVerifiedPermission, orgFilterNested } from '@/app/api/utils/auth';
import { Permission } from '@/lib/auth/types';
import { validateRequest, meetingUpdateSchema, validateIdParam } from '@/lib/api-validation';
import { log } from '@/lib/logger';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const result = await requireVerifiedPermission(request, Permission.MEETING_READ);
    if ('error' in result) return result.error;
    const ctx = result.user;

    const { id: rawId } = await params;
    const idResult = validateIdParam(rawId);
    if (!idResult.success) return idResult.response;
    const id = idResult.id;
    const orgWhere = orgFilterNested(ctx, 'project');
    const meeting = await db.meeting.findFirst({
      where: { id, deletedAt: null, ...orgWhere },
      include: {
        project: {
          select: { id: true, name: true, nameEn: true, number: true },
        },
        attendees: {
          include: {
            user: {
              select: { id: true, name: true, email: true, avatar: true },
            },
          },
        },
        agenda: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!meeting) {
      return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
    }

    return NextResponse.json(meeting);
  } catch (error) {
    log.error("Error fetching meeting:", error);
    return NextResponse.json({ error: "Failed to fetch meeting" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const result = await requireVerifiedPermission(request, Permission.MEETING_UPDATE);
    if ('error' in result) return result.error;
    const ctx = result.user;

    const { id: rawId } = await params;
    const idResult = validateIdParam(rawId);
    if (!idResult.success) return idResult.response;
    const id = idResult.id;
    const body = await request.json();

    // Zod validation for meeting update fields
    const validation = validateRequest(meetingUpdateSchema, body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error, errors: validation.errors }, { status: 400 });
    }

    // Verify org access
    const orgWhere = orgFilterNested(ctx, 'project');
    const existing = await db.meeting.findFirst({ where: { id, ...orgWhere } });
    if (!existing) {
      return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
    }

    const validatedData = validation.data;

    const updateData: Record<string, unknown> = {};
    if (validatedData.title !== undefined) updateData.title = validatedData.title;
    if (validatedData.date !== undefined) updateData.date = new Date(validatedData.date);
    if (validatedData.time !== undefined) updateData.time = validatedData.time;
    if (validatedData.duration !== undefined) updateData.duration = validatedData.duration;
    if (validatedData.location !== undefined) updateData.location = validatedData.location;
    if (validatedData.type !== undefined) updateData.type = validatedData.type;
    if (validatedData.notes !== undefined) updateData.notes = validatedData.notes;
    if (validatedData.projectId !== undefined) updateData.projectId = validatedData.projectId || null;

    // Handle attendee updates
    if (validatedData.attendeeIds !== undefined) {
      await db.meetingAttendee.deleteMany({ where: { meetingId: id } });
      updateData.attendees = {
        create: validatedData.attendeeIds.map((userId: string) => ({
          userId,
          role: "ATTENDEE",
        })),
      };
    }

    // Handle agenda updates
    if (validatedData.agendaItems !== undefined) {
      await db.meetingAgenda.deleteMany({ where: { meetingId: id } });
      updateData.agenda = {
        create: validatedData.agendaItems.map((item: { topic: string; duration: number }) => ({
          topic: item.topic || "",
          duration: Number(item.duration) || 15,
        })),
      };
    }

    const meeting = await db.meeting.update({
      where: { id },
      data: updateData,
      include: {
        project: {
          select: { id: true, name: true, nameEn: true, number: true },
        },
        attendees: {
          include: {
            user: {
              select: { id: true, name: true, email: true, avatar: true },
            },
          },
        },
        agenda: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    return NextResponse.json(meeting);
  } catch (error) {
    log.error("Error updating meeting:", error);
    return NextResponse.json({ error: "Failed to update meeting" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const result = await requireVerifiedPermission(request, Permission.MEETING_DELETE);
    if ('error' in result) return result.error;
    const ctx = result.user;

    const { id: rawId } = await params;
    const idResult = validateIdParam(rawId);
    if (!idResult.success) return idResult.response;
    const id = idResult.id;
    const orgWhere = orgFilterNested(ctx, 'project');
    const existing = await db.meeting.findFirst({ where: { id, ...orgWhere } });
    if (!existing) {
      return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
    }
    await db.meeting.update({ where: { id }, data: { deletedAt: new Date() } });
    return NextResponse.json({ success: true });
  } catch (error) {
    log.error("Error deleting meeting:", error);
    return NextResponse.json({ error: "Failed to delete meeting" }, { status: 500 });
  }
}
