export const categories = [
  { value: "TECHNICAL", ar: "\u062a\u0642\u0646\u064a", en: "Technical", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300" },
  { value: "FINANCIAL", ar: "\u0645\u0627\u0644\u064a", en: "Financial", color: "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300" },
  { value: "SCHEDULE", ar: "\u062c\u062f\u0648\u0644 \u0632\u0645\u0646\u064a", en: "Schedule", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300" },
  { value: "EXTERNAL", ar: "\u062e\u0627\u0631\u062c\u064a", en: "External", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300" },
  { value: "SAFETY", ar: "\u0633\u0644\u0627\u0645\u0629", en: "Safety", color: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300" },
  { value: "ENVIRONMENTAL", ar: "\u0628\u064a\u0626\u064a", en: "Environmental", color: "bg-brand-navy-100 text-brand-navy-700 dark:bg-brand-navy-900/50 dark:text-brand-navy-300" },
];

export const strategies = [
  { value: "AVOID", ar: "\u062a\u062c\u0646\u0628", en: "Avoid", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300" },
  { value: "MITIGATE", ar: "\u062a\u062e\u0641\u064a\u0641", en: "Mitigate", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300" },
  { value: "TRANSFER", ar: "\u0646\u0642\u0644", en: "Transfer", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300" },
  { value: "ACCEPT", ar: "\u0642\u0628\u0648\u0644", en: "Accept", color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" },
];

export const BAR_COLORS: Record<string, string> = {
  TECHNICAL: "bg-blue-500",
  FINANCIAL: "bg-green-500",
  SCHEDULE: "bg-amber-500",
  EXTERNAL: "bg-purple-500",
  SAFETY: "bg-red-500",
  ENVIRONMENTAL: "bg-brand-navy-500",
};

export const CATEGORY_VALUES = ["TECHNICAL", "FINANCIAL", "SCHEDULE", "EXTERNAL", "SAFETY", "ENVIRONMENTAL"] as const;
