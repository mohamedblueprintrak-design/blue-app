import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { log } from '@/lib/logger';
import { Permission } from '@/lib/auth/types';
import { orgFilter, requireVerifiedPermission } from '../utils/auth';

export async function GET(request: NextRequest) {
  const rbac = await requireVerifiedPermission(request, Permission.CLIENT_READ);
  if ('error' in rbac) return rbac.error;
  const auth = rbac.user;

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const referrerId = searchParams.get("referrerId");

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (referrerId) where.referrerId = referrerId;

    const referrals = await db.referral.findMany({
      where: Object.keys(where).length > 0 ? { ...where, ...orgFilter(auth) } : orgFilter(auth),
      include: {
        referrer: { select: { id: true, name: true, email: true } },
        project: { select: { id: true, name: true, nameEn: true, number: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(referrals);
  } catch (error) {
    log.error("Error fetching referrals:", error);
    return NextResponse.json({ error: "Failed to fetch referrals" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const rbac = await requireVerifiedPermission(request, Permission.CLIENT_CREATE);
  if ('error' in rbac) return rbac.error;
  const _auth = rbac.user;

  try {
    const body = await request.json();
    const { referrerId, referredName, referredPhone, referredEmail, projectId, notes } = body;

    if (!referrerId) {
      return NextResponse.json({ error: "Referrer is required" }, { status: 400 });
    }

    const referral = await db.referral.create({
      data: {
        referrerId,
        referredName: referredName || "",
        referredPhone: referredPhone || "",
        referredEmail: referredEmail || "",
        projectId: projectId || null,
        notes: notes || "",
      },
      include: {
        referrer: { select: { id: true, name: true, email: true } },
        project: { select: { id: true, name: true, nameEn: true, number: true } },
      },
    });

    return NextResponse.json(referral, { status: 201 });
  } catch (error) {
    log.error("Error creating referral:", error);
    return NextResponse.json({ error: "Failed to create referral" }, { status: 500 });
  }
}
