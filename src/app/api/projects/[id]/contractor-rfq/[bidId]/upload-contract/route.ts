import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireVerifiedPermission, orgCheck } from '@/app/api/utils/auth';
import { Permission } from '@/lib/auth/types';
import { handleApiError } from '@/lib/api-error';
import { validateIdParam } from '@/lib/api-validation';

const ALLOWED_MIME_TYPES = ['application/pdf'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// POST /api/projects/[id]/contractor-rfq/[bidId]/upload-contract
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; bidId: string }> }
) {
  try {
    // AUTH CHECK
    const authResult = await requireVerifiedPermission(request, Permission.CONTRACT_UPDATE);
    if ('error' in authResult) return authResult.error;
    const ctx = authResult.user;

    const { bidId: rawBidId } = await params;
    const bidIdResult = validateIdParam(rawBidId);
    if (!bidIdResult.success) return bidIdResult.response;
    const bidId = bidIdResult.id;
    const formData = await request.formData();
    const contractFile = formData.get('contractFile') as File | null;

    if (!contractFile) {
      return NextResponse.json({ error: 'contractFile is required' }, { status: 400 });
    }

    // Validate file type
    if (!ALLOWED_MIME_TYPES.includes(contractFile.type)) {
      return NextResponse.json({ error: 'Only PDF files are allowed' }, { status: 400 });
    }

    // Validate file size
    if (contractFile.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File size exceeds 10MB limit' }, { status: 400 });
    }

    // Verify bid belongs to user's organization
    const existingBid = await db.bid.findUnique({
      where: { id: bidId },
      include: { project: { select: { organizationId: true } } },
    });
    if (!existingBid) {
      return NextResponse.json({ error: 'Bid not found' }, { status: 404 });
    }
    const orgError = orgCheck(ctx, { organizationId: existingBid.project.organizationId });
    if (orgError) return orgError;

    // Save file
    const bytes = await contractFile.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const fileName = `contracts/${bidId}_${Date.now()}.pdf`;
    const fs = await import('fs/promises');
    const path = await import('path');
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'contracts');
    await fs.mkdir(uploadDir, { recursive: true });
    await fs.writeFile(path.join(uploadDir, `${bidId}_${Date.now()}.pdf`), buffer);

    const bid = await db.bid.update({
      where: { id: bidId },
      data: {
        contractFile: `/uploads/${fileName}`,
        contractSignedAt: new Date(),
        isAwarded: true,
      },
    });

    // Optionally add to project documents
    if (existingBid.projectId) {
      await db.document.create({
        data: {
          projectId: existingBid.projectId,
          name: `عقد مقاول - ${bid.contractorName}`,
          fileType: 'PDF',
          fileSize: buffer.length,
          category: 'CONTRACT',
          filePath: `/uploads/${fileName}`,
        },
      });
    }

    return NextResponse.json(bid);
  } catch (error: unknown) {
    return handleApiError(error, 'ContractorRFQ UploadContract');
  }
}
