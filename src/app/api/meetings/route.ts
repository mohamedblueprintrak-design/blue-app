import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { validateRequest, meetingCreateSchema } from '@/lib/api-validation';
import { requireVerifiedPermission, orgFilter, orgCreate } from '@/app/api/utils/auth';
import { Permission } from '@/lib/auth/types';
import { log } from '@/lib/logger';
import { z } from 'zod';
import { withRateLimit, rateLimitResponse } from '@/lib/rate-limit-middleware';
import { parsePaginationParams, buildPaginationMeta, calculateSkip, isPaginationRequested } from '../utils/pagination';

// Extended meeting schema with attendee and agenda support
const meetingCreateFullSchema = meetingCreateSchema.extend({
  attendeeIds: z.array(z.string().max(100)).optional().default([]),
  agendaItems: z.array(z.object({
    topic: z.string().max(300).optional().default(''),
    duration: z.coerce.number().min(1).max(480).optional().default(15),
  })).optional().default([]),
});

export async function GET(request: NextRequest) {
  const { allowed: _allowed, result: rlResult } = await withRateLimit(request, 'api');
  const rlBlocked = rateLimitResponse(rlResult);
  if (rlBlocked) return rlBlocked;

  try {
    const result = await requireVerifiedPermission(request, Permission.MEETING_READ);
    if ('error' in result) return result.error;
    const ctx = result.user;

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");

    const where: Record<string, unknown> = { deletedAt: null, ...orgFilter(ctx) };
    if (projectId) where.projectId = projectId;

    const usePagination = isPaginationRequested(searchParams);
    const { page, limit } = parsePaginationParams(searchParams);

    if (usePagination) {
      const [meetings, total] = await Promise.all([
        db.meeting.findMany({
          where,
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
          orderBy: { date: "desc" },
          skip: calculateSkip(page, limit),
          take: limit,
        }),
        db.meeting.count({ where }),
      ]);

      return NextResponse.json({ data: meetings, pagination: buildPaginationMeta(page, limit, total) });
    }

    const meetings = await db.meeting.findMany({
      where,
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
      orderBy: { date: "desc" },
    });

    return NextResponse.json(meetings);
  } catch (error) {
    log.error("Error fetching meetings:", error);
    return NextResponse.json({ error: "Failed to fetch meetings" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const { allowed: _allowed, result } = await withRateLimit(request, 'api');
  const blocked = rateLimitResponse(result);
  if (blocked) return blocked;

  try {
    const result = await requireVerifiedPermission(request, Permission.MEETING_CREATE);
    if ('error' in result) return result.error;
    const ctx = result.user;

    const body = await request.json();

    const validation = validateRequest(meetingCreateFullSchema, body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error, errors: validation.errors }, { status: 400 });
    }

    const {
      projectId,
      title,
      date,
      time,
      duration,
      location,
      type,
      notes,
      attendeeIds,
      agendaItems,
    } = validation.data;

    const meeting = await db.meeting.create({
      data: {
        projectId: projectId || null,
        title: title || "",
        date: new Date(date),
        time: time || "",
        duration: Number(duration) || 60,
        location: location || "",
        type: (type || "ONSITE"),
        notes: notes || "",
        ...orgCreate(ctx),
        createdById: ctx.userId,
        attendees: {
          create: (attendeeIds || []).map((userId: string) => ({
            userId,
            role: "ATTENDEE",
          })),
        },
        agenda: {
          create: (agendaItems || []).map((item: { topic: string; duration: number }) => ({
            topic: item.topic || "",
            duration: Number(item.duration) || 15,
          })),
        },
      },
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

    return NextResponse.json(meeting, { status: 201 });
  } catch (error) {
    log.error("Error creating meeting:", error);
    return NextResponse.json({ error: "Failed to create meeting" }, { status: 500 });
  }
}
