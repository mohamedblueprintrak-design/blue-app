import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { validateRequest, knowledgeArticleSchema } from '@/lib/api-validation';
import { requireVerifiedPermission, orgFilter } from '@/app/api/utils/auth';
import { Permission } from '@/lib/auth/types';
import { log } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const result = await requireVerifiedPermission(request, Permission.DOCUMENT_READ);
    if ('error' in result) return result.error;
    const ctx = result.user;

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const category = searchParams.get("category");
    const projectId = searchParams.get("projectId");

    // KnowledgeArticle doesn't have organizationId directly; filter through project relationship.
    // When orgId is set, show articles that EITHER belong to the org's projects OR have no projectId (general articles).
    // In multi-tenant mode, orgFilter returns __DENIED__ for users without org, preventing data leakage.
    const conditions: Record<string, unknown>[] = [];

    if (ctx.organizationId) {
      conditions.push({ OR: [{ project: { organizationId: ctx.organizationId } }, { projectId: null }] });
    } else if (process.env.MULTI_TENANT === 'true') {
      // Multi-tenant mode: users without org must not see any articles
      conditions.push({ organizationId: '__DENIED__' });
    }

    const where: Record<string, unknown> = {};
    if (category && category !== "all") where.category = category;
    if (projectId) where.projectId = projectId;
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { content: { contains: search } },
        { tags: { contains: search } },
      ];
    }

    // Combine org filter with other filters using AND to avoid OR collision
    if (conditions.length > 0) {
      if (Object.keys(where).length > 0) {
        where.AND = conditions;
      } else {
        // Only org filter — use it directly as the where clause
        if (conditions.length === 1) {
          Object.assign(where, conditions[0]);
        } else {
          where.AND = conditions;
        }
      }
    }

    const articles = await db.knowledgeArticle.findMany({
      where,
      include: {
        author: { select: { id: true, name: true, avatar: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(articles);
  } catch (error) {
    log.error("Error fetching knowledge articles:", error);
    return NextResponse.json({ error: "Failed to fetch articles" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const result = await requireVerifiedPermission(request, Permission.DOCUMENT_CREATE);
    if ('error' in result) return result.error;
    const ctx = result.user;

    const body = await request.json();

    const validation = validateRequest(knowledgeArticleSchema, body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error, errors: validation.errors }, { status: 400 });
    }

    const { title, content, category, tags, authorId, projectId } = validation.data;

    const article = await db.knowledgeArticle.create({
      data: {
        title: title || "",
        content: content || "",
        category: category || "guide",
        tags: tags || "",
        authorId: authorId || ctx.userId,
        projectId: projectId || null,
        views: 0,
      },
      include: {
        author: { select: { id: true, name: true, avatar: true } },
      },
    });

    return NextResponse.json(article, { status: 201 });
  } catch (error) {
    log.error("Error creating knowledge article:", error);
    return NextResponse.json({ error: "Failed to create article" }, { status: 500 });
  }
}
