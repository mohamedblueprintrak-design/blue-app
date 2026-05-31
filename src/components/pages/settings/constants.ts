import type { AccentColor } from "./types";

export const WORKING_DAYS = [
  { key: "sat", ar: "\u0627\u0644\u0633\u0628\u062a", en: "Saturday" },
  { key: "sun", ar: "\u0627\u0644\u0623\u062d\u062f", en: "Sunday" },
  { key: "mon", ar: "\u0627\u0644\u0627\u062b\u0646\u064a\u0646", en: "Monday" },
  { key: "tue", ar: "\u0627\u0644\u062b\u0644\u0627\u062b\u0627\u0621", en: "Tuesday" },
  { key: "wed", ar: "\u0627\u0644\u0623\u0631\u0628\u0639\u0627\u0621", en: "Wednesday" },
  { key: "thu", ar: "\u0627\u0644\u062e\u0645\u064a\u0633", en: "Thursday" },
  { key: "fri", ar: "\u0627\u0644\u062c\u0645\u0639\u0629", en: "Friday" },
];

export const ACCENT_COLORS: AccentColor[] = [
  { name: "Teal", value: "teal", color: "bg-teal-500" },
  { name: "Blue", value: "blue", color: "bg-blue-500" },
  { name: "Violet", value: "violet", color: "bg-violet-500" },
  { name: "Rose", value: "rose", color: "bg-rose-500" },
  { name: "Amber", value: "amber", color: "bg-amber-500" },
  { name: "Emerald", value: "emerald", color: "bg-emerald-500" },
];
