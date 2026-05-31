import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { requireVerifiedPermission, orgFilterNested } from '@/app/api/utils/auth';
import { Permission } from '@/lib/auth/types';
import { log } from '@/lib/logger';
import { validateIdParam, validateRequest, knowledgeArticleUpdateSchema } from '@/lib/api-validation';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const result = await requireVerifiedPermission(request, Permission.DOCUMENT_READ);
    if ('error' in result) return result.error;
    const ctx = result.user;

    const { id: rawId } = await params;
    const idResult = validateIdParam(rawId);
    if (!idResult.success) return idResult.response;
    const id = idResult.id;

    // Verify org ownership — articles with projectId=null are visible to all orgs
    const nestedFilter = orgFilterNested(ctx, 'project');
    const orgWhere = Object.keys(nestedFilter).length > 0
      ? { OR: [nestedFilter, { projectId: null }] }
      : {};
    const existing = await db.knowledgeArticle.findFirst({ where: { id, ...orgWhere } });
    if (!existing) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 });
    }

    // Increment views on GET
    await db.knowledgeArticle.update({
      where: { id },
      data: { views: { increment: 1 } },
    });

    const article = await db.knowledgeArticle.findUnique({
      where: { id },
      include: {
        author: { select: { id: true, name: true, avatar: true } },
      },
    });

    if (!article) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 });
    }

    return NextResponse.json(article);
  } catch (error) {
    log.error("Error fetching knowledge article:", error);
    return NextResponse.json({ error: "Failed to fetch article" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const result = await requireVerifiedPermission(request, Permission.DOCUMENT_UPDATE);
    if ('error' in result) return result.error;
    const ctx = result.user;

    const { id: rawId } = await params;
    const idResult = validateIdParam(rawId);
    if (!idResult.success) return idResult.response;
    const id = idResult.id;

    // Verify org ownership before update — articles with projectId=null are visible to all orgs
    const nestedFilter = orgFilterNested(ctx, 'project');
    const orgWhere = Object.keys(nestedFilter).length > 0
      ? { OR: [nestedFilter, { projectId: null }] }
      : {};
    const existing = await db.knowledgeArticle.findFirst({ where: { id, ...orgWhere } });
    if (!existing) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 });
    }

    const body = await request.json();

    // Zod validation for knowledge article update fields
    const validation = validateRequest(knowledgeArticleUpdateSchema, body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error, errors: validation.errors }, { status: 400 });
    }
    const validatedData = validation.data;

    const article = await db.knowledgeArticle.update({
      where: { id },
      data: {
        ...(validatedData.title !== undefined && { title: validatedData.title }),
        ...(validatedData.content !== undefined && { content: validatedData.content }),
        ...(validatedData.category !== undefined && { category: validatedData.category }),
        ...(validatedData.tags !== undefined && { tags: validatedData.tags }),
        ...(validatedData.authorId !== undefined && { authorId: validatedData.authorId || null }),
      },
      include: {
        author: { select: { id: true, name: true, avatar: true } },
      },
    });

    return NextResponse.json(article);
  } catch (error) {
    log.error("Error updating knowledge article:", error);
    return NextResponse.json({ error: "Failed to update article" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const result = await requireVerifiedPermission(request, Permission.DOCUMENT_DELETE);
    if ('error' in result) return result.error;
    const ctx = result.user;

    const { id: rawId } = await params;
    const idResult = validateIdParam(rawId);
    if (!idResult.success) return idResult.response;
    const id = idResult.id;

    // Verify org ownership before delete — articles with projectId=null are visible to all orgs
    const nestedFilter = orgFilterNested(ctx, 'project');
    const orgWhere = Object.keys(nestedFilter).length > 0
      ? { OR: [nestedFilter, { projectId: null }] }
      : {};
    const existing = await db.knowledgeArticle.findFirst({ where: { id, ...orgWhere } });
    if (!existing) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 });
    }

    await db.knowledgeArticle.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    log.error("Error deleting knowledge article:", error);
    return NextResponse.json({ error: "Failed to delete article" }, { status: 500 });
  }
}
