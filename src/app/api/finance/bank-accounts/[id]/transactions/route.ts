import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';
import { requireVerifiedPermission, orgFilter } from '@/app/api/utils/auth';
import { Permission } from '@/lib/auth/types';
import { withRateLimit, rateLimitResponse } from '@/lib/rate-limit-middleware';
import { z } from 'zod';

// GET /api/finance/bank-accounts/[id]/transactions — list bank transactions
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
  const { searchParams } = new URL(request.url);
  const isReconciled = searchParams.get('isReconciled');
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');

  // Verify bank account belongs to org
  const bankAccount = await db.bankAccount.findFirst({
    where: { id, ...orgFilter(ctx) },
  });
  if (!bankAccount) {
    return NextResponse.json({ error: 'Bank account not found' }, { status: 404 });
  }

  const where: Record<string, unknown> = {
    bankAccountId: id,
    organizationId: ctx.organizationId,
  };

  if (isReconciled === 'true') where.isReconciled = true;
  if (isReconciled === 'false') where.isReconciled = false;

  if (startDate || endDate) {
    where.date = {};
    if (startDate) (where.date as Record<string, unknown>).gte = new Date(startDate);
    if (endDate) (where.date as Record<string, unknown>).lte = new Date(endDate);
  }

  const transactions = await db.bankTransaction.findMany({
    where,
    orderBy: { date: 'desc' },
    take: 200,
  });

  return NextResponse.json({ data: transactions });
}

const importSchema = z.object({
  transactions: z.array(z.object({
    date: z.string(),
    description: z.string(),
    reference: z.string().optional(),
    amount: z.number(),
    type: z.string().default('OTHER'),
  })),
});

// POST /api/finance/bank-accounts/[id]/transactions — import bank statement
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { result: rlResult } = await withRateLimit(request, 'export');
  const blocked = rateLimitResponse(rlResult);
  if (blocked) return blocked;

  const rbac = await requireVerifiedPermission(request, Permission.INVOICE_CREATE);
  if ('error' in rbac) return rbac.error;
  const ctx = rbac.user;

  const { id } = await params;
  const bankAccount = await db.bankAccount.findFirst({
    where: { id, ...orgFilter(ctx) },
  });
  if (!bankAccount) {
    return NextResponse.json({ error: 'Bank account not found' }, { status: 404 });
  }

  const body = await request.json();
  const validation = importSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json({ error: validation.error.issues[0].message }, { status: 400 });
  }

  // Import transactions with running balance
  let runningBalance = new Prisma.Decimal(bankAccount.currentBalance);
  const created: unknown[] = [];

  for (const txn of validation.data.transactions) {
    runningBalance = runningBalance.add(new Prisma.Decimal(txn.amount));
    const record = await db.bankTransaction.create({
      data: {
        bankAccountId: id,
        date: new Date(txn.date),
        description: txn.description,
        reference: txn.reference || null,
        amount: txn.amount,
        balanceAfter: runningBalance,
        type: txn.type,
        isReconciled: false,
        organizationId: ctx.organizationId || '',
      },
    });
    created.push(record);
  }

  // Update bank account balance
  await db.bankAccount.update({
    where: { id },
    data: { currentBalance: runningBalance },
  });

  return NextResponse.json({ imported: created.length, balance: runningBalance }, { status: 201 });
}
