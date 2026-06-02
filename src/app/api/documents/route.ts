import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { requireVerifiedPermission, orgFilter, orgCreate } from '@/app/api/utils/auth';
import { Permission } from '@/lib/auth/types';
import { log } from '@/lib/logger';
import { sanitizeObject } from '@/lib/security/sanitize';
import { getStorageProvider, generateStorageKey } from '@/lib/storage';
import { withRateLimit, rateLimitResponse } from '@/lib/rate-limit-middleware';
import { invalidateCache } from '@/lib/cache/query-cache';
import { parsePaginationParams, buildPaginationMeta, calculateSkip } from '../utils/pagination';
import { insensitiveContains } from '../utils/db';

// ============================================
// File Upload Configuration
// ============================================

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

const ALLOWED_FILE_TYPES: Record<string, string[]> = {
  'application/pdf': ['.pdf'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/gif': ['.gif'],
  'image/webp': ['.webp'],
  'image/svg+xml': ['.svg'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/vnd.ms-excel': ['.xls'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'application/vnd.ms-powerpoint': ['.ppt'],
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
  'text/plain': ['.txt'],
  'text/csv': ['.csv'],
  'application/zip': ['.zip'],
  'application/x-rar-compressed': ['.rar'],
  'application/dwg': ['.dwg'],
  'application/dxf': ['.dxf'],
  'image/tiff': ['.tiff', '.tif'],
};

const ALLOWED_EXTENSIONS = new Set(
  Object.values(ALLOWED_FILE_TYPES).flat()
);

/**
 * Validate file type and size
 */
function validateFile(filename: string, contentType: string, fileSize: number): string | null {
  // Check file size
  if (fileSize > MAX_FILE_SIZE) {
    return `File size exceeds maximum allowed size of ${MAX_FILE_SIZE / 1024 / 1024}MB`;
  }

  // Check file extension
  const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return `File type "${ext}" is not allowed. Allowed types: ${Array.from(ALLOWED_EXTENSIONS).join(', ')}`;
  }

  // Check content type if provided
  if (contentType && ALLOWED_FILE_TYPES[contentType]) {
    const allowedExts = ALLOWED_FILE_TYPES[contentType];
    if (!allowedExts.includes(ext)) {
      return `File extension "${ext}" does not match content type "${contentType}"`;
    }
  }

  return null;
}

export async function GET(request: NextRequest) {
  const { allowed: _allowed, result: rlResult } = await withRateLimit(request, 'api');
  const rlBlocked = rateLimitResponse(rlResult);
  if (rlBlocked) return rlBlocked;

  try {
    // RBAC CHECK
    const rbac = await requireVerifiedPermission(request, Permission.DOCUMENT_READ);
    if ('error' in rbac) return rbac.error;
    const ctx = rbac.user;

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");
    const category = searchParams.get("category");
    const { page, limit, search } = parsePaginationParams(searchParams);

    const where: Record<string, unknown> = { deletedAt: null, ...orgFilter(ctx) };
    if (projectId) where.projectId = projectId;
    if (category && category !== "all") where.category = category;
    if (search) {
      where.OR = [
        { name: insensitiveContains(search) },
        { category: insensitiveContains(search) },
        { project: { name: insensitiveContains(search) } },
      ];
    }

    const [total, documents] = await Promise.all([
      db.document.count({ where }),
      db.document.findMany({
        where,
        take: limit,
        skip: calculateSkip(page, limit),
        include: {
          project: { select: { id: true, name: true, nameEn: true, number: true } },
          contract: { select: { id: true, number: true, title: true } },
          uploader: { select: { id: true, name: true, avatar: true } },
        },
        orderBy: { createdAt: "desc" },
      })
    ]);

    return NextResponse.json({
      data: documents,
      pagination: buildPaginationMeta(page, limit, total),
    });
  } catch (error) {
    log.error("Error fetching documents:", error);
    return NextResponse.json({ error: "Failed to fetch documents" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const { allowed: _allowed, result } = await withRateLimit(request, 'api');
  const blocked = rateLimitResponse(result);
  if (blocked) return blocked;

  try {
    // RBAC CHECK
    const rbac = await requireVerifiedPermission(request, Permission.DOCUMENT_CREATE);
    if ('error' in rbac) return rbac.error;
    const ctx = rbac.user;

    // Check Content-Type to determine if this is a multipart upload or JSON
    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      // ===== Multipart File Upload =====
      const formData = await request.formData();
      const file = formData.get('file') as File | null;

      if (!file) {
        return NextResponse.json({ error: "No file provided" }, { status: 400 });
      }

      const fileName = file.name;
      const fileSize = file.size;
      const fileContentType = file.type || 'application/octet-stream';

      // Validate file
      const validationError = validateFile(fileName, fileContentType, fileSize);
      if (validationError) {
        return NextResponse.json({ error: validationError }, { status: 400 });
      }

      // Get metadata from form fields
      const projectId = (formData.get('projectId') as string) || null;
      const contractId = (formData.get('contractId') as string) || null;
      const category = (formData.get('category') as string) || 'general';
      const version = parseInt(formData.get('version') as string) || 1;
      const name = (formData.get('name') as string) || fileName;
      const changeSummary = (formData.get('changeSummary') as string) || null;

      // Generate storage key and upload
      const storageKey = generateStorageKey(fileName);
      const storage = getStorageProvider();

      // Convert File to Buffer
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const filePath = await storage.upload(storageKey, buffer, fileContentType);

      // Determine file type from extension
      const ext = fileName.toLowerCase().substring(fileName.lastIndexOf('.') + 1);

      // Check if a document with the same name already exists (for versioning)
      const existingDoc = await db.document.findFirst({
        where: {
          name,
          deletedAt: null,
          ...orgFilter(ctx),
          ...(projectId ? { projectId } : {}),
        },
        select: { id: true, version: true, filePath: true, fileType: true, fileSize: true, name: true },
      });

      if (existingDoc) {
        // Archive the current version as a DocumentVersion record
        const oldVersion = existingDoc.version;
        const newVersion = oldVersion + 1;

        await db.documentVersion.create({
          data: {
            documentId: existingDoc.id,
            version: oldVersion,
            fileName: existingDoc.name,
            filePath: existingDoc.filePath,
            fileSize: typeof existingDoc.fileSize === 'number' ? existingDoc.fileSize : 0,
            mimeType: fileContentType,
            changeSummary: changeSummary || `Archived version ${oldVersion}`,
            uploadedById: ctx.userId,
            ...orgCreate(ctx),
          },
        });

        // Update the existing document with the new file
        const updatedDocument = await db.document.update({
          where: { id: existingDoc.id },
          data: {
            version: newVersion,
            fileType: ext,
            fileSize,
            filePath,
            uploadedById: ctx.userId,
            ...(projectId ? { projectId } : {}),
            ...(contractId ? { contractId } : {}),
            category,
          },
          include: {
            project: { select: { id: true, name: true, nameEn: true, number: true } },
            contract: { select: { id: true, number: true, title: true } },
            uploader: { select: { id: true, name: true, avatar: true } },
          },
        });

        await invalidateCache('documents');
        log.info('[Documents] New version uploaded (via duplicate name)', {
          documentId: existingDoc.id,
          oldVersion,
          newVersion,
          fileName: name,
          changeSummary,
        });

        return NextResponse.json(updatedDocument, { status: 200 });
      }

      // Create document record
      const document = await db.document.create({
        data: {
          projectId: projectId || null,
          contractId: contractId || null,
          name,
          fileType: ext,
          fileSize,
          category,
          version,
          uploadedById: ctx.userId,
          filePath,
          ...orgCreate(ctx),
        },
        include: {
          project: { select: { id: true, name: true, nameEn: true, number: true } },
          contract: { select: { id: true, number: true, title: true } },
          uploader: { select: { id: true, name: true, avatar: true } },
        },
      });

      await invalidateCache('documents');
      log.info('[Documents] File uploaded successfully', {
        documentId: document.id,
        fileName,
        fileSize,
        storageKey: filePath,
        storageType: process.env.STORAGE_TYPE || 'local',
      });

      return NextResponse.json(document, { status: 201 });
    } else {
      // ===== JSON Metadata-Only Creation (backward compatible) =====
      const body = await request.json();
      const sanitizedBody = sanitizeObject(body);
      const {
        projectId,
        contractId,
        name,
        fileType,
        fileSize,
        category,
        version,
      } = sanitizedBody;

      if (!name) {
        return NextResponse.json({ error: "Document name is required" }, { status: 400 });
      }

      const document = await db.document.create({
        data: {
          projectId: projectId || null,
          contractId: contractId || null,
          name: name || "",
          fileType: fileType || "",
          fileSize: fileSize || 0,
          category: category || "general",
          version: version || 1,
          uploadedById: ctx.userId,
          ...orgCreate(ctx),
          filePath: "",
        },
        include: {
          project: { select: { id: true, name: true, nameEn: true, number: true } },
          contract: { select: { id: true, number: true, title: true } },
          uploader: { select: { id: true, name: true, avatar: true } },
        },
      });

      await invalidateCache('documents');
      return NextResponse.json(document, { status: 201 });
    }
  } catch (error) {
    log.error("Error creating document:", error);
    return NextResponse.json({ error: "Failed to create document" }, { status: 500 });
  }
}
