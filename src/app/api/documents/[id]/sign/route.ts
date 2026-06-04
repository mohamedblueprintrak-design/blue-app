import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { requireVerifiedPermission, orgFilter } from "@/app/api/utils/auth";
import { log } from "@/lib/logger";
import { Permission } from "@/lib/auth/types";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // RBAC CHECK — require DOCUMENT_UPDATE permission
    const rbac = await requireVerifiedPermission(request, Permission.DOCUMENT_UPDATE);
    if ("error" in rbac) return rbac.error;
    const ctx = rbac.user;

    const { id: documentId } = await params;

    // Verify document exists and belongs to org
    const orgWhere = orgFilter(ctx);
    const document = await db.document.findFirst({
      where: { id: documentId, deletedAt: null, ...orgWhere },
    });

    if (!document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    // Parse body
    const body = await request.json();
    const { signatureDataUrl, signerName, signerRole } = body;

    // Validate
    if (!signatureDataUrl || typeof signatureDataUrl !== "string") {
      return NextResponse.json(
        { error: "Signature data is required" },
        { status: 400 }
      );
    }

    // Check that the signature is not just a blank canvas (minimal validation)
    // The data URL should be larger than a minimal blank PNG
    if (signatureDataUrl.length < 500) {
      return NextResponse.json(
        { error: "Signature appears to be empty. Please draw or type your signature." },
        { status: 400 }
      );
    }

    if (!signerName || typeof signerName !== "string" || !signerName.trim()) {
      return NextResponse.json(
        { error: "Signer name is required" },
        { status: 400 }
      );
    }

    // Extract IP and User-Agent
    const ipAddress =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      null;
    const userAgent = request.headers.get("user-agent") || null;

    // Create signature record
    const signature = await db.documentSignature.create({
      data: {
        documentId,
        userId: ctx.userId,
        signerName: signerName.trim(),
        signerRole: typeof signerRole === "string" ? signerRole.trim() : "",
        signatureImage: signatureDataUrl,
        ipAddress,
        userAgent,
        organizationId: ctx.organizationId,
      },
    });

    // Log the signing in ActivityLog
    await db.activityLog.create({
      data: {
        userId: ctx.userId,
        projectId: document.projectId,
        action: "sign",
        entityType: "document",
        entityId: documentId,
        details: `Document signed by ${signerName.trim()}`,
        metadata: JSON.stringify({
          signerRole: signerRole?.trim() || "",
          documentName: document.name,
        }),
        organizationId: ctx.organizationId,
      },
    });

    return NextResponse.json({
      success: true,
      signature: {
        id: signature.id,
        signerName: signature.signerName,
        signerRole: signature.signerRole,
        signedAt: signature.signedAt,
      },
    });
  } catch (error) {
    log.error("Error signing document:", error);
    return NextResponse.json(
      { error: "Failed to sign document" },
      { status: 500 }
    );
  }
}

// GET: List signatures for a document
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const rbac = await requireVerifiedPermission(request, Permission.DOCUMENT_READ);
    if ("error" in rbac) return rbac.error;
    const ctx = rbac.user;

    const { id: documentId } = await params;

    // Verify document exists and belongs to org
    const orgWhere = orgFilter(ctx);
    const document = await db.document.findFirst({
      where: { id: documentId, deletedAt: null, ...orgWhere },
    });

    if (!document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    const signatures = await db.documentSignature.findMany({
      where: { documentId },
      include: {
        user: { select: { id: true, name: true, email: true, avatar: true } },
      },
      orderBy: { signedAt: "desc" },
    });

    return NextResponse.json(signatures);
  } catch (error) {
    log.error("Error fetching document signatures:", error);
    return NextResponse.json(
      { error: "Failed to fetch signatures" },
      { status: 500 }
    );
  }
}
