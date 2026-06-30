import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireVerifiedPermission, orgFilter } from '@/app/api/utils/auth';
import { Permission } from '@/lib/auth/types';
import { withRateLimit, rateLimitResponse } from '@/lib/rate-limit-middleware';
import { log } from '@/lib/logger';
import { z } from 'zod';

const reconcileSchema = z.object({
  transactionId: z.string(),
  journalEntryId: z.string().optional(),
  matchType: z.enum(['AUTO', 'MANUAL']).default('MANUAL'),
  matchDetails: z.string().optional(),
});

// POST /api/finance/bank-accounts/[id]/reconcile — mark transaction as reconciled
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { result: rlResult } = await withRateLimit(request, 'api');
  const blocked = rateLimitResponse(rlResult);
  if (blocked) return blocked;

  const rbac = await requireVerifiedPermission(request, Permission.INVOICE_CREATE);
  if ('error' in rbac) return rbac.error;
  const ctx = rbac.user;

  const { id: bankAccountId } = await params;
  const body = await request.json();
  const validation = reconcileSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json({ error: validation.error.issues[0].message }, { status: 400 });
  }

  const { transactionId, journalEntryId, matchType, matchDetails } = validation.data;

  // Verify bank account belongs to org
  const bankAccount = await db.bankAccount.findFirst({
    where: { id: bankAccountId, ...orgFilter(ctx) },
  });
  if (!bankAccount) {
    return NextResponse.json({ error: 'Bank account not found' }, { status: 404 });
  }

  // Verify transaction belongs to this bank account
  const transaction = await db.bankTransaction.findFirst({
    where: { id: transactionId, bankAccountId, organizationId: ctx.organizationId || undefined },
  });
  if (!transaction) {
    return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
  }

  if (transaction.isReconciled) {
    return NextResponse.json({ error: 'Transaction already reconciled' }, { status: 400 });
  }

  // Mark as reconciled
  const updated = await db.bankTransaction.update({
    where: { id: transactionId },
    data: {
      isReconciled: true,
      reconciledAt: new Date(),
      journalEntryId: journalEntryId || null,
      matchType,
      matchDetails: matchDetails || null,
    },
  });

  log.info('Bank transaction reconciled', {
    transactionId,
    bankAccountId,
    matchType,
    amount: transaction.amount,
  });

  return NextResponse.json(updated);
}

// GET /api/finance/bank-accounts/[id]/reconcile — get reconciliation summary
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

  const { id: bankAccountId } = await params;
  const bankAccount = await db.bankAccount.findFirst({
    where: { id: bankAccountId, ...orgFilter(ctx) },
  });
  if (!bankAccount) {
    return NextResponse.json({ error: 'Bank account not found' }, { status: 404 });
  }

  // Get reconciliation summary
  const [unreconciled, reconciled] = await Promise.all([
    db.bankTransaction.findMany({
      where: { bankAccountId, isReconciled: false, organizationId: ctx.organizationId || undefined },
      orderBy: { date: 'desc' },
      take: 100,
    }),
    db.bankTransaction.count({
      where: { bankAccountId, isReconciled: true, organizationId: ctx.organizationId || undefined },
    }),
  ]);

  const unreconciledCount = unreconciled.length;
  const unreconciledDeposits = unreconciled
    .filter((t) => Number(t.amount) > 0)
    .reduce((sum, t) => sum + Number(t.amount), 0);
  const unreconciledWithdrawals = unreconciled
    .filter((t) => Number(t.amount) < 0)
    .reduce((sum, t) => sum + Number(t.amount), 0);

  return NextResponse.json({
    bankAccount: {
      id: bankAccount.id,
      name: bankAccount.name,
      currentBalance: bankAccount.currentBalance,
    },
    summary: {
      reconciledCount: reconciled,
      unreconciledCount,
      unreconciledDeposits,
      unreconciledWithdrawals,
      netUnreconciled: unreconciledDeposits + unreconciledWithdrawals,
    },
    unreconciledTransactions: unreconciled,
  });
}
