/**
 * Gantt Chart API
 * Uses existing Task and SchedulePhase models
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { orgFilter, orgCreate, requireVerifiedPermission } from '../utils/auth';
import { log } from '@/lib/logger';
import { Permission } from '@/lib/auth/types';
import { z } from 'zod';

// Zod schemas for Gantt chart task/phase operations
const ganttTaskCreateSchema = z.object({
  title: z.string().min(1, 'Title is required').max(300),
  description: z.string().max(5000).optional().default(''),
  projectId: z.string().max(100).optional().default(''),
  priority: z.enum(['URGENT', 'HIGH', 'MEDIUM', 'LOW', 'NORMAL']).default('NORMAL'),
  status: z.string().max(50).default('TODO'),
  startDate: z.string().optional().default(''),
  endDate: z.string().optional().default(''),
  dueDate: z.string().optional().default(''),
  progress: z.coerce.number().min(0).max(100).optional().default(0),
  taskType: z.enum(['STANDARD', 'GOVERNMENTAL', 'MANDATORY', 'CLIENT', 'INTERNAL']).optional().default('STANDARD'),
  isGovernmental: z.boolean().optional().default(false),
});

const ganttTaskUpdateSchema = z.object({
  id: z.string().cuid('Invalid ID'),
  title: z.string().min(1).max(300).optional(),
  description: z.string().max(5000).optional(),
  priority: z.enum(['URGENT', 'HIGH', 'MEDIUM', 'LOW', 'NORMAL']).optional(),
  status: z.string().max(50).optional(),
  progress: z.coerce.number().min(0).max(100).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  dueDate: z.string().optional(),
  taskType: z.enum(['STANDARD', 'GOVERNMENTAL', 'MANDATORY', 'CLIENT', 'INTERNAL']).optional(),
  isGovernmental: z.boolean().optional(),
});

// Type for Gantt chart task data from Prisma queries
interface GanttTaskRow {
  id: string;
  title: string;
  description: string | null;
  projectId: string | null;
  priority: string;
  status: string;
  startDate: Date | null;
  endDate: Date | null;
  dueDate: Date | null;
  progress: number;
  taskType: string | null;
}

// GET - Fetch tasks and schedule phases for Gantt chart
export async function GET(request: NextRequest) {
  const rbac = await requireVerifiedPermission(request, Permission.TASK_READ);
  if ('error' in rbac) return rbac.error;
  const ctx = rbac.user;
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");
    const limit = Math.min(parseInt(searchParams.get("limit") || "500", 10), 2000); // Cap at 2000
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    const taskWhere: Record<string, unknown> = { deletedAt: null, ...(projectId ? { projectId } : {}), ...orgFilter(ctx) };

    // Fetch tasks with pagination to prevent OOM on large datasets
    const [tasks, totalTasks] = await Promise.all([
      db.task.findMany({
        where: taskWhere,
        orderBy: [{ startDate: "asc" }],
        skip: offset,
        take: limit,
        select: {
        id: true,
        title: true,
        description: true,
        projectId: true,
        priority: true,
        status: true,
        startDate: true,
        endDate: true,
        dueDate: true,
        progress: true,
        taskType: true,
      },
    }),
    db.task.count({ where: taskWhere }),
    ]);

    // Fetch schedule phases
    const phaseWhere: Record<string, unknown> = { deletedAt: null, ...(projectId ? { projectId } : {}), ...orgFilter(ctx) };
    const phases = await db.schedulePhase.findMany({
      where: phaseWhere,
      orderBy: [{ phaseOrder: "asc" }],
      select: {
        id: true,
        projectId: true,
        section: true,
        phaseOrder: true,
        phaseName: true,
        duration: true,
        maxDuration: true,
        status: true,
        startDate: true,
        endDate: true,
      },
    });

    // Combine both into a unified gantt data format
    const ganttTasks = [
      ...tasks.map((task) => ({
        id: task.id,
        title: task.title,
        description: task.description || undefined,
        projectId: task.projectId,
        priority: task.priority,
        status: task.status,
        startDate: task.startDate,
        endDate: (task as GanttTaskRow).endDate,
        dueDate: task.dueDate,
        progress: task.progress,
        isMilestone: false,
        isGovernmental: task.taskType === 'GOVERNMENTAL',
        type: "task" as const,
        phaseCategory: getPhaseCategoryFromTask(task as GanttTaskRow),
      })),
      ...phases.map((phase) => ({
        id: `phase-${phase.id}`,
        title: phase.phaseName,
        description: undefined,
        projectId: phase.projectId,
        priority: "MEDIUM" as const,
        status: mapPhaseStatus(phase.status),
        startDate: phase.startDate,
        endDate: phase.endDate,
        dueDate: undefined,
        progress: phase.status === "COMPLETED" ? 100 : phase.status === "IN_PROGRESS" ? 50 : 0,
        isMilestone: false,
        isGovernmental: phase.section === "GOVERNMENTAL",
        type: "phase" as const,
        phaseCategory: mapSectionToCategory(phase.section),
      })),
    ];

    return NextResponse.json({
      success: true,
      data: ganttTasks,
      pagination: {
        total: totalTasks,
        limit,
        offset,
        hasMore: offset + tasks.length < totalTasks,
      },
    });
  } catch (error) {
    log.error("Error fetching Gantt data:", error);
    return NextResponse.json(
      { success: false, error: { message: "Failed to fetch Gantt data" } },
      { status: 500 }
    );
  }
}

// POST - Create new task (for Gantt add)
export async function POST(request: NextRequest) {
  const rbac = await requireVerifiedPermission(request, Permission.TASK_CREATE);
  if ('error' in rbac) return rbac.error;
  const ctx = rbac.user;
  try {
    const rawBody = await request.json();

    // Zod validation for Gantt task creation
    const validation = ganttTaskCreateSchema.safeParse(rawBody);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: { message: validation.error.issues[0].message } },
        { status: 400 }
      );
    }
    const body = validation.data;

    const task = await db.task.create({
      data: {
        title: body.title,
        description: body.description || "",
        projectId: body.projectId || null,
        priority: (body.priority || "NORMAL"),
        status: (body.status || "TODO"),
        startDate: body.startDate ? new Date(body.startDate) : null,
        endDate: body.endDate ? new Date(body.endDate) : null,
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
        progress: body.progress || 0,
        taskType: body.taskType || (body.isGovernmental ? 'GOVERNMENTAL' : 'STANDARD'),
        ...orgCreate(ctx),
        createdById: ctx.userId,
      },
    });

    return NextResponse.json({ success: true, data: task });
  } catch (error) {
    log.error("Error creating Gantt task:", error);
    return NextResponse.json(
      { success: false, error: { message: "Failed to create task" } },
      { status: 500 }
    );
  }
}

// PUT - Update task
export async function PUT(request: NextRequest) {
  const rbac = await requireVerifiedPermission(request, Permission.TASK_UPDATE);
  if ('error' in rbac) return rbac.error;
  const _ctx = rbac.user;
  try {
    const rawBody = await request.json();

    // Zod validation for Gantt task update
    const validation = ganttTaskUpdateSchema.safeParse(rawBody);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: { message: validation.error.issues[0].message } },
        { status: 400 }
      );
    }
    const { id, ...data } = validation.data;

    // Handle phase updates (id starts with "phase-")
    if (id.startsWith("phase-")) {
      const phaseId = id.replace("phase-", "");
      const updateData: Record<string, unknown> = {};
      if (data.status !== undefined) updateData.status = mapStatusToPhaseStatus(data.status);
      if (data.progress !== undefined) {
        if (data.progress >= 100) updateData.status = "COMPLETED";
        else if (data.progress > 0) updateData.status = "IN_PROGRESS";
      }
      if (data.startDate !== undefined) updateData.startDate = data.startDate ? new Date(data.startDate) : null;
      if (data.endDate !== undefined) updateData.endDate = data.endDate ? new Date(data.endDate) : null;

      const phase = await db.schedulePhase.update({
        where: { id: phaseId },
        data: updateData,
      });
      return NextResponse.json({ success: true, data: phase });
    }

    const updateData: Record<string, unknown> = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.priority !== undefined) updateData.priority = data.priority;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.progress !== undefined) updateData.progress = data.progress;
    if (data.startDate !== undefined) updateData.startDate = data.startDate ? new Date(data.startDate) : null;
    if (data.endDate !== undefined) updateData.endDate = data.endDate ? new Date(data.endDate) : null;
    if (data.dueDate !== undefined) updateData.dueDate = data.dueDate ? new Date(data.dueDate) : null;
    if (data.taskType !== undefined) updateData.taskType = data.taskType;
    else if (data.isGovernmental !== undefined) updateData.taskType = data.isGovernmental ? 'GOVERNMENTAL' : 'STANDARD';

    const task = await db.task.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ success: true, data: task });
  } catch (error) {
    log.error("Error updating Gantt task:", error);
    return NextResponse.json(
      { success: false, error: { message: "Failed to update task" } },
      { status: 500 }
    );
  }
}

// DELETE - Delete task
export async function DELETE(request: NextRequest) {
  const rbac = await requireVerifiedPermission(request, Permission.TASK_DELETE);
  if ('error' in rbac) return rbac.error;
  const _ctx = rbac.user;
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: { message: "Task ID is required" } },
        { status: 400 }
      );
    }

    if (id.startsWith("phase-")) {
      const phaseId = id.replace("phase-", "");
      await db.schedulePhase.update({ where: { id: phaseId }, data: { deletedAt: new Date() } });
    } else {
      await db.task.update({ where: { id }, data: { deletedAt: new Date() } });
    }

    return NextResponse.json({
      success: true,
      message: "Deleted successfully",
    });
  } catch (error) {
    log.error("Error deleting Gantt task:", error);
    return NextResponse.json(
      { success: false, error: { message: "Failed to delete task" } },
      { status: 500 }
    );
  }
}

// ===== Helper functions =====

function getPhaseCategoryFromTask(task: GanttTaskRow): string {
  if (task.taskType === 'GOVERNMENTAL' || task.taskType === 'MANDATORY') return "GOVERNMENT";
  const desc = (task.description || "").toLowerCase();
  if (desc.includes("STRUCTURAL") || desc.includes("إنشائ")) return "STRUCTURAL";
  if (desc.includes("MEP") || desc.includes("ELECTRICAL") || desc.includes("كهرباء")) return "MEP";
  return "ARCHITECTURAL";
}

function mapSectionToCategory(section: string): string {
  const map: Record<string, string> = {
    ARCHITECTURAL: "ARCHITECTURAL",
    STRUCTURAL: "STRUCTURAL",
    ELECTRICAL: "MEP",
    governmental: "GOVERNMENT",
    contracting: "CONTRACTING",
  };
  return map[section] || "ARCHITECTURAL";
}

function mapPhaseStatus(phaseStatus: string): string {
  const map: Record<string, string> = {
    NOT_STARTED: "TODO",
    IN_PROGRESS: "IN_PROGRESS",
    SUBMITTED: "REVIEW",
    APPROVED: "DONE",
    REJECTED: "CANCELLED",
  };
  return map[phaseStatus] || "TODO";
}

function mapStatusToPhaseStatus(status: string): string {
  const map: Record<string, string> = {
    TODO: "NOT_STARTED",
    IN_PROGRESS: "IN_PROGRESS",
    REVIEW: "SUBMITTED",
    DONE: "APPROVED",
    CANCELLED: "REJECTED",
  };
  return map[status] || "NOT_STARTED";
}
