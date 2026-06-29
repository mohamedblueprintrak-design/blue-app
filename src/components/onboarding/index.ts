/**
 * Onboarding Wizard Module
 *
 * A multi-step onboarding wizard for new users.
 * Can be easily disabled by removing the OnboardingWizard import from app-layout.tsx.
 *
 * @example
 * ```tsx
 * import OnboardingWizard from "@/components/onboarding";
 * // or
 * import OnboardingWizard from "@/components/onboarding/onboarding-wizard";
 * ```
 */

export { default as OnboardingWizard } from "./onboarding-wizard";
export type { OnboardingStep, OnboardingData, OnboardingProfileData, OnboardingOrganizationData, OnboardingPreferencesData } from "./types";
