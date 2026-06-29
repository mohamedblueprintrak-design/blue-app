import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireVerifiedPermission, orgFilter } from '@/app/api/utils/auth';
import { Permission } from '@/lib/auth/types';
import { withRateLimit, rateLimitResponse } from '@/lib/rate-limit-middleware';
import { z } from 'zod';

// GET /api/finance/bank-accounts/[id] — get bank account details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { result: rlResult } = await withRateLimit(request, 'api');
  const blocked = rateLimitResponse(rlResult);
  if (blocked) return blocked;

  const rbac = await requireVerifiedPermission(request, Permission.INVOICE_READ);
  if ('error' in rbac) return rbac.error;
  const ctx = rbac.user;

  const { id } = await params;
  const account = await db.bankAccount.findFirst({
    where: { id, ...orgFilter(ctx) },
    include: {
      account: { select: { id: true, code: true, nameEn: true, nameAr: true } },
      _count: { select: { transactions: true } },
    },
  });

  if (!account) {
    return NextResponse.json({ error: 'Bank account not found' }, { status: 404 });
  }

  return NextResponse.json(account);
}

// DELETE /api/finance/bank-accounts/[id] — deactivate (soft delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { result: rlResult } = await withRateLimit(request, 'api');
  const blocked = rateLimitResponse(rlResult);
  if (blocked) return blocked;

  const rbac = await requireVerifiedPermission(request, Permission.INVOICE_CREATE);
  if ('error' in rbac) return rbac.error;
  const ctx = rbac.user;

  const { id } = await params;
  const account = await db.bankAccount.findFirst({
    where: { id, ...orgFilter(ctx) },
  });

  if (!account) {
    return NextResponse.json({ error: 'Bank account not found' }, { status: 404 });
  }

  // Soft delete: deactivate instead of deleting (preserve transaction history)
  await db.bankAccount.update({
    where: { id },
    data: { isActive: false },
  });

  return NextResponse.json({ success: true });
}
