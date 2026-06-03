/**
 * @module lib/cookie-consent
 * @description Helper functions and types for managing GDPR-compliant cookie consent
 * preferences in the BluePrint application. Stores preferences in localStorage.
 */

/** Cookie consent category identifiers */
export type CookieCategory = "essential" | "analytics" | "marketing" | "functional";

/** Cookie consent preferences object */
export interface CookieConsentPreferences {
  /** Whether the user has given consent */
  consented: boolean;
  /** Timestamp of when consent was given */
  timestamp: string;
  /** Category-level consent flags */
  categories: {
    essential: boolean;
    analytics: boolean;
    marketing: boolean;
    functional: boolean;
  };
}

const STORAGE_KEY = "blueprint-cookie-consent";

/** Default preferences (only essential cookies enabled) */
export const DEFAULT_PREFERENCES: CookieConsentPreferences = {
  consented: false,
  timestamp: "",
  categories: {
    essential: true,
    analytics: false,
    marketing: false,
    functional: false,
  },
};

/**
 * Retrieves the stored cookie consent preferences from localStorage.
 * Returns default preferences if nothing is stored or if the stored data is invalid.
 */
export function getConsentPreferences(): CookieConsentPreferences {
  if (typeof window === "undefined") return DEFAULT_PREFERENCES;

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return DEFAULT_PREFERENCES;

    const parsed = JSON.parse(stored) as Partial<CookieConsentPreferences>;

    // Validate the structure
    if (
      typeof parsed !== "object" ||
      typeof parsed.consented !== "boolean" ||
      typeof parsed.timestamp !== "string" ||
      typeof parsed.categories !== "object" ||
      parsed.categories === null
    ) {
      return DEFAULT_PREFERENCES;
    }

    return {
      consented: parsed.consented,
      timestamp: parsed.timestamp,
      categories: {
        essential: true, // Essential is always true
        analytics: Boolean(parsed.categories.analytics),
        marketing: Boolean(parsed.categories.marketing),
        functional: Boolean(parsed.categories.functional),
      },
    };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

/**
 * Saves cookie consent preferences to localStorage.
 * Essential cookies are always set to true regardless of input.
 */
export function setConsentPreferences(prefs: Partial<CookieConsentPreferences>): void {
  if (typeof window === "undefined") return;

  const current = getConsentPreferences();

  const updated: CookieConsentPreferences = {
    consented: prefs.consented ?? current.consented,
    timestamp: prefs.timestamp ?? new Date().toISOString(),
    categories: {
      essential: true, // Always on
      analytics: prefs.categories?.analytics ?? current.categories.analytics,
      marketing: prefs.categories?.marketing ?? current.categories.marketing,
      functional: prefs.categories?.functional ?? current.categories.functional,
    },
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // localStorage may be full or unavailable — fail silently
  }
}

/**
 * Returns true if the user has previously given consent (any choice).
 * This includes both "accept all" and "reject non-essential" — both are valid consent decisions.
 */
export function hasConsented(): boolean {
  return getConsentPreferences().consented;
}

/**
 * Checks if a specific cookie category has been consented to.
 * Essential cookies always return true.
 */
export function hasCategoryConsent(category: CookieCategory): boolean {
  const prefs = getConsentPreferences();
  if (!prefs.consented) return category === "essential";
  return prefs.categories[category];
}

/**
 * Removes all consent preferences from localStorage.
 * Useful for testing or when the user wants to reset their preferences.
 */
export function clearConsentPreferences(): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Fail silently
  }
}
