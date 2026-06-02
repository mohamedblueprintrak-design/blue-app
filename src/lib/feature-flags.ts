/**
 * Server-side feature flag evaluation system.
 * Flags are cached in memory for 60 seconds to avoid DB hits on every request.
 */

import { db } from "@/lib/db";

// ==================== TYPES ====================

interface FeatureFlagRecord {
  id: string;
  key: string;
  name: string;
  nameAr: string | null;
  description: string | null;
  descriptionAr: string | null;
  enabled: boolean;
  enabledForOrgs: string | null;
  enabledForRoles: string | null;
  percentage: number;
  organizationId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface FlagContext {
  userId?: string;
  organizationId?: string;
  role?: string;
}

// ==================== IN-MEMORY CACHE ====================

let flagsCache: FeatureFlagRecord[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 60_000; // 60 seconds

async function getFlags(): Promise<FeatureFlagRecord[]> {
  const now = Date.now();
  if (flagsCache && now - cacheTimestamp < CACHE_TTL_MS) {
    return flagsCache;
  }

  flagsCache = await db.featureFlag.findMany();
  cacheTimestamp = now;
  return flagsCache;
}

/**
 * Invalidate the cache — call after creating/updating flags.
 */
export function invalidateFlagsCache(): void {
  flagsCache = null;
  cacheTimestamp = 0;
}

// ==================== HASH FUNCTION ====================

/**
 * Simple deterministic hash for percentage-based rollouts.
 * Same userId + key always returns the same bucket.
 */
function hashUserId(userId: string, key: string): number {
  let hash = 0;
  const str = `${key}:${userId}`;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

// ==================== MAIN EVALUATION ====================

/**
 * Check if a feature flag is enabled for a given context.
 *
 * Logic:
 * 1. Look up flag by key in DB
 * 2. If not found → return false (features off by default)
 * 3. If flag.enabled is false → return false
 * 4. If enabledForOrgs is set → check if organizationId is in the list
 * 5. If enabledForRoles is set → check if role is in the list
 * 6. If percentage < 100 → hash userId and check if hash % 100 < percentage
 * 7. Otherwise → return true
 */
export async function isFeatureEnabled(
  key: string,
  context?: FlagContext
): Promise<boolean> {
  const flags = await getFlags();
  const flag = flags.find((f) => f.key === key);

  // Flag not found → off by default
  if (!flag) return false;

  // Flag is globally disabled
  if (!flag.enabled) return false;

  // Check org restriction
  if (flag.enabledForOrgs) {
    try {
      const allowedOrgs: string[] = JSON.parse(flag.enabledForOrgs);
      if (Array.isArray(allowedOrgs) && allowedOrgs.length > 0) {
        if (!context?.organizationId || !allowedOrgs.includes(context.organizationId)) {
          return false;
        }
      }
    } catch {
      // Invalid JSON — skip org check
    }
  }

  // Check role restriction
  if (flag.enabledForRoles) {
    try {
      const allowedRoles: string[] = JSON.parse(flag.enabledForRoles);
      if (Array.isArray(allowedRoles) && allowedRoles.length > 0) {
        if (!context?.role || !allowedRoles.includes(context.role.toUpperCase())) {
          return false;
        }
      }
    } catch {
      // Invalid JSON — skip role check
    }
  }

  // Check percentage rollout
  if (flag.percentage < 100) {
    if (!context?.userId) return false;
    const hash = hashUserId(context.userId, key);
    if (hash % 100 >= flag.percentage) {
      return false;
    }
  }

  return true;
}

// ==================== ADMIN HELPERS ====================

/**
 * Get all feature flags — for admin UI.
 */
export async function getAllFlags(): Promise<FeatureFlagRecord[]> {
  return getFlags();
}

/**
 * Set a flag's enabled state — for admin UI quick toggle.
 */
export async function setFlag(key: string, enabled: boolean): Promise<void> {
  await db.featureFlag.update({
    where: { key },
    data: { enabled },
  });
  invalidateFlagsCache();
}

/**
 * Create or update a feature flag — for admin UI.
 */
export async function upsertFlag(data: {
  key: string;
  name: string;
  nameAr?: string;
  description?: string;
  descriptionAr?: string;
  enabled?: boolean;
  enabledForOrgs?: string;
  enabledForRoles?: string;
  percentage?: number;
  organizationId?: string;
}): Promise<FeatureFlagRecord> {
  const result = await db.featureFlag.upsert({
    where: { key: data.key },
    update: {
      name: data.name,
      ...(data.nameAr !== undefined && { nameAr: data.nameAr }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.descriptionAr !== undefined && { descriptionAr: data.descriptionAr }),
      ...(data.enabled !== undefined && { enabled: data.enabled }),
      ...(data.enabledForOrgs !== undefined && { enabledForOrgs: data.enabledForOrgs }),
      ...(data.enabledForRoles !== undefined && { enabledForRoles: data.enabledForRoles }),
      ...(data.percentage !== undefined && { percentage: data.percentage }),
      ...(data.organizationId !== undefined && { organizationId: data.organizationId }),
    },
    create: {
      key: data.key,
      name: data.name,
      nameAr: data.nameAr || null,
      description: data.description || null,
      descriptionAr: data.descriptionAr || null,
      enabled: data.enabled ?? false,
      enabledForOrgs: data.enabledForOrgs || null,
      enabledForRoles: data.enabledForRoles || null,
      percentage: data.percentage ?? 100,
      organizationId: data.organizationId || null,
    },
  });
  invalidateFlagsCache();
  return result;
}
