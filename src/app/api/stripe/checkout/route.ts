/**
 * API Route: Create Stripe Checkout Session
 * إنشاء جلسة دفع Stripe
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  createCheckoutSession,
  createStripeCustomer,
  DEFAULT_PLANS,
} from '@/lib/stripe';
import { db } from '@/lib/db';
import { requireVerifiedPermission } from '../../utils/auth';
import { Permission } from '@/lib/auth/types';
import { log } from '@/lib/logger';
import { withRateLimit, rateLimitResponse } from '@/lib/rate-limit-middleware';

export async function POST(request: NextRequest) {
  // Rate limiting - strict for payment operations (5 req/min)
  const { result: rlResult } = await withRateLimit(request, 'strict');
  const rlBlocked = rateLimitResponse(rlResult);
  if (rlBlocked) return rlBlocked;

  try {
    // RBAC CHECK - requires INVOICE_CREATE permission (JWT-verified for payments)
    const rbac = await requireVerifiedPermission(request, Permission.INVOICE_CREATE);
    if ('error' in rbac) return rbac.error;
    const ctx = rbac.user;

    const body = await request.json();
    const { planId, interval = 'month', organizationId, email, name } = body;

    // SECURITY: Verify the organizationId belongs to the authenticated user
    if (organizationId && ctx.organizationId && organizationId !== ctx.organizationId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'غير مصرح بهذا التنظيم',
          },
        },
        { status: 403 }
      );
    }

    // Validate required fields
    if (!planId || !organizationId || !email || !name) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'MISSING_FIELDS',
            message: 'جميع الحقول مطلوبة',
          },
        },
        { status: 400 }
      );
    }

    // Find the plan
    const plan = DEFAULT_PLANS.find((p) => p.id === planId);
    if (!plan) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'PLAN_NOT_FOUND',
            message: 'الخطة غير موجودة',
          },
        },
        { status: 404 }
      );
    }

    // Get or create Stripe customer
    let stripeCustomerId: string | undefined;

    try {
      const _organization = await db.organization.findUnique({
        where: { id: organizationId },
      });

      // For demo purposes, create a new customer
      const customer = await createStripeCustomer(email, name, {
        organizationId,
        planId,
      });
      
      if (customer) {
        stripeCustomerId = customer.id;
      }
    } catch {
      // If database is not available, create customer anyway
      console.info('Database not available, creating Stripe customer directly');
      const customer = await createStripeCustomer(email, name, {
        organizationId,
        planId,
      });
      
      if (customer) {
        stripeCustomerId = customer.id;
      }
    }

    if (!stripeCustomerId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'STRIPE_CUSTOMER_ERROR',
            message: 'فشل في إنشاء عميل Stripe',
          },
        },
        { status: 500 }
      );
    }

    // Get Stripe price ID based on interval
    const stripePriceId = plan.stripePriceId;

    if (!stripePriceId) {
      // Stripe is not configured — return honest error instead of fake success
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'STRIPE_NOT_CONFIGURED',
            message: 'خدمة الدفع غير متاحة حالياً. يرجى التواصل مع الإدارة',
          },
        },
        { status: 503 }
      );
    }

    // SECURITY: Validate the origin header against allowed CORS origins
    // to prevent open redirect / phishing attacks on payment flow
    const rawOrigin = request.headers.get('origin') || '';
    const allowedOrigins = process.env.CORS_ORIGINS?.split(',').map(o => o.trim()).filter(Boolean) || [];
    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      (process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : '');
    if (!appUrl) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'MISSING_APP_URL',
            message: 'Application URL is not configured. Set NEXT_PUBLIC_APP_URL environment variable.',
          },
        },
        { status: 500 }
      );
    }
    const validOrigins = [...allowedOrigins, appUrl];
    const origin = validOrigins.includes(rawOrigin) ? rawOrigin : appUrl;

    // Create checkout session
    const session = await createCheckoutSession({
      customerId: stripeCustomerId,
      priceId: stripePriceId,
      successUrl: `${origin}/settings/billing?session_id={CHECKOUT_SESSION_ID}&success=true`,
      cancelUrl: `${origin}/settings/billing?canceled=true`,
      metadata: {
        organizationId,
        planId,
        interval,
      },
    });

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'CHECKOUT_SESSION_ERROR',
            message: 'فشل في إنشاء جلسة الدفع',
          },
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        sessionId: session.id,
        url: session.url,
      },
    });
  } catch (error) {
    log.error('Checkout session error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'CHECKOUT_ERROR',
          message: 'حدث خطأ أثناء إنشاء جلسة الدفع',
          details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : 'Unknown error') : undefined,
        },
      },
      { status: 500 }
    );
  }
}
