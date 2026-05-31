import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { requireVerifiedPermission, orgFilterNested } from '@/app/api/utils/auth';
import { Permission } from '@/lib/auth/types';
import { log } from '@/lib/logger';
import { validateIdParam } from '@/lib/api-validation';
import { getStorageProvider } from '@/lib/storage';

/**
 * GET /api/documents/[id]/download
 *
 * Download a document file from storage.
 * Authenticates the request, looks up the document, and streams
 * the file from the configured storage provider.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // RBAC CHECK
    const rbac = await requireVerifiedPermission(request, Permission.DOCUMENT_READ);
    if ('error' in rbac) return rbac.error;
    const ctx = rbac.user;

    const { id: rawId } = await params;
    const idResult = validateIdParam(rawId);
    if (!idResult.success) return idResult.response;
    const id = idResult.id;

    // Fetch the document record
    const orgWhere = orgFilterNested(ctx, 'project');

    const document = await db.document.findFirst({
      where: { id, ...orgWhere },
    });

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    if (!document.filePath) {
      return NextResponse.json({ error: "No file associated with this document" }, { status: 404 });
    }

    // Download the file from storage
    const storage = getStorageProvider();

    try {
      const fileBuffer = await storage.download(document.filePath);

      // Determine content type from file extension
      const contentType = getContentType(document.fileType ?? '');

      // Generate a safe filename for the Content-Disposition header
      const safeFilename = (document.name || 'document')
        .replace(/[/\\?%*:|"<>]/g, '-')
        .replace(/\s+/g, '_');

      // Return the file with appropriate headers
      return new NextResponse(new Uint8Array(fileBuffer), {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'Content-Disposition': `attachment; filename="${safeFilename}.${document.fileType}"`,
          'Content-Length': fileBuffer.length.toString(),
          'Cache-Control': 'private, max-age=3600',
        },
      });
    } catch (storageError) {
      log.error('[DocumentDownload] File not found in storage:', storageError, {
        documentId: id,
        filePath: document.filePath,
      });
      return NextResponse.json(
        { error: "File not found in storage. It may have been deleted." },
        { status: 404 }
      );
    }
  } catch (error) {
    log.error("Error downloading document:", error);
    return NextResponse.json({ error: "Failed to download document" }, { status: 500 });
  }
}

/**
 * Map file extension to MIME content type
 */
function getContentType(fileType: string): string {
  const mimeTypes: Record<string, string> = {
    pdf: 'application/pdf',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    svg: 'image/svg+xml',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ppt: 'application/vnd.ms-powerpoint',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    txt: 'text/plain',
    csv: 'text/csv',
    zip: 'application/zip',
    rar: 'application/x-rar-compressed',
    dwg: 'application/dwg',
    dxf: 'application/dxf',
    tiff: 'image/tiff',
    tif: 'image/tiff',
  };

  return mimeTypes[fileType.toLowerCase()] || 'application/octet-stream';
}
