import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireVerifiedPermission, orgFilter, orgCreate } from '@/app/api/utils/auth';
import { Permission } from '@/lib/auth/types';
import { withRateLimit, rateLimitResponse } from '@/lib/rate-limit-middleware';
import { log } from '@/lib/logger';
import { z } from 'zod';

const createBankAccountSchema = z.object({
  name: z.string().min(1).max(200),
  nameAr: z.string().max(200).optional(),
  bankName: z.string().min(1).max(200),
  iban: z.string().max(50).optional(),
  accountNumber: z.string().max(50).optional(),
  currency: z.string().max(3).default('AED'),
  openingBalance: z.number().default(0),
  accountId: z.string().optional(),
});

export async function GET(request: NextRequest) {
  const { result: rlResult } = await withRateLimit(request, 'api');
  const blocked = rateLimitResponse(rlResult);
  if (blocked) return blocked;

  const rbac = await requireVerifiedPermission(request, Permission.INVOICE_READ);
  if ('error' in rbac) return rbac.error;
  const ctx = rbac.user;

  const accounts = await db.bankAccount.findMany({
    where: { ...orgFilter(ctx), isActive: true },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ data: accounts });
}

export async function POST(request: NextRequest) {
  const { result: rlResult } = await withRateLimit(request, 'api');
  const blocked = rateLimitResponse(rlResult);
  if (blocked) return blocked;

  const rbac = await requireVerifiedPermission(request, Permission.INVOICE_CREATE);
  if ('error' in rbac) return rbac.error;
  const ctx = rbac.user;

  const body = await request.json();
  const validation = createBankAccountSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json({ error: validation.error.issues[0].message }, { status: 400 });
  }

  const data = validation.data;
  const account = await db.bankAccount.create({
    data: {
      name: data.name,
      nameAr: data.nameAr || null,
      bankName: data.bankName,
      iban: data.iban || null,
      accountNumber: data.accountNumber || null,
      currency: data.currency,
      openingBalance: data.openingBalance,
      currentBalance: data.openingBalance,
      accountId: data.accountId || null,
      ...orgCreate(ctx),
    },
  });

  log.info('Bank account created', { bankAccountId: account.id, name: account.name });

  return NextResponse.json(account, { status: 201 });
}
