import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { requirePermission, orgFilter } from '@/app/api/utils/auth';
import { Permission } from '@/lib/auth/types';
import { log } from '@/lib/logger';

// ============================================
// Download a specific version of a document
// GET: /api/documents/[id]/versions/[version]
// ============================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; version: string }> }
) {
  try {
    const { id, version: versionStr } = await params;
    const version = parseInt(versionStr, 10);

    if (isNaN(version)) {
      return NextResponse.json({ error: "Invalid version number" }, { status: 400 });
    }

    // RBAC CHECK
    const rbac = requirePermission(request, Permission.DOCUMENT_READ);
    if ('error' in rbac) return rbac.error;
    const ctx = rbac.user;

    // Verify document exists
    const document = await db.document.findFirst({
      where: { id, deletedAt: null, ...orgFilter(ctx) },
      select: { id: true, name: true, version: true, filePath: true, fileType: true, fileSize: true },
    });

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    // If requesting the current version, redirect to the document itself
    if (version === document.version) {
      // Return current version metadata
      return NextResponse.json({
        id: document.id,
        version: document.version,
        fileName: document.name,
        filePath: document.filePath,
        fileSize: document.fileSize,
        mimeType: "",
        isCurrent: true,
        downloadUrl: document.filePath,
      });
    }

    // Fetch the specific version
    const docVersion = await db.documentVersion.findFirst({
      where: { documentId: id, version },
      include: {
        uploadedBy: { select: { id: true, name: true } },
      },
    });

    if (!docVersion) {
      return NextResponse.json({ error: "Version not found" }, { status: 404 });
    }

    // Set proper Content-Disposition header for download
    const encodedFileName = encodeURIComponent(docVersion.fileName);
    const headers: Record<string, string> = {
      "Content-Disposition": `attachment; filename="${encodedFileName}"; filename*=UTF-8''${encodedFileName}`,
    };

    if (docVersion.mimeType) {
      headers["Content-Type"] = docVersion.mimeType;
    }

    return NextResponse.json({
      id: docVersion.id,
      version: docVersion.version,
      fileName: docVersion.fileName,
      filePath: docVersion.filePath,
      fileSize: docVersion.fileSize,
      mimeType: docVersion.mimeType,
      changeSummary: docVersion.changeSummary,
      uploadedBy: docVersion.uploadedBy,
      createdAt: docVersion.createdAt,
      isCurrent: false,
      downloadUrl: docVersion.filePath,
    }, { headers });
  } catch (error) {
    log.error("Error fetching document version:", error);
    return NextResponse.json({ error: "Failed to fetch document version" }, { status: 500 });
  }
}
