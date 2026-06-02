import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { log } from '@/lib/logger';
import { requireVerifiedPermission, orgFilter } from '@/app/api/utils/auth';
import { Permission } from '@/lib/auth/types';
import { z } from 'zod';

// Zod schemas for project assignments
const projectAssignmentCreateSchema = z.object({
  projectId: z.string().min(1, 'Project ID is required').max(100),
  userId: z.string().min(1, 'User ID is required').max(100),
  role: z.string().max(50).default('team_member'),
});

const projectAssignmentUpdateSchema = z.object({
  id: z.string().cuid('Invalid ID'),
  role: z.string().min(1, 'Role is required').max(50),
});

// GET: Fetch assignments for a project (with user data)
// GET: Fetch all users for adding dialog
export async function GET(request: NextRequest) {
  // RBAC CHECK - requires PROJECT_READ permission
  const rbac = await requireVerifiedPermission(request, Permission.PROJECT_READ);
  if ('error' in rbac) return rbac.error;
  const auth = rbac.user;

  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");

    if (projectId) {
      // Fetch assignments for this project with user data
      const assignments = await db.projectAssignment.findMany({
        where: { projectId, deletedAt: null, ...orgFilter(auth) },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              avatar: true,
              role: true,
              department: true,
              position: true,
              isActive: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });
      return NextResponse.json(assignments);
    }

    // If no projectId, return all assignments
    const assignments = await db.projectAssignment.findMany({
      where: { deletedAt: null, ...orgFilter(auth) },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            avatar: true,
            role: true,
            department: true,
            position: true,
            isActive: true,
          },
        },
        project: {
          select: { id: true, name: true, nameEn: true, number: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(assignments);
  } catch (error) {
    log.error("Error fetching project assignments:", error);
    return NextResponse.json([], { status: 200 });
  }
}

// POST: Add a member to a project
export async function POST(request: NextRequest) {
  // RBAC CHECK - requires PROJECT_UPDATE permission
  const rbac = await requireVerifiedPermission(request, Permission.PROJECT_UPDATE);
  if ('error' in rbac) return rbac.error;
  const _auth = rbac.user;

  try {
    const rawBody = await request.json();

    // Zod validation for project assignment creation
    const validation = projectAssignmentCreateSchema.safeParse(rawBody);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      );
    }
    const { projectId, userId, role } = validation.data;

    // Check if already assigned
    const existing = await db.projectAssignment.findUnique({
      where: { projectId_userId: { projectId, userId } },
    });

    if (existing) {
      return NextResponse.json(
        { error: "User is already assigned to this project" },
        { status: 409 }
      );
    }

    const assignment = await db.projectAssignment.create({
      data: {
        projectId,
        userId,
        role: (role || "TEAM_MEMBER"),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            avatar: true,
            role: true,
            department: true,
            position: true,
            isActive: true,
          },
        },
      },
    });

    return NextResponse.json(assignment, { status: 201 });
  } catch (error) {
    log.error("Error creating project assignment:", error);
    return NextResponse.json(
      { error: "Failed to create assignment" },
      { status: 500 }
    );
  }
}

// PUT: Update assignment role
export async function PUT(request: NextRequest) {
  // RBAC CHECK - requires PROJECT_UPDATE permission
  const rbac = await requireVerifiedPermission(request, Permission.PROJECT_UPDATE);
  if ('error' in rbac) return rbac.error;
  const _auth = rbac.user;

  try {
    const rawBody = await request.json();

    // Zod validation for project assignment update
    const validation = projectAssignmentUpdateSchema.safeParse(rawBody);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      );
    }
    const { id, role } = validation.data;

    const assignment = await db.projectAssignment.update({
      where: { id },
      data: { role: role },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            avatar: true,
            role: true,
            department: true,
            position: true,
            isActive: true,
          },
        },
      },
    });

    return NextResponse.json(assignment);
  } catch (error) {
    log.error("Error updating project assignment:", error);
    return NextResponse.json(
      { error: "Failed to update assignment" },
      { status: 500 }
    );
  }
}

// DELETE: Remove member from project
export async function DELETE(request: NextRequest) {
  // RBAC CHECK - requires PROJECT_UPDATE permission
  const rbac = await requireVerifiedPermission(request, Permission.PROJECT_UPDATE);
  if ('error' in rbac) return rbac.error;
  const _auth = rbac.user;

  try {
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json(
        { error: "id is required" },
        { status: 400 }
      );
    }

    await db.projectAssignment.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    log.error("Error deleting project assignment:", error);
    return NextResponse.json(
      { error: "Failed to delete assignment" },
      { status: 500 }
    );
  }
}
