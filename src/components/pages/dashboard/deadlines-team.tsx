import { useTranslations } from 'next-intl';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Calendar, CheckCircle2, Clock, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { daysUntil, getInitials, getAvatarColor, formatDueDate } from "./helpers";
import type { UpcomingTask, TeamMember } from "./types";

interface DeadlinesTeamProps {
  upcomingTasks: UpcomingTask[];
  teamPerformance: TeamMember[];
  isAr: boolean;
  onProjectClick: (projectId: string) => void;
}

export function DeadlinesTeam({ upcomingTasks, teamPerformance, isAr, onProjectClick }: DeadlinesTeamProps) {
  const tAuto = useTranslations();
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Upcoming Deadlines Widget */}
      <Card className="rounded-xl border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900 hover:shadow-md transition-shadow">
        <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800/50 relative">
          {/* Teal accent line */}
          <div className="absolute top-0 start-0 end-0 h-[3px] rounded-t-xl bg-gradient-to-l from-brand-navy-500 to-brand-navy-400" />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-rose-500 to-red-500 flex items-center justify-center shadow-md">
                <Calendar className="h-4 w-4 text-white" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold text-slate-900 dark:text-white">
                  {tAuto('auto.upcomingDeadlines')}
                </CardTitle>
                <CardDescription className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {tAuto('auto.nearestTaskDeadlines')}
                </CardDescription>
              </div>
            </div>
            <Badge variant="secondary" className="text-[10px] px-2">
              {upcomingTasks.length}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="max-h-[400px] overflow-y-auto">
          {upcomingTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <CheckCircle2 className="h-8 w-8 text-emerald-400 mb-2" />
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {tAuto('auto.noUpcomingDeadlines')}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {upcomingTasks.slice(0, 7).map((task) => {
                const days = daysUntil(task.dueDate);
                const isOverdue = task.isOverdue || days < 0;
                const isUrgent = !isOverdue && days <= 3;
                const isWarning = !isOverdue && !isUrgent && days <= 7;

                const badgeClass = isOverdue
                  ? "bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800"
                  : isUrgent
                  ? "bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800"
                  : isWarning
                  ? "bg-amber-50/70 dark:bg-amber-950/30 text-amber-600 dark:text-amber-500 border border-amber-200/60 dark:border-amber-800/60"
                  : "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800";

                const daysLabel = isOverdue
                  ? isAr ? `متأخر ${Math.abs(days)} يوم` : `${Math.abs(days)}d overdue`
                  : days === 0
                  ? tAuto('auto.today')
                  : days === 1
                  ? tAuto('auto.tomorrow')
                  : isAr ? `${days} يوم` : `${days}d`;

                return (
                  <div
                    key={task.id}
                    className={cn(
                      "flex items-center gap-3 p-2.5 rounded-lg border transition-colors cursor-pointer",
                      "hover:bg-slate-50/80 dark:hover:bg-slate-800/30",
                      isOverdue && "bg-red-50/30 dark:bg-red-950/10 border-red-100 dark:border-red-900/30"
                    )}
                    onClick={() => onProjectClick(task.projectNumber)}
                  >
                    {/* Avatar */}
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarFallback className={cn("text-white text-[10px] font-semibold", getAvatarColor(task.assigneeName))}>
                        {getInitials(task.assigneeName)}
                      </AvatarFallback>
                    </Avatar>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">
                        {task.title}
                      </p>
                      <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate mt-0.5">
                        {task.projectName}
                      </p>
                    </div>

                    {/* Due date badge */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {isOverdue && (
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                        </span>
                      )}
                      <span className={cn("inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full", badgeClass)}>
                        <Clock className="h-2.5 w-2.5" />
                        {daysLabel}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Team Performance Widget */}
      <Card className="rounded-xl border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900 hover:shadow-md transition-shadow">
        <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800/50 relative">
          {/* Teal accent line */}
          <div className="absolute top-0 start-0 end-0 h-[3px] rounded-t-xl bg-gradient-to-l from-brand-navy-500 to-brand-navy-400" />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center shadow-md">
                <Users className="h-4 w-4 text-white" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold text-slate-900 dark:text-white">
                  {tAuto('auto.teamPerformance')}
                </CardTitle>
                <CardDescription className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {tAuto('auto.taskCompletionRatePerMember')}
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {teamPerformance.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Users className="h-8 w-8 text-slate-300 dark:text-slate-600 mb-2" />
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {tAuto('auto.noPerformanceDataAvailable')}
              </p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                {tAuto('auto.dataWillAppearWhenActiveProjectStagesAre')}
              </p>
            </div>
          ) : (
          teamPerformance.map((member, idx) => (
            <div
              key={idx}
              className={cn(
                "flex items-center gap-3 p-2 -mx-2 rounded-lg transition-all duration-200 hover:scale-[1.02] hover:bg-slate-50/80 dark:hover:bg-slate-800/30 cursor-default"
              )}
            >
              {/* Avatar with hash-based color */}
              <Avatar className="h-9 w-9 shrink-0 ring-2 ring-slate-100 dark:ring-slate-700">
                <AvatarFallback className={cn("text-white text-[10px] font-bold", member.avatarColor || getAvatarColor(member.name))}>
                  {getInitials(member.name)}
                </AvatarFallback>
              </Avatar>

              {/* Name & Task Count */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                    {member.name}
                  </span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 tabular-nums shrink-0 ms-2 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                    {member.tasksDone}/{member.tasksTotal} {tAuto('auto.tasks')}
                  </span>
                </div>

                {/* Progress bar with gradient + shine effect */}
                <div className="relative h-2.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-700 ease-out",
                      member.completion >= 85
                        ? "bg-gradient-to-r from-brand-navy-500 to-emerald-400"
                        : member.completion >= 70
                        ? "bg-gradient-to-r from-brand-navy-500 to-cyan-400"
                        : member.completion >= 50
                        ? "bg-gradient-to-r from-amber-400 to-amber-500"
                        : "bg-gradient-to-r from-orange-400 to-amber-500"
                    )}
                    style={{ width: `${member.completion}%` }}
                  />
                  {/* Shine overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-transparent via-white/20 to-transparent rounded-full" />
                </div>
              </div>

              {/* Percentage with colored badge */}
              <span className={cn(
                "text-xs font-bold tabular-nums min-w-[40px] text-center px-1.5 py-0.5 rounded-lg shrink-0",
                member.completion >= 85
                  ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400"
                  : member.completion >= 70
                  ? "bg-brand-navy-50 dark:bg-brand-navy-950/50 text-brand-navy-600 dark:text-brand-navy-400"
                  : member.completion >= 50
                  ? "bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400"
                  : "bg-orange-50 dark:bg-orange-950/50 text-orange-600 dark:text-orange-400"
              )}>
                {member.completion}%
              </span>
            </div>
          ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
