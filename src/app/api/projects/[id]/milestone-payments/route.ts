import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { requireVerifiedPermission, orgFilter } from '@/app/api/utils/auth';
import { Permission } from '@/lib/auth/types';
import { log } from '@/lib/logger';
import { withRateLimit, rateLimitResponse } from '@/lib/rate-limit-middleware';
import { z } from 'zod';
import { validateIdParam } from '@/lib/api-validation';
import { forbiddenResponse } from '@/app/api/utils/response';

// ============================================
// Zod Schemas
// ============================================

const milestoneCreateSchema = z.object({
  milestoneName: z.string().min(1, 'Milestone name is required').max(500),
  milestoneNameAr: z.string().max(500).optional().default(''),
  amount: z.coerce.number().positive('Amount must be positive').max(999999999),
  percentage: z.coerce.number().min(0).max(100).optional().default(0),
  dueDate: z.string().optional().default(''),
  taskId: z.string().max(100).optional().default(''),
  description: z.string().max(5000).optional().default(''),
});

const milestoneUpdateSchema = z.object({
  milestoneName: z.string().min(1, 'Milestone name is required').max(500).optional(),
  milestoneNameAr: z.string().max(500).optional(),
  amount: z.coerce.number().positive('Amount must be positive').max(999999999).optional(),
  percentage: z.coerce.number().min(0).max(100).optional(),
  dueDate: z.string().optional(),
  taskId: z.string().max(100).optional(),
  description: z.string().max(5000).optional(),
});

const milestoneMarkPaidSchema = z.object({
  milestoneIndex: z.coerce.number().int().min(0, 'Milestone index is required'),
  paidAmount: z.coerce.number().positive('Paid amount must be positive').max(999999999),
  paidDate: z.string().min(1, 'Paid date is required'),
  referenceNumber: z.string().max(200).optional().default(''),
});

// ============================================
// Helper: parse paymentSchedule JSON
// ============================================

interface MilestonePayment {
  milestoneName: string;
  milestoneNameAr?: string;
  amount: number;
  percentage?: number;
  dueDate?: string;
  taskId?: string;
  description?: string;
  status: string;
  paidAmount?: number;
  paidDate?: string;
  referenceNumber?: string;
  createdAt?: string;
  updatedAt?: string;
}

function parsePaymentSchedule(raw: string | null | undefined): MilestonePayment[] {
  if (!raw || raw.trim() === '') return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function serializePaymentSchedule(schedule: MilestonePayment[]): string {
  return JSON.stringify(schedule);
}

// ============================================
// Helper: verify project access
// ============================================

async function verifyProjectAccess(projectId: string, userOrgId: string | null) {
  const project = await db.project.findUnique({
    where: { id: projectId, deletedAt: null },
    select: {
      id: true,
      name: true,
      nameEn: true,
      number: true,
      organizationId: true,
      budget: true,
      paymentSchedule: true,
    },
  });

  if (!project) return null;

  // Multi-tenant org check
  if (userOrgId && project.organizationId && project.organizationId !== userOrgId) {
    return 'forbidden' as const;
  }

  return project;
}

// ============================================
// GET — List all milestone payments for a project
// ============================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { allowed: _allowed, result } = await withRateLimit(request, 'api');
  const blocked = rateLimitResponse(result);
  if (blocked) return blocked;

  try {
    const rbac = await requireVerifiedPermission(request, Permission.INVOICE_READ);
    if ('error' in rbac) return rbac.error;
    const user = rbac.user;

    const { id: rawId } = await params;
    const idCheck = validateIdParam(rawId);
    if (!idCheck.success) return idCheck.response;
    const projectId = idCheck.id;

    const project = await verifyProjectAccess(projectId, user.organizationId);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    if (project === 'forbidden') {
      return forbiddenResponse();
    }

    // Parse existing payment schedule
    const milestones = parsePaymentSchedule(project.paymentSchedule);

    // Fetch milestone tasks for the project (isMilestone = true)
    const milestoneTasks = await db.task.findMany({
      where: {
        projectId,
        isMilestone: true,
        deletedAt: null,
        ...orgFilter(user),
      },
      select: {
        id: true,
        title: true,
        titleAr: true,
        status: true,
        progress: true,
        dueDate: true,
      },
      orderBy: { order: 'asc' },
    });

    // Calculate totals
    const totalMilestoneAmount = milestones.reduce((sum, m) => sum + (Number(m.amount) || 0), 0);
    const paidAmount = milestones
      .filter(m => m.status === 'PAID')
      .reduce((sum, m) => sum + (Number(m.paidAmount) || Number(m.amount) || 0), 0);
    const pendingAmount = totalMilestoneAmount - paidAmount;

    log.info('Milestone payments listed', {
      projectId,
      milestoneCount: milestones.length,
      userId: user.userId,
    });

    return NextResponse.json({
      milestones,
      milestoneTasks,
      summary: {
        totalMilestoneAmount,
        paidAmount,
        pendingAmount,
        totalMilestones: milestones.length,
        paidMilestones: milestones.filter(m => m.status === 'PAID').length,
        pendingMilestones: milestones.filter(m => m.status !== 'PAID').length,
      },
    });
  } catch (error) {
    log.error("Error fetching milestone payments:", error);
    return NextResponse.json(
      { error: "Failed to fetch milestone payments" },
      { status: 500 }
    );
  }
}

