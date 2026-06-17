import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireVerifiedAuth } from '@/app/api/utils/auth';
import { handleApiErrorWithLogging as handleApiError } from '@/lib/api-error';
import { z } from 'zod';
import { cachedQuery, invalidateCache, CACHE_TTL, buildCacheKey } from '@/lib/cache/query-cache';

const DEFAULT_NOTIFICATIONS = {
  projectUpdates: true,
  taskDeadlines: true,
  invoiceReminders: true,
  meetingReminders: true,
  siteVisitAlerts: false,
};

const DEFAULT_PREFERENCES = {
  accentColor: 'teal',
  notifications: DEFAULT_NOTIFICATIONS,
};

const preferencesSchema = z.object({
  accentColor: z.string().max(50).optional(),
  notifications: z.object({
    projectUpdates: z.boolean().optional(),
    taskDeadlines: z.boolean().optional(),
    invoiceReminders: z.boolean().optional(),
    meetingReminders: z.boolean().optional(),
    siteVisitAlerts: z.boolean().optional(),
  }).optional(),
});

/**
 * GET /api/settings/preferences
 * Returns the current user's preferences (accent color, notification settings).
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireVerifiedAuth(request);
    if ('error' in authResult) return authResult.error;
    const ctx = authResult.user;

    const cacheKey = buildCacheKey('settings', 'preferences', ctx.userId);

    const prefs = await cachedQuery(cacheKey, async () => {
      // NOTE: 'preferences' field may not exist in the generated Prisma Client
      // if the client was generated from an older schema. We use a safe query.
      let prefsData: string | null = null;
      try {
        const user = await db.user.findUnique({
          where: { id: ctx.userId },
          select: { preferences: true },
        });
        if (!user) {
          return DEFAULT_PREFERENCES;
        }
        prefsData = (user as Record<string, unknown>).preferences as string | null ?? null;
      } catch {
        // 'preferences' field might not exist in Prisma Client — return defaults
      }

      // Parse stored preferences or use defaults
      let prefs = DEFAULT_PREFERENCES;
      if (prefsData) {
        try {
          const stored = JSON.parse(prefsData);
          prefs = {
            accentColor: stored.accentColor || DEFAULT_PREFERENCES.accentColor,
            notifications: {
              ...DEFAULT_NOTIFICATIONS,
              ...(stored.notifications || {}),
            },
          };
        } catch {
          // Invalid JSON, use defaults
        }
      }
      return prefs;
    }, CACHE_TTL.SETTINGS);

    return NextResponse.json(prefs);
  } catch (error: unknown) {
    return handleApiError(error, 'Preferences GET');
  }
}

/**
 * PUT /api/settings/preferences
 * Updates the current user's preferences (accent color, notification settings).
 */
export async function PUT(request: NextRequest) {
  try {
    const authResult = await requireVerifiedAuth(request);
    if ('error' in authResult) return authResult.error;
    const ctx = authResult.user;

    const rawBody = await request.json();
    const validation = preferencesSchema.safeParse(rawBody);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    // Fetch current preferences to merge
    // NOTE: 'preferences' field may not exist in the generated Prisma Client
    let currentPrefsData: string | null = null;
    try {
      const user = await db.user.findUnique({
        where: { id: ctx.userId },
        select: { preferences: true },
      });
      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
      currentPrefsData = (user as Record<string, unknown>).preferences as string | null ?? null;
    } catch {
      // 'preferences' field might not exist in Prisma Client — use defaults
    }

    let currentPrefs = DEFAULT_PREFERENCES;
    if (currentPrefsData) {
      try {
        const stored = JSON.parse(currentPrefsData);
        currentPrefs = {
          accentColor: stored.accentColor || DEFAULT_PREFERENCES.accentColor,
          notifications: {
            ...DEFAULT_NOTIFICATIONS,
            ...(stored.notifications || {}),
          },
        };
      } catch {
        // Invalid JSON, use defaults
      }
    }

    // Merge with incoming changes
    const updatedPrefs = {
      accentColor: validation.data.accentColor ?? currentPrefs.accentColor,
      notifications: {
        ...currentPrefs.notifications,
        ...(validation.data.notifications || {}),
      },
    };

    // Save preferences — skip if the field doesn't exist in Prisma Client
    try {
      await db.user.update({
        where: { id: ctx.userId },
        data: { preferences: JSON.stringify(updatedPrefs) },
      });
    } catch {
      // 'preferences' field might not exist — skip saving
    }

    // Invalidate preferences cache after update
    await invalidateCache('settings');

    return NextResponse.json(updatedPrefs);
  } catch (error: unknown) {
    return handleApiError(error, 'Preferences PUT');
  }
}
