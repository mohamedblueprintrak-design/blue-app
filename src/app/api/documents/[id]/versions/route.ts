import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { requirePermission, requireVerifiedPermission, orgFilter, orgCreate } from '@/app/api/utils/auth';
import { Permission } from '@/lib/auth/types';
import { log } from '@/lib/logger';
import { sanitizeObject } from '@/lib/security/sanitize';
import { getStorageProvider, generateStorageKey } from '@/lib/storage';
import { validateIdParam } from '@/lib/api-validation';

// ============================================
// Document Versions API
// GET: List all versions of a document
// POST: Upload a new version
// ============================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: rawId } = await params;
    const idCheck = validateIdParam(rawId);
    if (!idCheck.success) return idCheck.response;
    const id = idCheck.id;

    // RBAC CHECK
    const rbac = requirePermission(request, Permission.DOCUMENT_READ);
    if ('error' in rbac) return rbac.error;
    const ctx = rbac.user;

    // Verify document exists
    const document = await db.document.findFirst({
      where: { id, deletedAt: null, ...orgFilter(ctx) },
      select: { id: true, name: true, version: true },
    });

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    // Fetch all versions
    const versions = await db.documentVersion.findMany({
      where: { documentId: id },
      include: {
        uploadedBy: { select: { id: true, name: true, avatar: true } },
      },
      orderBy: { version: "desc" },
    });

    // Build response with current version info
    const response = {
      documentId: document.id,
      documentName: document.name,
      currentVersion: document.version,
      versions: versions.map((v) => ({
        id: v.id,
        version: v.version,
        fileName: v.fileName,
        fileSize: v.fileSize,
        mimeType: v.mimeType,
        changeSummary: v.changeSummary,
        uploadedBy: v.uploadedBy,
        createdAt: v.createdAt,
        isCurrent: v.version === document.version,
      })),
    };

    return NextResponse.json(response);
  } catch (error) {
    log.error("Error fetching document versions:", error);
    return NextResponse.json({ error: "Failed to fetch document versions" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: rawId } = await params;
    const idCheck = validateIdParam(rawId);
    if (!idCheck.success) return idCheck.response;
    const id = idCheck.id;

    // RBAC CHECK - need DOCUMENT_UPDATE permission to upload new version
    const rbac = await requireVerifiedPermission(request, Permission.DOCUMENT_UPDATE);
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

    const contentType = request.headers.get('content-type') || '';

    let newFilePath = "";
    let newFileName = document.name;
    let newFileSize = 0;
    let newMimeType = "";
    let changeSummary: string | null = null;

    if (contentType.includes('multipart/form-data')) {
      // ===== Multipart File Upload =====
      const formData = await request.formData();
      const file = formData.get('file') as File | null;

      if (!file) {
        return NextResponse.json({ error: "No file provided" }, { status: 400 });
      }

      newFileName = (formData.get('name') as string) || file.name;
      newFileSize = file.size;
      newMimeType = file.type || 'application/octet-stream';
      changeSummary = (formData.get('changeSummary') as string) || null;

      // Generate storage key and upload
      const storageKey = generateStorageKey(file.name);
      const storage = getStorageProvider();
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      newFilePath = await storage.upload(storageKey, buffer, newMimeType);
    } else {
      // ===== JSON body =====
      const body = await request.json();
      const sanitizedBody = sanitizeObject(body);
      newFilePath = sanitizedBody.filePath || document.filePath;
      newFileName = sanitizedBody.name || document.name;
      newFileSize = sanitizedBody.fileSize || document.fileSize;
      newMimeType = sanitizedBody.mimeType || "";
      changeSummary = sanitizedBody.changeSummary || null;
    }

    const oldVersion = document.version;
    const newVersion = oldVersion + 1;

    // Create a version record for the old version
    await db.documentVersion.create({
      data: {
        documentId: id,
        version: oldVersion,
        fileName: document.name,
        filePath: document.filePath,
        fileSize: typeof document.fileSize === 'number' ? document.fileSize : 0,
        mimeType: "",
        changeSummary: changeSummary ? `Previous version (v${oldVersion})` : null,
        uploadedById: ctx.userId,
        ...orgCreate(ctx),
      },
    });

    // Update the document with new version info
    const ext = newFileName.toLowerCase().substring(newFileName.lastIndexOf('.') + 1);
    const updatedDocument = await db.document.update({
      where: { id },
      data: {
        version: newVersion,
        name: newFileName,
        filePath: newFilePath,
        fileType: ext || document.fileType,
        fileSize: newFileSize,
        uploadedById: ctx.userId,
      },
      include: {
        project: { select: { id: true, name: true, nameEn: true, number: true } },
        contract: { select: { id: true, number: true, title: true } },
        uploader: { select: { id: true, name: true, avatar: true } },
      },
    });

    log.info('[DocumentVersions] New version uploaded', {
      documentId: id,
      oldVersion,
      newVersion,
      changeSummary,
      userId: ctx.userId,
    });

    return NextResponse.json({
      message: "New version uploaded successfully",
      document: updatedDocument,
      previousVersion: oldVersion,
      currentVersion: newVersion,
    }, { status: 201 });
  } catch (error) {
    log.error("Error uploading document version:", error);
    return NextResponse.json({ error: "Failed to upload document version" }, { status: 500 });
  }
}
