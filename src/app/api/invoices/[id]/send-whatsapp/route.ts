import { NextRequest, NextResponse } from 'next/server';
import { requireVerifiedPermission } from '@/app/api/utils/auth';
import { Permission } from '@/lib/auth/types';
import { withRateLimit, rateLimitResponse } from '@/lib/rate-limit-middleware';
import { sendInvoiceViaWhatsApp } from '@/lib/services/whatsapp.service';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { result: rlResult } = await withRateLimit(request, 'strict');
  const blocked = rateLimitResponse(rlResult);
  if (blocked) return blocked;

  const rbac = await requireVerifiedPermission(request, Permission.INVOICE_CREATE);
  if ('error' in rbac) return rbac.error;
  const ctx = rbac.user;

  const { id } = await params;
  const result = await sendInvoiceViaWhatsApp(id, ctx.organizationId || '');

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ success: true, message: 'Invoice sent via WhatsApp' });
}
