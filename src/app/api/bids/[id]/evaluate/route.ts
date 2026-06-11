import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { log } from '@/lib/logger';
import { requireVerifiedPermission, orgCheck, orgCreate } from '@/app/api/utils/auth';
import { Permission } from '@/lib/auth/types';
import { validateIdParam } from '@/lib/api-validation';
import { z } from 'zod';

// Zod schema for evaluation criteria validation
const evaluationSchema = z.object({
  criteria: z.array(z.object({
    name: z.string().min(1),
    score: z.number().min(0),
    maxScore: z.number().min(1),
    weight: z.number().min(0).max(100),
    comments: z.string().optional(),
  })),
  overallComments: z.string().optional(),
});

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
    const rawBody = await request.json();

    // Validate evaluation criteria with Zod schema
    const validation = evaluationSchema.safeParse(rawBody);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      );
    }
    const body = validation.data;

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

    // Use validated criteria array from schema
    const criteriaList = body.criteria;

    const savedEvaluations: Record<string, unknown>[] = [];

    for (const item of criteriaList) {
      const { name: criteria, score, maxScore, weight, comments: notes } = item;

      const parsedScore = score;
      const parsedMaxScore = maxScore;
      const parsedWeight = weight;

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
