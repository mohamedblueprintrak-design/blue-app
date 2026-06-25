import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { requireVerifiedPermission, orgFilter, orgCreate } from '@/app/api/utils/auth';
import { Permission } from '@/lib/auth/types';
import { log } from '@/lib/logger';
import { sanitizeObject } from '@/lib/security/sanitize';
import { getStorageProvider, generateStorageKey } from '@/lib/storage';
import { z } from 'zod';
import { withRateLimit, rateLimitResponse } from '@/lib/rate-limit-middleware';
import { parsePaginationParams, buildPaginationMeta, calculateSkip } from '@/app/api/utils/pagination';
import { verifyFileContent } from '@/lib/security/magic-bytes';

/**
 * @openapi
 * /api/documents:
 *   get:
 *     tags: [Documents]
 *     summary: List documents
 *     description: Retrieve a paginated list of documents scoped to the user's organization. Supports filtering by projectId, category, and type. Requires DOCUMENT_READ permission.
 *     parameters:
 *       - name: page
 *         in: query
 *         schema: { type: integer, minimum: 1, default: 1 }
 *       - name: limit
 *         in: query
 *         schema: { type: integer, minimum: 1, maximum: 100, default: 20 }
 *       - name: projectId
 *         in: query
 *         schema: { type: string }
 *       - name: category
 *         in: query
 *         schema: { type: string }
 *       - name: type
 *         in: query
 *         schema: { type: string }
 *     responses:
 *       200: { description: Paginated list of documents }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden — DOCUMENT_READ required }
 *   post:
 *     tags: [Documents]
 *     summary: Upload document
 *     description: Upload a new document (file or metadata-only). Requires DOCUMENT_CREATE permission. Files are validated by MIME type allowlist and size limit (50MB).
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file: { type: string, format: binary }
 *               name: { type: string }
 *               projectId: { type: string }
 *               category: { type: string }
 *     responses:
 *       201: { description: Document created }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden — DOCUMENT_CREATE required }
 *       413: { description: File too large }
 */

// Zod schema for JSON metadata-only document creation
const documentCreateSchema = z.object({
  name: z.string().min(1),
  type: z.string().optional(),
  category: z.string().optional(),
  projectId: z.string().optional(),
  description: z.string().optional(),
  fileSize: z.number().optional(),
  mimeType: z.string().optional(),
});

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
  // SVG removed — can contain embedded <script> tags (stored XSS vector).
  // If SVG support is needed, sanitize with DOMPurify on the server before storing.
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
  try {
    // RBAC CHECK
    const rbac = await requireVerifiedPermission(request, Permission.DOCUMENT_READ);
    if ('error' in rbac) return rbac.error;
    const ctx = rbac.user;

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");
    const category = searchParams.get("category");

    const { page, limit } = parsePaginationParams(searchParams);
    const skip = calculateSkip(page, limit);

    const where: Record<string, unknown> = { deletedAt: null, ...orgFilter(ctx) };
    if (projectId) where.projectId = projectId;
    if (category && category !== "all") where.category = category;

    const [documents, total] = await Promise.all([
      db.document.findMany({
        where,
        take: limit,
        skip,
        include: {
          project: { select: { id: true, name: true, nameEn: true, number: true } },
          contract: { select: { id: true, number: true, title: true } },
          uploader: { select: { id: true, name: true, avatar: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      db.document.count({ where }),
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
  try {
    // Rate limiting — file uploads are resource-intensive
    const { result } = await withRateLimit(request, 'strict');
    const blocked = rateLimitResponse(result);
    if (blocked) return blocked;

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

      // SECURITY: Verify file content via magic bytes — do NOT trust the
      // client-supplied Content-Type, which can be trivially spoofed.
      // An attacker could upload a PHP webshell with Content-Type: image/jpeg
      // and filename: evil.jpg — the extension/MIME checks above would pass
      // but the file is executable code. Magic-byte sniffing catches this.
      const contentError = verifyFileContent(buffer, fileContentType, fileName);
      if (contentError) {
        return NextResponse.json({ error: contentError }, { status: 400 });
      }

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
        // DocumentVersion model was deleted, so we just update the document in place

        // Update the existing document with the new file
        const updatedDocument = await db.document.update({
          where: { id: existingDoc.id },
          data: {
            version: oldVersion + 1,
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

        log.info('[Documents] New version uploaded (via duplicate name)', {
          documentId: existingDoc.id,
          oldVersion,
          newVersion: oldVersion + 1,
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
      const rawBody = await request.json();

      // Validate with Zod schema
      const validation = documentCreateSchema.safeParse(rawBody);
      if (!validation.success) {
        return NextResponse.json(
          { error: validation.error.issues[0].message },
          { status: 400 }
        );
      }
      const sanitizedBody = sanitizeObject(validation.data);
      const {
        projectId,
        category,
        name,
        type: fileType,
        fileSize,
      } = sanitizedBody;

      const document = await db.document.create({
        data: {
          projectId: projectId || null,
          contractId: (rawBody as Record<string, unknown>).contractId as string || null,
          name: name || "",
          fileType: fileType || "",
          fileSize: fileSize || 0,
          category: category || "general",
          version: ((rawBody as Record<string, unknown>).version as number) || 1,
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

      return NextResponse.json(document, { status: 201 });
    }
  } catch (error) {
    log.error("Error creating document:", error);
    return NextResponse.json({ error: "Failed to create document" }, { status: 500 });
  }
}
