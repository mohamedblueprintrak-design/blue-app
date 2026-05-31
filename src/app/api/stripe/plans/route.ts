/**
 * API Route: Get Pricing Plans
 * الحصول على خطط الأسعار
 */

import { NextRequest, NextResponse } from 'next/server';
import { log } from '@/lib/logger';
import { 
  DEFAULT_PLANS, 
  calculateAnnualPrice, 
  formatPrice, 
  isStripeConfigured 
} from '@/lib/stripe';
import { requireVerifiedPermission } from '../../utils/auth';
import { Permission } from '@/lib/auth/types';

export async function GET(request: NextRequest) {
  // RBAC CHECK - requires INVOICE_READ permission (plans are financial data)
  // SECURITY: Use requireVerifiedPermission (JWT re-verified) consistent with other Stripe routes
  const rbac = await requireVerifiedPermission(request, Permission.INVOICE_READ);
  if ('error' in rbac) return rbac.error;

  try {
    const { searchParams } = new URL(request.url);
    const interval = searchParams.get('interval') || 'month';
    const lang = searchParams.get('lang') || 'ar';

    // Use default plans
    const plans = DEFAULT_PLANS.map((plan) => {
      const price = interval === 'year'
        ? calculateAnnualPrice(plan.price)
        : plan.price;

      return {
        id: plan.id,
        name: lang === 'ar' ? plan.nameAr : plan.name,
        nameAr: plan.nameAr,
        description: lang === 'ar' ? plan.descriptionAr : plan.description,
        descriptionAr: plan.descriptionAr,
        price,
        displayPrice: formatPrice(price, plan.currency),
        currency: plan.currency,
        interval,
        stripeProductId: plan.stripeProductId,
        stripePriceId: plan.stripePriceId,
        features: plan.features,
        limits: plan.limits,
        isActive: plan.isActive,
        isPopular: plan.isPopular,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        plans,
        interval,
        annualDiscount: 20, // 20% discount for annual
        stripeConfigured: isStripeConfigured,
      },
    });
  } catch (error) {
    log.error('Error fetching plans:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'PLANS_FETCH_ERROR',
          message: 'حدث خطأ أثناء جلب الخطط',
        },
      },
      { status: 500 }
    );
  }
}
