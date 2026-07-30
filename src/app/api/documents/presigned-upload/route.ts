/**
 * @openapi
 * /api/documents/presigned-upload:
 *   post:
 *     summary: Generate a presigned S3 / MinIO upload URL for large files
 *     tags:
 *       - Documents
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fileName
 *               - contentType
 *               - fileSize
 *             properties:
 *               fileName:
 *                 type: string
 *               contentType:
 *                 type: string
 *               fileSize:
 *                 type: number
 *               projectId:
 *                 type: string
 *               category:
 *                 type: string
 *     responses:
 *       200:
 *         description: Presigned upload URL generated successfully
 *       400:
 *         description: Invalid input or S3 storage not configured
 *       401:
 *         description: Unauthorized
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireVerifiedPermission, orgCreate } from '@/app/api/utils/auth';
import { Permission } from '@/lib/auth/types';
import { getStorageProvider, generateStorageKey } from '@/lib/storage';
import { db } from '@/lib/db';
import { log } from '@/lib/logger';
import { z } from 'zod';

const presignedSchema = z.object({
  fileName: z.string().min(1).max(300),
  contentType: z.string().min(1).max(100),
  fileSize: z.number().positive().max(500 * 1024 * 1024), // 500MB
  projectId: z.string().optional(),
  category: z.string().optional().default('general'),
});

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireVerifiedPermission(request, Permission.DOCUMENT_CREATE);
    if ('error' in authResult) return authResult.error;
    const ctx = authResult.user;

    const body = await request.json();
    const validation = presignedSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error.issues[0].message }, { status: 400 });
    }

    const { fileName, contentType, fileSize, projectId, category } = validation.data;

    const storage = getStorageProvider();
    if (!storage.getSignedUploadUrl) {
      return NextResponse.json(
        { error: 'Direct S3 presigned uploads require S3/MinIO storage provider configuration (STORAGE_TYPE=s3).' },
        { status: 400 }
      );
    }

    const key = generateStorageKey(fileName);
    const uploadUrl = await storage.getSignedUploadUrl(key, contentType, 900); // 15-min validity

    // Determine extension
    const ext = fileName.toLowerCase().substring(fileName.lastIndexOf('.') + 1);

    // Register metadata record in DB before client upload
    const document = await db.document.create({
      data: {
        name: fileName,
        filePath: key,
        fileSize,
        fileType: ext,
        category,
        version: 1,
        uploadedById: ctx.userId,
        projectId: projectId || null,
        ...orgCreate(ctx),
      },
    });

    log.info('[Presigned S3 Upload] Presigned URL and DB record generated', {
      documentId: document.id,
      fileName,
      fileSize,
      key,
    });

    return NextResponse.json({
      success: true,
      documentId: document.id,
      uploadUrl,
      key,
      expiresIn: 900,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log.error('[Presigned S3 Upload] Failed to generate presigned upload URL:', error);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
