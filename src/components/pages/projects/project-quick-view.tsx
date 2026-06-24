"use client";


import { useTranslations } from 'next-intl';
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { X, CheckCircle2, Users, Activity, Wallet, CheckSquare, Clock, MessageSquare, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProjectRow } from "./types";
import { statusConfig, typeConfig } from "./types";

interface ProjectQuickViewProps {
  project: ProjectRow;
  isAr: boolean;
  t: (ar: string, en: string) => string;
  onClose: () => void;
  onOpenFull: () => void;
}

export function ProjectQuickView({
  project,
  isAr,
  t,
  onClose,
  onOpenFull,
}: ProjectQuickViewProps) {
  const tAuto = useTranslations();
  const st = statusConfig[project.status] || statusConfig.active;
  const tp = typeConfig[project.type] || typeConfig.VILLA;

  const mockActivities = [
    { id: "1", text: tAuto('auto.projectCreated'), time: project.createdAt, color: "bg-brand-navy-500", icon: <CheckCircle2 className="h-3 w-3" /> },
    { id: "2", text: tAuto('auto.initialTeamAssigned'), time: project.createdAt, color: "bg-blue-500", icon: <Users className="h-3 w-3" /> },
    { id: "3", text: tAuto('auto.designPhaseStarted'), time: project.createdAt, color: "bg-amber-500", icon: <Activity className="h-3 w-3" /> },
    { id: "4", text: tAuto('auto.drawingReview'), time: project.createdAt, color: "bg-violet-500", icon: <MessageSquare className="h-3 w-3" /> },
    { id: "5", text: tAuto('auto.progressUpdated'), time: project.createdAt, color: "bg-emerald-500", icon: <ArrowUpRight className="h-3 w-3" /> },
  ];

  const mockTeam = [
    { name: tAuto('auto.ahmedM'), color: "bg-brand-navy-500" },
    { name: tAuto('auto.fatimaS'), color: "bg-amber-500" },
    { name: tAuto('auto.mohammedK'), color: "bg-blue-500" },
    { name: tAuto('auto.saraB'), color: "bg-violet-500" },
  ];

  const progressColor = project.progress >= 80 ? "text-emerald-500" : project.progress >= 50 ? "text-brand-navy-500" : project.progress >= 25 ? "text-amber-500" : "text-red-500";
  const progressStroke = project.progress >= 80 ? "#10b981" : project.progress >= 50 ? "#133371" : project.progress >= 25 ? "#f59e0b" : "#ef4444";
  const ringRadius = 28;
  const ringCircumference = ringRadius * 2 * Math.PI;
  const ringOffset = ringCircumference - (project.progress / 100) * ringCircumference;

  return (
    <div className="flex flex-col h-full">
      {/* Header gradient */}
      <div className="bg-gradient-to-l from-brand-navy-600 to-brand-navy-700 dark:from-brand-navy-800 dark:to-brand-navy-900 p-5 shrink-0">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-medium text-white/70">
            {t("عرض سريع", "Quick View")}
          </span>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
          >
            <X className="h-4 w-4 text-white" />
          </button>
        </div>
        <h3 className="text-lg font-bold text-white mb-1">
          {isAr ? project.name : project.nameEn || project.name}
        </h3>
        <p className="text-sm text-white/70 font-mono">{project.number}</p>
        <div className="flex items-center gap-2 mt-3">
          <span className={cn("inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-0.5 rounded-full", st.className)}>
            {t(st.ar, st.en)}
          </span>
          <span className={cn("inline-flex items-center text-[11px] font-medium px-2.5 py-0.5 rounded-full", tp.color)}>
            {t(tp.ar, tp.en)}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-5 space-y-5 overflow-y-auto">
        {/* Mini Stat Cards */}
        <div className="grid grid-cols-2 gap-3">
          {/* Progress */}
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 flex items-center gap-3">
            <div className="relative shrink-0">
              <svg width={64} height={64} className="-rotate-90">
                <circle cx={32} cy={32} r={ringRadius} fill="none" stroke="currentColor" strokeWidth={4} className="text-slate-200 dark:text-slate-700" />
                <circle cx={32} cy={32} r={ringRadius} fill="none" stroke={progressStroke} strokeWidth={4} strokeLinecap="round" strokeDasharray={ringCircumference} strokeDashoffset={ringOffset} className="transition-all duration-700" />
              </svg>
              <span className={cn("absolute inset-0 flex items-center justify-center text-xs font-bold rotate-0", progressColor)}>
                {Math.round(project.progress)}%
              </span>
            </div>
            <div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">{t("الإنجاز", "Progress")}</p>
            </div>
          </div>

          {/* Budget */}
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center mb-2">
              <Wallet className="h-4 w-4 text-white" />
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">{t("الميزانية", "Budget")}</p>
            <p className="text-sm font-bold text-slate-900 dark:text-white font-mono tabular-nums">
              {project.budget.toLocaleString()} <span className="text-[10px] font-medium text-slate-400">AED</span>
            </p>
          </div>

          {/* Tasks */}
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mb-2">
              <CheckSquare className="h-4 w-4 text-white" />
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">{t("المهام", "Tasks")}</p>
            <p className="text-sm font-bold text-slate-900 dark:text-white tabular-nums">{project._count?.tasks || 0}</p>
          </div>

          {/* Client */}
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center mb-2">
              <Users className="h-4 w-4 text-white" />
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">{t("العميل", "Client")}</p>
            <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{project.client?.name || "—"}</p>
          </div>
        </div>

        {/* Team Members */}
        <div>
          <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-3">{t("فريق المشروع", "Project Team")}</h4>
          <div className="flex items-center gap-1">
            {mockTeam.map((member, idx) => (
              <div key={member.name} className="relative" style={{ zIndex: mockTeam.length - idx }}>
                <Avatar className="h-8 w-8 border-2 border-white dark:border-slate-900" style={{ marginInlineStart: idx > 0 ? "-6px" : "0" }}>
                  <AvatarFallback className={cn("text-white text-[10px] font-semibold", member.color)}>
                    {member.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>
            ))}
            <span className="text-[11px] text-slate-400 dark:text-slate-500 ms-2">{mockTeam.length} {t("عضو", "members")}</span>
          </div>
        </div>

        {/* Recent Activity Timeline */}
        <div>
          <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-3">{t("النشاط الأخير", "Recent Activity")}</h4>
          <div className="space-y-0">
            <div className="absolute start-[15px] top-0 bottom-0 w-px bg-slate-200 dark:bg-slate-700" />
            {mockActivities.map((item, _idx) => (
              <div key={item.id} className="relative flex items-start gap-3 pb-3 last:pb-0">
                <div className={cn("relative z-10 h-7 w-7 rounded-full flex items-center justify-center shrink-0 text-white", item.color)}>
                  {item.icon}
                </div>
                <div className="flex-1 min-w-0 pt-0.5">
                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">{item.text}</p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 flex items-center gap-1">
                    <Clock className="h-2.5 w-2.5" />
                    {new Date(item.time).toLocaleDateString(isAr ? "ar-AE" : "en-US", { day: "numeric", month: "short" })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="p-5 border-t border-slate-200 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 shrink-0 space-y-2">
        <Button
          onClick={onOpenFull}
          className="w-full bg-brand-navy-600 hover:bg-brand-navy-700 text-white gap-2"
        >
          {t("فتح العرض الكامل", "Open Full View")}
          <ArrowUpRight className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          onClick={onClose}
          className="w-full"
        >
          {t("إغلاق", "Close")}
        </Button>
      </div>
    </div>
  );
}
