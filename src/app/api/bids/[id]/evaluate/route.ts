import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { log } from '@/lib/logger';
import { requireVerifiedPermission, orgCheck, orgCreate } from '@/app/api/utils/auth';
import { Permission } from '@/lib/auth/types';
import { forbiddenResponse } from '@/app/api/utils/response';
import { validateIdParam } from '@/lib/api-validation';

// POST /api/bids/[id]/evaluate
// Save or update evaluation criteria scores for a bid.
// Accepts a single criteria object or an array of criteria objects.
// After saving, recalculates totalScore as the weighted average of all evaluations.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // RBAC CHECK — evaluating bids is a financial action
    const rbac = await requireVerifiedPermission(request, Permission.BUDGET_MANAGE);
    if ('error' in rbac) return rbac.error;
    const user = rbac.user;

    const { id: rawBidId } = await params;
    const bidIdResult = validateIdParam(rawBidId);
    if (!bidIdResult.success) return bidIdResult.response;
    const bidId = bidIdResult.id;
    const body = await request.json();

    const bid = await db.bid.findUnique({
      where: { id: bidId },
      include: { project: { select: { organizationId: true } } },
    });
    if (!bid) {
      return NextResponse.json({ error: "Bid not found" }, { status: 404 });
    }

    // Multi-tenancy: check org access via project
    const orgError = orgCheck(user, { organizationId: bid.project?.organizationId });
    if (orgError) return orgError;

    // Accept single object or array of evaluation criteria
    const criteriaList = Array.isArray(body) ? body : [body];

    const savedEvaluations: Record<string, unknown>[] = [];

    for (const item of criteriaList) {
      const { criteria, score, maxScore, weight, notes } = item;

      if (!criteria) {
        return NextResponse.json(
          { error: "Criteria name is required" },
          { status: 400 }
        );
      }

      const parsedScore = score !== undefined ? parseInt(String(score), 10) : 0;
      const parsedMaxScore = maxScore !== undefined ? parseInt(String(maxScore), 10) : 100;
      const parsedWeight = weight !== undefined ? parseFloat(String(weight)) : 1;

      // Find existing evaluation for this bid + criteria combination
      const existing = await db.contractorEvaluation.findFirst({
        where: { bidId, criteria },
      });

      let evaluation;
      if (existing) {
        evaluation = await db.contractorEvaluation.update({
          where: { id: existing.id },
          data: {
            score: parsedScore,
            maxScore: parsedMaxScore,
            weight: parsedWeight,
            ...(notes !== undefined && { notes }),
            ...(user && { evaluatedBy: user.name || user.userId }),
          },
        });
      } else {
        evaluation = await db.contractorEvaluation.create({
          data: {
            contractorId: bid.contractorId || "",
            projectId: bid.projectId,
            bidId: bid.id,
            criteria,
            score: parsedScore,
            maxScore: parsedMaxScore,
            weight: parsedWeight,
            notes: notes || "",
            evaluatedBy: user.name || user.userId,
            ...orgCreate(user),
          },
        });
      }

      savedEvaluations.push(evaluation);
    }

    // Recalculate totalScore as weighted average of all evaluations for this bid
    const allEvaluations = await db.contractorEvaluation.findMany({
      where: { bidId },
    });

    let newTotalScore = 0;
    if (allEvaluations.length > 0) {
      const totalWeight = allEvaluations.reduce((sum, ev) => sum + Number(ev.weight), 0);
      if (totalWeight > 0) {
        const weightedSum = allEvaluations.reduce((sum, ev) => {
          const normalizedScore = Number(ev.maxScore) > 0 ? Number(ev.score) / Number(ev.maxScore) : 0;
          return sum + normalizedScore * Number(ev.weight);
        }, 0);
        newTotalScore = Math.round((weightedSum / totalWeight) * 100 * 100) / 100;
      }
    }

    // Update the bid with the new totalScore
    const updatedBid = await db.bid.update({
      where: { id: bidId },
      data: { totalScore: newTotalScore },
      include: {
        project: { select: { id: true, name: true, nameEn: true, number: true } },
        contractor: {
          select: {
            id: true,
            name: true,
            nameEn: true,
            companyName: true,
            companyEn: true,
            contactPerson: true,
            phone: true,
            email: true,
            category: true,
            rating: true,
          },
        },
        evaluations: {
          select: {
            id: true,
            criteria: true,
            score: true,
            maxScore: true,
            weight: true,
            notes: true,
            evaluatedBy: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    return NextResponse.json({
      evaluations: savedEvaluations,
      bid: updatedBid,
    });
  } catch (error) {
    log.error("Error saving bid evaluation:", error);
    return NextResponse.json(
      { error: "Failed to save evaluation" },
      { status: 500 }
    );
  }
}
