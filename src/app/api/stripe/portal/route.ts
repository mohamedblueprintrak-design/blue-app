/**
 * API Route: Create Stripe Billing Portal Session
 * إنشاء جلسة بوابة الفوترة
 */

import { NextRequest, NextResponse } from 'next/server';
import { createBillingPortalSession } from '@/lib/stripe';
import { requireVerifiedPermission, forbiddenResponse } from '../../utils/auth';
import { Permission } from '@/lib/auth/types';
import { log } from '@/lib/logger';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    // RBAC CHECK - requires INVOICE_READ permission (JWT-verified for payments)
    const rbac = await requireVerifiedPermission(request, Permission.INVOICE_READ);
    if ('error' in rbac) return rbac.error;
    const ctx = rbac.user;

    const body = await request.json();
    const { customerId } = body;

    if (!customerId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'MISSING_CUSTOMER_ID',
            message: 'معرف العميل مطلوب',
          },
        },
        { status: 400 }
      );
    }

    // SECURITY: In multi-tenant mode, verify the Stripe customer belongs to user's org
    if (process.env.MULTI_TENANT === 'true' && ctx.organizationId) {
      const org = await db.organization.findFirst({
        where: { id: ctx.organizationId, stripeCustomerId: customerId },
        select: { id: true },
      });
      if (!org) {
        return forbiddenResponse('Customer does not belong to your organization');
      }
    }

    // Create billing portal session
    const origin = request.headers.get('origin') || 'http://localhost:3000';
    const session = await createBillingPortalSession(
      customerId,
      `${origin}/settings/billing`
    );

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'PORTAL_SESSION_ERROR',
            message: 'فشل في إنشاء جلسة البوابة',
          },
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        url: session.url,
      },
    });
  } catch (error) {
    log.error('Billing portal error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'PORTAL_ERROR',
          message: 'حدث خطأ أثناء فتح بوابة الفوترة',
          details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : 'Unknown error') : undefined,
        },
      },
      { status: 500 }
    );
  }
}
