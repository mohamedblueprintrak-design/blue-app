import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { handleApiError } from '@/lib/api-error';
import { requireVerifiedPermission } from '@/app/api/utils/auth';
import { Permission } from '@/lib/auth/types';
import { validateIdParam } from '@/lib/api-validation';

// POST /api/projects/[id]/contractor-rfq/analyze - AI analysis of quotes
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // RBAC CHECK — AI analysis of financial quotes
    const rbac = await requireVerifiedPermission(request, Permission.BUDGET_MANAGE);
    if ('error' in rbac) return rbac.error;
    const user = rbac.user;

    const { id: rawId } = await params;
    const idResult = validateIdParam(rawId);
    if (!idResult.success) return idResult.response;
    const id = idResult.id;

    // Verify project exists and check org access
    const project = await db.project.findUnique({ where: { id } });
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Multi-tenancy: check org access
    if (user.organizationId && project.organizationId && project.organizationId !== user.organizationId) {
      return forbiddenResponse();
    }

    // Get all bids with quotes for this project
    const bids = await db.bid.findMany({
      where: {
        projectId: id,
        quoteFile: { not: '' },
      },
      include: {
        contractor: {
          select: {
            id: true,
            name: true,
            companyName: true,
            rating: true,
            category: true,
            experience: true,
          },
        },
      },
    });

    if (bids.length < 2) {
      return NextResponse.json(
        { error: 'At least 2 quotes are required for comparison' },
        { status: 400 }
      );
    }

    // Build analysis data
    const analysisData = bids.map((bid) => ({
      bidId: bid.id,
      contractorName: bid.contractor?.companyName || bid.contractorName,
      amount: bid.amount,
      rating: bid.contractor?.rating || 0,
      technicalScore: bid.technicalScore,
      financialScore: bid.financialScore,
      totalScore: bid.totalScore,
    }));

    // Sort by total score descending for ranking
    const ranked = [...analysisData].sort((a, b) => Number(b.totalScore) - Number(a.totalScore));

    // Generate AI analysis text
    const bestBid = ranked[0];
    const analysisText = `بناءً على تحليل العروض المقدمة:\n- أفضل عرض: ${bestBid.contractorName} بمبلغ ${bestBid.amount.toLocaleString()} درهم\n- التقييم: ${bestBid.rating}/5 نجوم\n- المجموع: ${bestBid.totalScore}%\n\nتوصية: يُنصح بترسية المشروع على ${bestBid.contractorName} نظراً للتوازن بين السعر والجودة والخبرة.`;

    // Update bids with analysis
    for (const bid of bids) {
      await db.bid.update({
        where: { id: bid.id },
        data: {
          rfqStatus: 'REVIEWING',
          aiAnalysis: analysisText,
        },
      });
    }

    return NextResponse.json({
      analysis: analysisText,
      ranked,
      bids: analysisData,
    });
  } catch (error: unknown) {
    return handleApiError(error, 'ContractorRFQ Analyze');
  }
}
