import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { validateRequest, contractorCreateSchema } from '@/lib/api-validation';
import { requireVerifiedPermission, orgFilter, orgCreate } from '@/app/api/utils/auth';
import { Permission } from '@/lib/auth/types';
import { log } from '@/lib/logger';
import { encrypt, decrypt } from '@/lib/auth/token-utils';

export async function GET(request: NextRequest) {
  try {
    // RBAC CHECK
    const rbac = await requireVerifiedPermission(request, Permission.CONTRACTOR_READ);
    if ('error' in rbac) return rbac.error;
    const ctx = rbac.user;

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const category = searchParams.get("category");
    const projectId = searchParams.get("projectId");

    const where: Record<string, unknown> = { ...orgFilter(ctx) };

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { nameEn: { contains: search } },
        { companyName: { contains: search } },
        { companyEn: { contains: search } },
        { contactPerson: { contains: search } },
        { crNumber: { contains: search } },
        { licenseNumber: { contains: search } },
      ];
    }

    if (category) {
      where.category = category;
    }

    // If projectId is provided, only return contractors who have bids on that project
    if (projectId) {
      where.bids = {
        some: { projectId },
      };
    }

    const contractors = await db.contractor.findMany({
      where: Object.keys(where).length > 0 ? where : undefined,
      include: {
        _count: {
          select: {
            bids: true,
            evaluations: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(contractors.map(c => {
      // Decrypt sensitive financial fields before sending to client
      try {
        return {
          ...c,
          bankAccount: c.bankAccount ? decrypt(c.bankAccount) : '',
          iban: c.iban ? decrypt(c.iban) : '',
        };
      } catch {
        // Legacy: data might be stored in plaintext from before encryption
        log.warn('[Contractor] Failed to decrypt financial data — returning masked', { contractorId: c.id });
        return {
          ...c,
          bankAccount: c.bankAccount ? '••••••••' : '',
          iban: c.iban ? '••••••••' : '',
        };
      }
    }));
  } catch (error) {
    log.error("Error fetching contractors:", error);
    return NextResponse.json(
      { error: "Failed to fetch contractors" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // RBAC CHECK
    const rbac = await requireVerifiedPermission(request, Permission.CONTRACTOR_CREATE);
    if ('error' in rbac) return rbac.error;
    const ctx = rbac.user;

    const body = await request.json();

    const validation = validateRequest(contractorCreateSchema, body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error, errors: validation.errors }, { status: 400 });
    }

    const {
      name,
      nameEn,
      companyName,
      companyEn,
      contactPerson,
      phone,
      email,
      address,
      crNumber,
      licenseNumber,
      licenseExpiry,
      category,
      rating,
      specialties,
      experience,
      bankName,
      bankAccount,
      iban,
      isActive,
      notes,
    } = body;

    const contractor = await db.contractor.create({
      data: {
        name: name || "",
        nameEn: nameEn || "",
        companyName: companyName || "",
        companyEn: companyEn || "",
        contactPerson: contactPerson || "",
        phone: phone || "",
        email: email || "",
        address: address || "",
        crNumber: crNumber || "",
        licenseNumber: licenseNumber || "",
        licenseExpiry: licenseExpiry ? new Date(licenseExpiry) : null,
        category: category || "",
        rating: rating !== undefined ? parseInt(String(rating), 10) : 0,
        specialties: specialties || "",
        experience: experience || "",
        bankName: bankName || "",
        bankAccount: bankAccount ? encrypt(bankAccount) : "",
        iban: iban ? encrypt(iban) : "",
        isActive: isActive !== undefined ? Boolean(isActive) : true,
        notes: notes || "",
        ...orgCreate(ctx),
      },
      include: {
        _count: {
          select: {
            bids: true,
            evaluations: true,
          },
        },
      },
    });

    return NextResponse.json(contractor, { status: 201 });
  } catch (error) {
    log.error("Error creating contractor:", error);
    return NextResponse.json(
      { error: "Failed to create contractor" },
      { status: 500 }
    );
  }
}