// ============================================
// POST — Create a new milestone payment
// ============================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { allowed: _allowed, result } = await withRateLimit(request, 'api');
  const blocked = rateLimitResponse(result);
  if (blocked) return blocked;

  try {
    const rbac = await requireVerifiedPermission(request, Permission.INVOICE_CREATE);
    if ('error' in rbac) return rbac.error;
    const user = rbac.user;

    const { id: rawId } = await params;
    const idCheck = validateIdParam(rawId);
    if (!idCheck.success) return idCheck.response;
    const projectId = idCheck.id;

    const project = await verifyProjectAccess(projectId, user.organizationId);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    if (project === 'forbidden') {
      return forbiddenResponse();
    }

    const rawBody = await request.json();
    const validation = milestoneCreateSchema.safeParse(rawBody);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      );
    }
    const { milestoneName, milestoneNameAr, amount, percentage, dueDate, taskId, description } = validation.data;

    // If taskId provided, verify the task exists and is a milestone
    if (taskId) {
      const task = await db.task.findFirst({
        where: {
          id: taskId,
          projectId,
          isMilestone: true,
          deletedAt: null,
          ...orgFilter(user),
        },
      });
      if (!task) {
        return NextResponse.json(
          { error: "Task not found or is not a milestone task" },
          { status: 400 }
        );
      }
    }

    // Parse existing schedule and append new milestone
    const milestones = parsePaymentSchedule(project.paymentSchedule);
    const newMilestone: MilestonePayment = {
      milestoneName,
      milestoneNameAr: milestoneNameAr || '',
      amount,
      percentage: percentage || 0,
      dueDate: dueDate || '',
      taskId: taskId || '',
      description: description || '',
      status: 'PENDING',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    milestones.push(newMilestone);

    // Update project with new payment schedule
    await db.project.update({
      where: { id: projectId },
      data: {
        paymentSchedule: serializePaymentSchedule(milestones),
      },
    });

    log.info('Milestone payment created', {
      projectId,
      milestoneName,
      amount,
      userId: user.userId,
    });

    return NextResponse.json(
      {
        milestone: newMilestone,
        milestoneIndex: milestones.length - 1,
      },
      { status: 201 }
    );
  } catch (error) {
    log.error("Error creating milestone payment:", error);
    return NextResponse.json(
      { error: "Failed to create milestone payment" },
      { status: 500 }
    );
  }
}

