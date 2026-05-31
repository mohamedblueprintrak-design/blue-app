"use client";

import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, Clock, Wallet, TrendingUp, ArrowUpRight } from "lucide-react";
import { useNavStore } from "@/store/nav-store";

// ===== Types =====
interface HealthProject {
  id: string;
  nameAr: string;
  nameEn: string;
  progress: number; // 0-100
  budgetRemainingPct: number; // 0-100
  onSchedule: number; // 0 or 1 (binary)
  endDate: string;
  budgetStatusAr: string;
  budgetStatusEn: string;
  lastActivity: string;
}

// ===== Health Score Calculation =====
function calculateHealthScore(project: HealthProject): number {
  return Math.round(
    project.progress * 0.4 +
    project.budgetRemainingPct * 0.3 +
    project.onSchedule * 100 * 0.3
  );
}

function getHealthColor(score: number): {
  bar: string;
  bg: string;
  text: string;
  label: string;
  labelEn: string;
} {
  if (score >= 75) {
    return {
      bar: "bg-emerald-500",
      bg: "bg-emerald-50 dark:bg-emerald-950/20",
      text: "text-emerald-600 dark:text-emerald-400",
      label: "جيد",
      labelEn: "Healthy",
    };
  }
  if (score >= 50) {
    return {
      bar: "bg-amber-500",
      bg: "bg-amber-50 dark:bg-amber-950/20",
      text: "text-amber-600 dark:text-amber-400",
      label: "متوسط",
      labelEn: "Fair",
    };
  }
  return {
    bar: "bg-red-500",
    bg: "bg-red-50 dark:bg-red-950/20",
    text: "text-red-600 dark:text-red-400",
    label: "ضعيف",
    labelEn: "At Risk",
  };
}

function getDaysRemaining(endDate: string): { days: number; text: string; textEn: string } {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);
  const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return { days: diff, text: `متأخر ${Math.abs(diff)} يوم`, textEn: `${Math.abs(diff)}d overdue` };
  if (diff === 0) return { days: diff, text: "ينتهي اليوم", textEn: "Ends today" };
  if (diff === 1) return { days: diff, text: "غداً", textEn: "Tomorrow" };
  if (diff <= 7) return { days: diff, text: `${diff} أيام`, textEn: `${diff} days` };
  if (diff <= 30) return { days: diff, text: `${Math.ceil(diff / 7)} أسابيع`, textEn: `${Math.ceil(diff / 7)} weeks` };
  return { days: diff, text: `${Math.ceil(diff / 30)} أشهر`, textEn: `${Math.ceil(diff / 30)} months` };
}

// ===== Mock Data =====
function getMockProjects(_isAr: boolean): HealthProject[] {
  const now = new Date();
  const future = (days: number) => {
    const d = new Date(now);
    d.setDate(d.getDate() + days);
    return d.toISOString().split("T")[0];
  };
  const past = (days: number) => {
    const d = new Date(now);
    d.setDate(d.getDate() - days);
    return d.toISOString();
  };

  return [
    {
      id: "p1",
      nameAr: "برج النخيل التجاري",
      nameEn: "Al Nakhla Commercial Tower",
      progress: 78,
      budgetRemainingPct: 65,
      onSchedule: 1,
      endDate: future(45),
      budgetStatusAr: "ضمن الميزانية",
      budgetStatusEn: "Under Budget",
      lastActivity: past(1),
    },
    {
      id: "p2",
      nameAr: "فيلات المروج السكنية",
      nameEn: "Al Murouj Residential Villas",
      progress: 92,
      budgetRemainingPct: 40,
      onSchedule: 1,
      endDate: future(18),
      budgetStatusAr: "ضمن الميزانية",
      budgetStatusEn: "Under Budget",
      lastActivity: past(0),
    },
    {
      id: "p3",
      nameAr: "مجمع الواحة التجاري",
      nameEn: "Al Wahat Commercial Complex",
      progress: 45,
      budgetRemainingPct: 30,
      onSchedule: 0,
      endDate: future(-5),
      budgetStatusAr: "تجاوز الميزانية",
      budgetStatusEn: "Over Budget",
      lastActivity: past(2),
    },
    {
      id: "p4",
      nameAr: "مدرسة السلام النموذجية",
      nameEn: "Al Salam Model School",
      progress: 60,
      budgetRemainingPct: 55,
      onSchedule: 1,
      endDate: future(90),
      budgetStatusAr: "ضمن الميزانية",
      budgetStatusEn: "Under Budget",
      lastActivity: past(3),
    },
    {
      id: "p5",
      nameAr: "مسجد الفجر الكبير",
      nameEn: "Al Fajr Grand Mosque",
      progress: 25,
      budgetRemainingPct: 80,
      onSchedule: 0,
      endDate: future(60),
      budgetStatusAr: "ضمن الميزانية",
      budgetStatusEn: "Under Budget",
      lastActivity: past(5),
    },
  ];
}

