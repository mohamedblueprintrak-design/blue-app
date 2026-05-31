import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import { Activity, ArrowUpRight, Clock, CircleDot } from "lucide-react";
import { cn } from "@/lib/utils";
import { timeAgo, getStatusBadge } from "./helpers";
import { MiniProgressRing } from "./mini-progress-ring";
import type { ActivityItem, RecentProject } from "./types";

interface ActivityFeedProps {
  activities: ActivityItem[];
  recentProjects: RecentProject[];
  isAr: boolean;
  onProjectClick: (projectId: string) => void;
  onNavigate: (page: string) => void;
}

export function ActivityFeed({ activities, recentProjects, isAr, onProjectClick, onNavigate }: ActivityFeedProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Recent Activity Feed Widget */}
      <Card className="lg:col-span-2 rounded-xl border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900 hover:shadow-md transition-shadow">
        <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800/50 relative">
          {/* Teal accent line */}
          <div className="absolute top-0 start-0 end-0 h-[3px] rounded-t-xl bg-gradient-to-l from-teal-500 to-teal-400" />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-sky-500 to-blue-500 flex items-center justify-center shadow-md">
                <Activity className="h-4 w-4 text-white" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold text-slate-900 dark:text-white">
                  {isAr ? "آخر الأنشطة" : "Recent Activity"}
                </CardTitle>
                <CardDescription className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {isAr ? "آخر التحديثات والأحداث" : "Latest updates and events"}
                </CardDescription>
              </div>
            </div>
            <Button variant="ghost" size="sm" className="text-xs text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 hover:bg-teal-50 dark:hover:bg-teal-950/30 gap-1">
              {isAr ? "عرض الكل" : "View All"}
              <ArrowUpRight className="h-3 w-3" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="max-h-[420px] overflow-y-auto">
          {activities.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Activity className="h-8 w-8 text-slate-300 dark:text-slate-600 mb-2" />
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {isAr ? "لا توجد أنشطة حالياً" : "No activity data available"}
              </p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                {isAr ? "ستظهر الأنشطة هنا عند توفرها" : "Activities will appear here when available"}
              </p>
            </div>
          ) : (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute start-[19px] top-3 bottom-3 w-px bg-slate-200 dark:bg-slate-800" />

            <div className="space-y-0.5">
              {activities.map((activity, _idx) => {
                const IconComp = activity.icon;
                return (
                  <div
                    key={activity.id}
                    className={cn(
                      "relative flex items-start gap-3 p-2.5 rounded-lg transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/30",
                      "border-s-2",
                      activity.borderColor
                    )}
                  >
                    {/* Timeline dot + icon */}
                    <div className={cn(
                      "relative z-10 h-9 w-9 rounded-full flex items-center justify-center shrink-0",
                      activity.iconBg
                    )}>
                      <IconComp className={cn("h-4 w-4", activity.iconColor)} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 pt-0.5">
                      <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                        <span className="font-semibold text-slate-900 dark:text-white">
                          {activity.userName}
                        </span>
                        {" "}
                        {isAr ? activity.actionAr : activity.actionEn}
                      </p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 flex items-center gap-1">
                        <Clock className="h-2.5 w-2.5" />
                        {timeAgo(activity.timestamp, isAr)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Project Overview Widget */}
      <Card className="rounded-xl border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900 hover:shadow-md transition-shadow">
        <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800/50 relative">
          {/* Teal accent line */}
          <div className="absolute top-0 start-0 end-0 h-[3px] rounded-t-xl bg-gradient-to-l from-teal-500 to-teal-400" />
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center shadow-md">
              <CircleDot className="h-4 w-4 text-white" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold text-slate-900 dark:text-white">
                {isAr ? "نظرة سريعة على المشاريع" : "Project Overview"}
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {isAr ? "حالة المشاريع النشطة" : "Active projects status"}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="max-h-[420px] overflow-y-auto">
          <div className="space-y-3">
            {recentProjects.slice(0, 4).map((project) => (
              <div
                key={project.id}
                className="flex items-center gap-3 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 transition-all hover:shadow-sm hover:border-slate-200 dark:hover:border-slate-700 cursor-pointer"
                onClick={() => onProjectClick(project.id)}
              >
                {/* Progress Ring */}
                <div className="relative">
                  <MiniProgressRing progress={project.progress} size={44} strokeWidth={3.5} />
                  <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-slate-700 dark:text-slate-300">
                    {Math.round(project.progress)}%
                  </span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                    {isAr ? project.name : (project.nameEn || project.name)}
                  </p>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate mt-0.5">
                    {project.clientCompany || project.clientName}
                  </p>
                  <div className="mt-1.5">
                    {getStatusBadge(project.status, isAr)}
                  </div>
                </div>

                {/* Arrow */}
                <ArrowUpRight className="h-4 w-4 text-slate-300 dark:text-slate-600 shrink-0" />
              </div>
            ))}

            {/* View All */}
            <Button
              variant="ghost"
              className="w-full text-xs text-slate-500 hover:text-teal-600 dark:hover:text-teal-400 mt-2"
              onClick={() => onNavigate("projects")}
            >
              {isAr ? "عرض جميع المشاريع" : "View All Projects"}
              <ArrowUpRight className="h-3 w-3 ms-1" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
