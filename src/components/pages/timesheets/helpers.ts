import type { FormEntry } from "./types";

export function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function getWeekDays(monday: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    return d;
  });
}

export function formatDate(date: string | Date): string {
  return new Date(date).toISOString().split("T")[0];
}

export function emptyEntry(date: Date): FormEntry {
  return {
    date: formatDate(date),
    hours: 0,
    taskType: "regular",
    description: "",
    projectId: null,
  };
}
