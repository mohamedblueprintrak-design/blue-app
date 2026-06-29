import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { sanitizeObject, sanitizeEmail } from '@/lib/security/sanitize';
import { requireVerifiedPermission } from '../../utils/auth';
import { errorResponse, notFoundResponse, forbiddenResponse } from '../../utils/response';
import { validateRequest, clientUpdateSchema, validateIdParam } from '@/lib/api-validation';
import { log } from '@/lib/logger';
import { Permission } from '@/lib/auth/types';
import { withRateLimit, rateLimitResponse } from '@/lib/rate-limit-middleware';

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

    const client = await db.client.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            projects: true,
            invoices: true,
            contracts: true,
          },
        },
        projects: {
          select: {
            id: true,
            number: true,
            name: true,
            nameEn: true,
            status: true,
            type: true,
          },
          orderBy: { createdAt: "desc" },
          take: 10,
        },
        invoices: {
          select: {
            id: true,
            number: true,
            total: true,
            paidAmount: true,
            remaining: true,
            status: true,
            issueDate: true,
            dueDate: true,
          },
          orderBy: { createdAt: "desc" },
          take: 10,
        },
        contracts: {
          select: {
            id: true,
            number: true,
            title: true,
            value: true,
            type: true,
            status: true,
            startDate: true,
            endDate: true,
          },
          orderBy: { createdAt: "desc" },
          take: 10,
        },
        interactions: {
          orderBy: { date: "desc" },
          take: 20,
        },
      },
    });

    if (!client || client.deletedAt) {
      return notFoundResponse("Client not found");
    }

    // Multi-tenancy: check org access
    if (user.organizationId && client.organizationId && client.organizationId !== user.organizationId) {
      return forbiddenResponse();
    }

    return NextResponse.json(client);
  } catch (error) {
    log.error("Error fetching client:", error);
    return errorResponse("Failed to fetch client", "SERVER_ERROR", 500);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { allowed: _allowed, result } = await withRateLimit(request, 'api');
  const blocked = rateLimitResponse(result);
  if (blocked) return blocked;

  try {
    // RBAC CHECK
    const rbac = await requireVerifiedPermission(request, Permission.CLIENT_UPDATE);
    if ('error' in rbac) return rbac.error;
    const user = rbac.user;

    const { id: rawId } = await params;
    const idResult = validateIdParam(rawId);
    if (!idResult.success) return idResult.response;
    const id = idResult.id;
    const rawBody = await request.json();
    const validation = validateRequest(clientUpdateSchema, rawBody);

    // Zod validation for client update fields
    
    if (!validation.success) {
      return NextResponse.json({ error: validation.error, errors: validation.errors }, { status: 400 });
    }
    const _body = sanitizeObject(validation.data);

    const existing = await db.client.findUnique({ where: { id } });
    if (!existing || existing.deletedAt) {
      return notFoundResponse("Client not found");
    }

    // Multi-tenancy: check org access
    if (user.organizationId && existing.organizationId && existing.organizationId !== user.organizationId) {
      return forbiddenResponse();
    }

    const validatedData = validation.data;
    const sanitizedEmail = validatedData.email !== undefined ? sanitizeEmail(validatedData.email) : undefined;

    const client = await db.client.update({
      where: { id },
      data: {
        ...(validatedData.name !== undefined && { name: validatedData.name }),
        ...(validatedData.company !== undefined && { company: validatedData.company }),
        ...(sanitizedEmail !== undefined && { email: sanitizedEmail }),
        ...(validatedData.phone !== undefined && { phone: validatedData.phone }),
        ...(validatedData.address !== undefined && { address: validatedData.address }),
        ...(validatedData.taxNumber !== undefined && { taxNumber: validatedData.taxNumber }),
        ...(validatedData.creditLimit !== undefined && { creditLimit: validatedData.creditLimit }),
        ...(validatedData.paymentTerms !== undefined && { paymentTerms: validatedData.paymentTerms }),
      },
      include: {
        _count: {
          select: {
            projects: true,
            invoices: true,
            contracts: true,
          },
        },
      },
    });

    return NextResponse.json(client);
  } catch (error) {
    log.error("Error updating client:", error);
    return errorResponse("Failed to update client", "SERVER_ERROR", 500);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { allowed: _allowed, result } = await withRateLimit(request, 'api');
  const blocked = rateLimitResponse(result);
  if (blocked) return blocked;

  try {
    // RBAC CHECK
    const rbac = await requireVerifiedPermission(request, Permission.CLIENT_DELETE);
    if ('error' in rbac) return rbac.error;
    const user = rbac.user;

    const { id: rawId } = await params;
    const idResult = validateIdParam(rawId);
    if (!idResult.success) return idResult.response;
    const id = idResult.id;

    const existing = await db.client.findUnique({ where: { id } });
    if (!existing || existing.deletedAt) {
      return notFoundResponse("Client not found");
    }

    // Multi-tenancy: check org access
    if (user.organizationId && existing.organizationId && existing.organizationId !== user.organizationId) {
      return forbiddenResponse();
    }

    // Soft delete
    await db.client.update({ where: { id }, data: { deletedAt: new Date() } });

    return NextResponse.json({ success: true });
  } catch (error) {
    log.error("Error deleting client:", error);
    return errorResponse("Failed to delete client", "SERVER_ERROR", 500);
  }
}
