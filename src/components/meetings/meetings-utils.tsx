import { Monitor, Building2 } from "lucide-react";
import { cn, getAvatarColor } from "@/lib/utils";

// ===== Types =====
export interface MeetingItem {
  id: string;
  projectId: string | null;
  title: string;
  date: string;
  time: string;
  duration: number;
  location: string;
  type: string;
  notes: string;
  createdAt: string;
  project: { id: string; name: string; nameEn: string; number: string } | null;
  attendees: MeetingAttendee[];
  agenda: MeetingAgendaItem[];
}

export interface MeetingAttendee {
  id: string;
  userId: string;
  role: string;
  user: { id: string; name: string; email: string; avatar: string } | null;
}

export interface MeetingAgendaItem {
  id: string;
  topic: string;
  duration: number;
}

export interface ProjectOption {
  id: string;
  name: string;
  nameEn: string;
  number: string;
}

export interface UserOption {
  id: string;
  name: string;
  email: string;
}

// ===== Helpers =====
export function getTypeBadge(type: string, ar: boolean) {
  const configs: Record<string, { label: string; labelEn: string; color: string; icon: typeof Monitor }> = {
    ONSITE: { label: "حضوري", labelEn: "On-site", color: "bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-300", icon: Building2 },
    ONLINE: { label: "عن بُعد", labelEn: "Online", color: "bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300", icon: Monitor },
  };
  const cfg = configs[type] || configs.ONSITE;
  const Icon = cfg.icon;
  // Note: we're returning the raw elements/classes here, or you can return a simple object 
  // if you want to avoid returning JSX from a helper. But JSX is fine in .tsx files.
  return {
    className: cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium", cfg.color),
    label: ar ? cfg.label : cfg.labelEn,
    Icon
  };
}

export function formatDuration(minutes: number, ar: boolean) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}${ar ? " دقيقة" : " min"}`;
  if (mins === 0) return `${hours}${ar ? " ساعة" : "h"}`;
  return `${hours}${ar ? "س " : "h "}${mins}${ar ? "د" : "m"}`;
}

export function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}


