import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { log } from '@/lib/logger';
import { requireVerifiedPermission, orgCreate } from '@/app/api/utils/auth';
import { Permission } from '@/lib/auth/types';
import { forbiddenResponse } from '@/app/api/utils/response';
import { validateIdParam } from '@/lib/api-validation';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // RBAC CHECK
    const rbac = await requireVerifiedPermission(request, Permission.CLIENT_READ);
    if ('error' in rbac) return rbac.error;
    const user = rbac.user;

    const { id: rawId } = await params;
    const idResult = validateIdParam(rawId);
    if (!idResult.success) return idResult.response;
    const id = idResult.id;

    // Verify project exists and check org access
    const project = await db.project.findUnique({ where: { id }, select: { organizationId: true } });
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    if (user.organizationId && project.organizationId && project.organizationId !== user.organizationId) {
      return forbiddenResponse();
    }

    const interactions = await db.clientInteraction.findMany({
      where: { projectId: id },
      orderBy: { date: "desc" },
      include: {
        client: {
          select: { id: true, name: true, company: true },
        },
      },
    });

    return NextResponse.json({ interactions });
  } catch (error) {
    log.error("Error fetching interactions:", error);
    return NextResponse.json(
      { error: "Failed to fetch interactions" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // RBAC CHECK
    const rbac = await requireVerifiedPermission(request, Permission.CLIENT_CREATE);
    if ('error' in rbac) return rbac.error;
    const user = rbac.user;

    const { id: rawId } = await params;
    const idResult = validateIdParam(rawId);
    if (!idResult.success) return idResult.response;
    const id = idResult.id;

    // Verify project exists and check org access
    const project = await db.project.findUnique({ where: { id }, select: { organizationId: true } });
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    if (user.organizationId && project.organizationId && project.organizationId !== user.organizationId) {
      return forbiddenResponse();
    }

    const body = await request.json();
    const { clientId, type, date, subject, description, outcome } = body;

    if (!clientId || !date) {
      return NextResponse.json(
        { error: "Missing required fields: clientId, date" },
        { status: 400 }
      );
    }

    const interaction = await db.clientInteraction.create({
      data: {
        projectId: id,
        clientId,
        type: type || "MEETING",
        date: new Date(date),
        subject: subject || "",
        description: description || "",
        outcome: outcome || "",
        ...orgCreate(user),
      },
      include: {
        client: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json(interaction, { status: 201 });
  } catch (error) {
    log.error("Error creating interaction:", error);
    return NextResponse.json(
      { error: "Failed to create interaction" },
      { status: 500 }
    );
  }
}
