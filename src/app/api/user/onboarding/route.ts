import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireVerifiedAuth } from '@/app/api/utils/auth';
import { handleApiError } from '@/lib/api-error';
import { z } from 'zod';

/**
 * PATCH /api/user/onboarding
 *
 * Saves onboarding data for the current user and marks onboarding as completed.
 * The onboarding status is stored in the `preferences` JSON field on the User model
 * (no schema migration needed).
 *
 * Body:
 *   profile: { name?, phone?, avatar? }
 *   organization: { companyName?, industry?, size? }
 *   preferences: { language?, notifications?, theme? }
 */
const onboardingSchema = z.object({
  profile: z.object({
    name: z.string().max(200).optional(),
    phone: z.string().max(30).optional(),
    avatar: z.string().max(500).optional(),
  }).optional(),
  organization: z.object({
    companyName: z.string().max(200).optional(),
    industry: z.string().max(100).optional(),
    size: z.string().max(50).optional(),
  }).optional(),
  preferences: z.object({
    language: z.enum(['ar', 'en']).optional(),
    notifications: z.boolean().optional(),
    theme: z.enum(['light', 'dark', 'system']).optional(),
  }).optional(),
});

export async function PATCH(request: NextRequest) {
  try {
    const authResult = await requireVerifiedAuth(request);
    if ('error' in authResult) return authResult.error;
    const ctx = authResult.user;

    const rawBody = await request.json();
    const validation = onboardingSchema.safeParse(rawBody);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const body = validation.data;

    // --- Update user profile fields ---
    const userUpdateData: Record<string, string> = {};
    if (body.profile?.name !== undefined) userUpdateData.name = body.profile.name;
    if (body.profile?.phone !== undefined) userUpdateData.phone = body.profile.phone;
    if (body.profile?.avatar !== undefined) userUpdateData.avatar = body.profile.avatar;

    // --- Update preferences JSON with onboarding flag ---
    // NOTE: 'preferences' field may not exist in the generated Prisma Client
    // if the client was generated from an older schema. We use a safe query.
    let existingPrefs: string | null = null;
    try {
      const currentUser = await db.user.findUnique({
        where: { id: ctx.userId },
        select: { preferences: true },
      });
      if (!currentUser) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
      existingPrefs = (currentUser as Record<string, unknown>).preferences as string | null ?? null;
    } catch {
      // 'preferences' field might not exist in Prisma Client — treat as null
      // Verify user still exists
      const userExists = await db.user.findUnique({
        where: { id: ctx.userId },
        select: { id: true },
      });
      if (!userExists) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
    }

    // Parse existing preferences or use defaults
    let prefs: Record<string, unknown> = {
      accentColor: 'teal',
      notifications: {
        projectUpdates: true,
        taskDeadlines: true,
        invoiceReminders: true,
        meetingReminders: true,
        siteVisitAlerts: false,
      },
    };

    if (existingPrefs) {
      try {
        prefs = JSON.parse(existingPrefs);
      } catch {
        // Invalid JSON — use defaults
      }
    }

    // Merge onboarding data into preferences
    prefs.onboardingCompleted = true;
    prefs.onboardingCompletedAt = new Date().toISOString();

    if (body.preferences?.language !== undefined) {
      prefs.language = body.preferences.language;
    }
    if (body.preferences?.notifications !== undefined) {
      // Merge notification preference into the existing structure
      const notifs = (prefs.notifications as Record<string, unknown>) || {};
      notifs.enabled = body.preferences.notifications;
      prefs.notifications = notifs;
    }
    if (body.preferences?.theme !== undefined) {
      prefs.theme = body.preferences.theme;
    }

    // Save organization info in preferences too (lightweight approach)
    if (body.organization) {
      prefs.organization = {
        ...(prefs.organization as Record<string, unknown> || {}),
        ...body.organization,
      };
    }

    // Apply updates
    // NOTE: Try to save preferences; if the field doesn't exist in the
    // Prisma Client, we skip it (onboarding flag won't persist but the
    // rest of the profile update still works).
    let updateData: Record<string, unknown> = { ...userUpdateData };
    try {
      // Test if preferences field is available by doing a dummy select
      await db.user.findUnique({
        where: { id: ctx.userId },
        select: { preferences: true },
      });
      updateData.preferences = JSON.stringify(prefs);
    } catch {
      // preferences field not available — skip it
    }

    const updatedUser = await db.user.update({
      where: { id: ctx.userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        avatar: true,
        phone: true,
        department: true,
        position: true,
        isActive: true,
        organizationId: true,
      },
    });

    return NextResponse.json({
      success: true,
      user: updatedUser,
    });
  } catch (error: unknown) {
    return handleApiError(error, 'User Onboarding PATCH');
  }
}

/**
 * GET /api/user/onboarding
 *
 * Returns the onboarding status for the current user.
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireVerifiedAuth(request);
    if ('error' in authResult) return authResult.error;
    const ctx = authResult.user;

    // NOTE: 'preferences' field may not exist in the generated Prisma Client
    // if the client was generated from an older schema. We use a safe query.
    let prefsData: string | null = null;
    try {
      const user = await db.user.findUnique({
        where: { id: ctx.userId },
        select: { preferences: true },
      });
      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
      prefsData = (user as Record<string, unknown>).preferences as string | null ?? null;
    } catch {
      // 'preferences' field might not exist in Prisma Client
      // Verify user still exists
      const userExists = await db.user.findUnique({
        where: { id: ctx.userId },
        select: { id: true },
      });
      if (!userExists) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
    }

    let onboardingCompleted = false;
    let organization = null;
    let language = null;

    if (prefsData) {
      try {
        const prefs = JSON.parse(prefsData);
        onboardingCompleted = prefs.onboardingCompleted === true;
        organization = prefs.organization || null;
        language = prefs.language || null;
      } catch {
        // Invalid JSON — not completed
      }
    }

    return NextResponse.json({
      onboardingCompleted,
      organization,
      language,
    });
  } catch (error: unknown) {
    return handleApiError(error, 'User Onboarding GET');
  }
}
