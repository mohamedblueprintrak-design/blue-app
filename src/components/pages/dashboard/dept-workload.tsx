import { useTranslations } from 'next-intl';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Briefcase, Building, Wrench, FolderKanban, ShieldCheck, FileText, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { MiniProgressRing } from "./mini-progress-ring";
import type { DashboardStats, DashboardInvoices, DepartmentProgressItem } from "./types";

interface DeptWorkloadProps {
  departmentProgress: DepartmentProgressItem[];
  stats: DashboardStats;
  activeTasksCount: number;
  overdueTasksCount: number;
  invoices: DashboardInvoices;
  isAr: boolean;
}

export function DeptWorkload({ departmentProgress, stats, activeTasksCount, overdueTasksCount, invoices, isAr }: DeptWorkloadProps) {
  const tAuto = useTranslations();
  return (
    <Card className="rounded-xl border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900 hover:shadow-md transition-shadow">
      <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800/50 relative">
        <div className="absolute top-0 start-0 end-0 h-[3px] rounded-t-xl bg-gradient-to-l from-brand-navy-500 to-brand-navy-400" />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-brand-navy-500 to-cyan-600 flex items-center justify-center shadow-md">
              <Briefcase className="h-4 w-4 text-white" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold text-slate-900 dark:text-white">
                {tAuto('auto.departmentWorkload')}
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {tAuto('auto.overviewOfTaskLoadPerDepartment')}
              </CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { key: "arch", labelAr: "القسم المعماري", labelEn: "Architecture", icon: Building, color: "from-brand-navy-500 to-brand-navy-600", bg: "bg-brand-navy-50 dark:bg-brand-navy-950/20", total: departmentProgress.find(d => d.key === "ARCHITECTURAL")?.total || 0, completed: departmentProgress.find(d => d.key === "ARCHITECTURAL")?.completed || 0, progress: departmentProgress.find(d => d.key === "ARCHITECTURAL")?.progress || 0 },
            { key: "struct", labelAr: "القسم الإنشائي", labelEn: "Structural", icon: Wrench, color: "from-amber-500 to-amber-600", bg: "bg-amber-50 dark:bg-amber-950/20", total: departmentProgress.find(d => d.key === "STRUCTURAL")?.total || 0, completed: departmentProgress.find(d => d.key === "STRUCTURAL")?.completed || 0, progress: departmentProgress.find(d => d.key === "STRUCTURAL")?.progress || 0 },
            { key: "MEP", labelAr: "الكهروميكانيك", labelEn: "MEP", icon: Zap, color: "from-violet-500 to-violet-600", bg: "bg-violet-50 dark:bg-violet-950/20", total: departmentProgress.find(d => d.key === "MEP")?.total || 0, completed: departmentProgress.find(d => d.key === "MEP")?.completed || 0, progress: departmentProgress.find(d => d.key === "MEP")?.progress || 0 },
            { key: "pm", labelAr: "إدارة المشاريع", labelEn: "Project Mgmt", icon: FolderKanban, color: "from-blue-500 to-blue-600", bg: "bg-blue-50 dark:bg-blue-950/20", total: stats.activeProjects, completed: stats.completedProjects, progress: stats.totalProjects > 0 ? Math.round((stats.completedProjects / stats.totalProjects) * 100) : 0 },
            { key: "admin", labelAr: "الإدارة", labelEn: "Administration", icon: ShieldCheck, color: "from-emerald-500 to-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/20", total: activeTasksCount, completed: activeTasksCount - overdueTasksCount, progress: activeTasksCount > 0 ? Math.round(((activeTasksCount - overdueTasksCount) / activeTasksCount) * 100) : 0 },
            { key: "doc", labelAr: "الوثائق", labelEn: "Documentation", icon: FileText, color: "from-rose-500 to-rose-600", bg: "bg-rose-50 dark:bg-rose-950/20", total: invoices.outstandingCount, completed: 0, progress: 0 },
          ].map((dept) => {
            const DeptIcon = dept.icon;
            return (
              <div
                key={dept.key}
                className={cn(
                  "rounded-xl border border-slate-200/80 dark:border-slate-700/50 p-3 transition-all duration-200 hover:shadow-md hover:scale-[1.02] cursor-default",
                  dept.bg
                )}
              >
                <div className="flex items-center gap-2 mb-2.5">
                  <div className={cn("h-8 w-8 rounded-lg bg-gradient-to-br flex items-center justify-center shadow-sm", dept.color)}>
                    <DeptIcon className="h-4 w-4 text-white" />
                  </div>
                  <MiniProgressRing progress={dept.progress} size={32} strokeWidth={3} />
                </div>
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                  {isAr ? dept.labelAr : dept.labelEn}
                </p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                  {dept.completed}/{dept.total}
                </p>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
