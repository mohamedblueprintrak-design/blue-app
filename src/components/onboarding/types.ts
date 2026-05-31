/**
 * Onboarding Wizard — Types & Constants
 * Shared types and step definitions for the multi-step onboarding wizard.
 */

export type OnboardingStep = 0 | 1 | 2 | 3 | 4;

export interface OnboardingProfileData {
  name: string;
  phone: string;
  avatar: string;
}

export interface OnboardingOrganizationData {
  companyName: string;
  industry: string;
  size: string;
}

export interface OnboardingPreferencesData {
  language: "ar" | "en";
  notifications: boolean;
  theme: "light" | "dark" | "system";
}

export interface OnboardingData {
  profile: OnboardingProfileData;
  organization: OnboardingOrganizationData;
  preferences: OnboardingPreferencesData;
}

export const INITIAL_ONBOARDING_DATA: OnboardingData = {
  profile: {
    name: "",
    phone: "",
    avatar: "",
  },
  organization: {
    companyName: "",
    industry: "",
    size: "",
  },
  preferences: {
    language: "ar",
    notifications: true,
    theme: "system",
  },
};

export const STEP_COUNT = 5;

/** Industry options for the organization step */
export const INDUSTRY_OPTIONS = [
  { value: "engineering-consultancy", ar: "استشارات هندسية", en: "Engineering Consultancy" },
  { value: "architecture", ar: "عمارة وتصميم", en: "Architecture & Design" },
  { value: "construction", ar: "بناء وتشييد", en: "Construction" },
  { value: "infrastructure", ar: "بنية تحتية", en: "Infrastructure" },
  { value: "oil-gas", ar: "نفط وغاز", en: "Oil & Gas" },
  { value: "manufacturing", ar: "تصنيع", en: "Manufacturing" },
  { value: "it-technology", ar: "تقنية المعلومات", en: "IT & Technology" },
  { value: "healthcare", ar: "رعاية صحية", en: "Healthcare" },
  { value: "education", ar: "تعليم", en: "Education" },
  { value: "government", ar: "حكومي", en: "Government" },
  { value: "other", ar: "أخرى", en: "Other" },
];

/** Company size options */
export const SIZE_OPTIONS = [
  { value: "1-10", ar: "1-10 موظف", en: "1-10 employees" },
  { value: "11-50", ar: "11-50 موظف", en: "11-50 employees" },
  { value: "51-200", ar: "51-200 موظف", en: "51-200 employees" },
  { value: "201-500", ar: "201-500 موظف", en: "201-500 employees" },
  { value: "500+", ar: "أكثر من 500 موظف", en: "500+ employees" },
];
