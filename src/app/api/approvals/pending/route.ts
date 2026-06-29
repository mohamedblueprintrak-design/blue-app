import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { log } from '@/lib/logger';
import { requireVerifiedPermission, orgFilter } from '@/app/api/utils/auth';
import { Permission } from '@/lib/auth/types';

// GET: Return pending approvals count
export async function GET(request: NextRequest) {
  try {
    // RBAC CHECK
    const rbac = await requireVerifiedPermission(request, Permission.PROJECT_READ);
    if ('error' in rbac) return rbac.error;
    const user = rbac.user;

    const count = await db.approval.count({
      where: {
        status: 'PENDING',
        ...orgFilter(user),
      },
    });
    return NextResponse.json({ count });
  } catch (error) {
    log.error('Error fetching pending approvals count:', error);
    return NextResponse.json({ error: 'Failed to fetch pending approvals' }, { status: 500 });
  }
}