function timeAgoShort(dateStr: string, isAr: boolean): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffHours < 1) return isAr ? "الآن" : "Now";
  if (diffHours < 24) return isAr ? `${diffHours}س` : `${diffHours}h`;
  if (diffDays < 7) return isAr ? `${diffDays}ي` : `${diffDays}d`;
  return isAr ? `${Math.floor(diffDays / 7)}أسبوع` : `${Math.floor(diffDays / 7)}w`;
}

// ===== Component =====
export default function ProjectHealthWidget({
  language,
}: {
  language: "ar" | "en";
}) {
  const isAr = language === "ar";
  const { setCurrentPage } = useNavStore();

  const projects = getMockProjects(isAr);

  return (
    <Card className="rounded-xl border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900 overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center">
              <Activity className="h-4 w-4 text-white" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold text-slate-900 dark:text-white">
                {isAr ? "صحة المشاريع" : "Project Health"}
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {isAr
                  ? "مؤشر صحة المشاريع النشطة"
                  : "Health indicators for active projects"}
              </CardDescription>
            </div>
          </div>
          <button
            onClick={() => setCurrentPage("projects")}
            className="text-xs text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 flex items-center gap-1 transition-colors"
          >
            {isAr ? "عرض الكل" : "View All"}
            <ArrowUpRight className="h-3 w-3" />
          </button>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mt-2">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-[10px] text-slate-500 dark:text-slate-400">
              {isAr ? "جيد (≥75)" : "Good (≥75)"}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span className="text-[10px] text-slate-500 dark:text-slate-400">
              {isAr ? "متوسط (≥50)" : "Fair (≥50)"}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            <span className="text-[10px] text-slate-500 dark:text-slate-400">
              {isAr ? "ضعيف (<50)" : "At Risk (<50)"}
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="px-4 pb-4 pt-0">
        <div className="space-y-2.5">
          {projects.map((project, idx) => {
            const healthScore = calculateHealthScore(project);
            const health = getHealthColor(healthScore);
            const remaining = getDaysRemaining(project.endDate);
            const isOverdue = remaining.days < 0;

            return (
              <div
                key={project.id}
                className={cn(
                  "flex items-center gap-3 px-3 py-3 rounded-xl border transition-all duration-200 hover:shadow-sm cursor-pointer",
                  "border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700",
                  health.bg,
                  idx % 2 === 1 && "opacity-95"
                )}
                onClick={() => setCurrentPage("projects")}
              >
                {/* Project info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                      {isAr ? project.nameAr : project.nameEn}
                    </p>
                    <span
                      className={cn(
                        "text-[11px] font-bold tabular-nums shrink-0 ms-2",
                        health.text
                      )}
                    >
                      {healthScore}
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden mb-2">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-700 ease-out",
                        health.bar
                      )}
                      style={{ width: `${healthScore}%` }}
                    />
                  </div>

                  {/* Indicators */}
                  <div className="flex items-center gap-3 text-[10px] text-slate-500 dark:text-slate-400">
                    {/* Days remaining */}
                    <span
                      className={cn(
                        "flex items-center gap-1",
                        isOverdue && "text-red-600 dark:text-red-400 font-semibold"
                      )}
                    >
                      <Clock className="h-3 w-3" />
                      {isAr ? remaining.text : remaining.textEn}
                    </span>

                    {/* Budget status */}
                    <span className="flex items-center gap-1">
                      <Wallet className="h-3 w-3" />
                      {isAr ? project.budgetStatusAr : project.budgetStatusEn}
                    </span>

                    {/* Last activity */}
                    <span className="flex items-center gap-1 ms-auto">
                      <TrendingUp className="h-3 w-3" />
                      {timeAgoShort(project.lastActivity, isAr)}
                    </span>
                  </div>
                </div>

                {/* Health badge */}
                <Badge
                  className={cn(
                    "shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-full border-0",
                    healthScore >= 75
                      ? "bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400"
                      : healthScore >= 50
                        ? "bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400"
                        : "bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-400"
                  )}
                >
                  {isAr ? health.label : health.labelEn}
                </Badge>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