// ============================================
// PUT — Update a milestone payment
// ============================================

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { allowed: _allowed, result } = await withRateLimit(request, 'api');
  const blocked = rateLimitResponse(result);
  if (blocked) return blocked;

  try {
    const rbac = await requireVerifiedPermission(request, Permission.INVOICE_UPDATE);
    if ('error' in rbac) return rbac.error;
    const user = rbac.user;

    const { id: rawId } = await params;
    const idCheck = validateIdParam(rawId);
    if (!idCheck.success) return idCheck.response;
    const projectId = idCheck.id;

    const project = await verifyProjectAccess(projectId, user.organizationId);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    if (project === 'forbidden') {
      return forbiddenResponse();
    }

    const rawBody = await request.json();
    const validation = milestoneUpdateSchema.safeParse(rawBody);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      );
    }
    const body = validation.data;

    // Need milestoneIndex to identify which milestone to update
    const milestoneIndex = rawBody.milestoneIndex;
    if (milestoneIndex === undefined || milestoneIndex === null) {
      return NextResponse.json(
        { error: "milestoneIndex is required" },
        { status: 400 }
      );
    }
    const index = Number(milestoneIndex);

    const milestones = parsePaymentSchedule(project.paymentSchedule);
    if (index < 0 || index >= milestones.length) {
      return NextResponse.json(
        { error: "Invalid milestone index" },
        { status: 400 }
      );
    }

    // If taskId provided, verify the task exists and is a milestone
    if (body.taskId) {
      const task = await db.task.findFirst({
        where: {
          id: body.taskId,
          projectId,
          isMilestone: true,
          deletedAt: null,
          ...orgFilter(user),
        },
      });
      if (!task) {
        return NextResponse.json(
          { error: "Task not found or is not a milestone task" },
          { status: 400 }
        );
      }
    }

    // Apply updates
    const existing = milestones[index];
    milestones[index] = {
      ...existing,
      ...(body.milestoneName !== undefined && { milestoneName: body.milestoneName }),
      ...(body.milestoneNameAr !== undefined && { milestoneNameAr: body.milestoneNameAr }),
      ...(body.amount !== undefined && { amount: body.amount }),
      ...(body.percentage !== undefined && { percentage: body.percentage }),
      ...(body.dueDate !== undefined && { dueDate: body.dueDate }),
      ...(body.taskId !== undefined && { taskId: body.taskId }),
      ...(body.description !== undefined && { description: body.description }),
      updatedAt: new Date().toISOString(),
    };

    await db.project.update({
      where: { id: projectId },
      data: {
        paymentSchedule: serializePaymentSchedule(milestones),
      },
    });

    log.info('Milestone payment updated', {
      projectId,
      milestoneIndex: index,
      userId: user.userId,
    });

    return NextResponse.json({
      milestone: milestones[index],
      milestoneIndex: index,
    });
  } catch (error) {
    log.error("Error updating milestone payment:", error);
    return NextResponse.json(
      { error: "Failed to update milestone payment" },
      { status: 500 }
    );
  }
}

// ============================================
// PATCH — Mark milestone as paid
// ============================================

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { allowed: _allowed, result } = await withRateLimit(request, 'api');
  const blocked = rateLimitResponse(result);
  if (blocked) return blocked;

  try {
    const rbac = await requireVerifiedPermission(request, Permission.INVOICE_UPDATE);
    if ('error' in rbac) return rbac.error;
    const user = rbac.user;

    const { id: rawId } = await params;
    const idCheck = validateIdParam(rawId);
    if (!idCheck.success) return idCheck.response;
    const projectId = idCheck.id;

    const project = await verifyProjectAccess(projectId, user.organizationId);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    if (project === 'forbidden') {
      return forbiddenResponse();
    }

    const rawBody = await request.json();
    const validation = milestoneMarkPaidSchema.safeParse(rawBody);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      );
    }
    const { milestoneIndex, paidAmount, paidDate, referenceNumber } = validation.data;

    const milestones = parsePaymentSchedule(project.paymentSchedule);
    if (milestoneIndex < 0 || milestoneIndex >= milestones.length) {
      return NextResponse.json(
        { error: "Invalid milestone index" },
        { status: 400 }
      );
    }

    const milestone = milestones[milestoneIndex];
    if (milestone.status === 'PAID') {
      return NextResponse.json(
        { error: "Milestone is already marked as paid" },
        { status: 400 }
      );
    }

    // Update the milestone status
    milestones[milestoneIndex] = {
      ...milestone,
      status: 'PAID',
      paidAmount,
      paidDate,
      referenceNumber: referenceNumber || '',
      updatedAt: new Date().toISOString(),
    };

    // Create a Payment record linked to the project
    const payment = await db.payment.create({
      data: {
        projectId,
        amount: paidAmount,
        payMethod: 'transfer',
        beneficiary: milestone.milestoneNameAr || milestone.milestoneName,
        referenceNumber: referenceNumber || '',
        status: 'completed',
        description: `Payment for milestone: ${milestone.milestoneName}${milestone.milestoneNameAr ? ` / ${milestone.milestoneNameAr}` : ''}`,
        createdById: user.userId,
        organizationId: user.organizationId || null,
      },
    });

    // Update project with new payment schedule
    await db.project.update({
      where: { id: projectId },
      data: {
        paymentSchedule: serializePaymentSchedule(milestones),
      },
    });

    log.info('Milestone payment marked as paid', {
      projectId,
      milestoneIndex,
      paidAmount,
      paymentId: payment.id,
      userId: user.userId,
    });

    return NextResponse.json({
      milestone: milestones[milestoneIndex],
      milestoneIndex,
      payment: {
        id: payment.id,
        amount: Number(payment.amount),
        status: payment.status,
        referenceNumber: payment.referenceNumber,
      },
    });
  } catch (error) {
    log.error("Error marking milestone payment as paid:", error);
    return NextResponse.json(
      { error: "Failed to mark milestone payment as paid" },
      { status: 500 }
    );
  }
}
