"use client";

import { useQuery } from "@tanstack/react-query";
import {
  FolderKanban,
  ListTodo,
  Bell,
} from "lucide-react";
import { useLang } from "@/hooks/use-lang";
import { cn } from "@/lib/utils";

interface SidebarStatsData {
  stats?: {
    activeProjects: number;
    delayedProjects: number;
  };
  overdueTasksCount?: number;
}

export default function SidebarStats() {
  const { data } = useQuery<SidebarStatsData>({
    queryKey: ["sidebar-quick-stats"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard?statsOnly=true");
      if (!res.ok) return null;
      return res.json();
    },
    refetchInterval: 60000,
  });

  const activeProjects = data?.stats?.activeProjects ?? 0;
  const pendingTasks = data?.overdueTasksCount ?? 0;

  // We use notification count from the header, but for the sidebar stats
  // we'll show a static placeholder since it's a lightweight display
  // The real notification count is fetched in AppHeader
  const unreadNotifs = 0;

  const lang = useLang();
  const isAr = lang === "ar";

  const stats = [
    {
      icon: FolderKanban,
      count: activeProjects,
      label: isAr ? "نشطة" : "Active",
      pillBg: "bg-teal-50 dark:bg-teal-950/30",
      iconColor: "text-teal-600 dark:text-teal-400",
      countColor: "text-teal-700 dark:text-teal-300",
    },
    {
      icon: ListTodo,
      count: pendingTasks,
      label: isAr ? "معلقة" : "Pending",
      pillBg: "bg-amber-50 dark:bg-amber-950/30",
      iconColor: "text-amber-600 dark:text-amber-400",
      countColor: "text-amber-700 dark:text-amber-300",
    },
    {
      icon: Bell,
      count: unreadNotifs,
      label: isAr ? "جديدة" : "New",
      pillBg: "bg-red-50 dark:bg-red-950/30",
      iconColor: "text-red-600 dark:text-red-400",
      countColor: "text-red-700 dark:text-red-300",
    },
  ];

  return (
    <div className="flex items-center gap-2 px-1">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <div
            key={stat.label}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1.5 rounded-full",
              stat.pillBg,
              "border border-transparent"
            )}
          >
            <Icon className={cn("h-3 w-3 shrink-0", stat.iconColor)} />
            <span className={cn("text-[11px] font-bold tabular-nums leading-none", stat.countColor)}>
              {stat.count}
            </span>
          </div>
        );
      })}
    </div>
  );
}
