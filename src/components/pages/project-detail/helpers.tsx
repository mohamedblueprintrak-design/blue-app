"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  XCircle,
  Clock,
} from "lucide-react";
import { StatusIcon } from "@/components/ui/status-icon";
import { STATUS_LABELS, STATUS_COLORS, DESIGN_PIPELINE_STAGES } from "./constants";
import type { ProjectStage } from "./types";

// ===== STATUS BADGE =====
export function StatusBadge({ status, language }: { status: string; language: "ar" | "en" }) {
  const label = STATUS_LABELS[language]?.[status] || status;
  const color = STATUS_COLORS[status] || STATUS_COLORS.NOT_STARTED;
  return (
    <Badge variant="outline" className={cn("text-xs font-medium border-0 px-2.5 py-0.5", color)}>
      <StatusIcon status={status} className="h-3 w-3" />
      {label}
    </Badge>
  );
}

// ===== PROGRESS RING =====
export function ProgressRing({ value, size = 56, strokeWidth = 4 }: { value: number; size?: number; strokeWidth?: number }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (value / 100) * circumference;
  const color = value >= 80 ? "#10b981" : value >= 40 ? "#133371" : value >= 20 ? "#f59e0b" : "#94a3b8";

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="hsl(var(--muted))" strokeWidth={strokeWidth} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className="transition-all duration-700"
      />
    </svg>
  );
}

// ===== STAT CARD =====
export function StatCard({ label, value, icon: Icon, color }: { label: string; value: React.ReactNode; icon: React.ElementType; color: string }) {
  return (
    <Card className="border-slate-200 dark:border-slate-700/50">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
            <p className="text-xl font-bold text-slate-900 dark:text-white mt-1">{value}</p>
          </div>
          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", color)}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ===== DEPARTMENT PROGRESS =====
export function DepartmentProgress({
  stages,
  department,
  language,
  label,
  icon: Icon,
  accentColor,
}: {
  stages: ProjectStage[];
  department: string;
  language: "ar" | "en";
  label: string;
  icon: React.ElementType;
  accentColor: string;
}) {
  const isAr = language === "ar";
  const t = (ar: string, en: string) => (isAr ? ar : en);
  const deptStages = stages.filter((s) => s.department === department);
  const completed = deptStages.filter((s) => s.status === "APPROVED").length;
  const total = deptStages.length;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <Card 
      className="border-slate-200 dark:border-slate-700/50 overflow-hidden"
      style={{ borderInlineStartWidth: "4px", borderInlineStartColor: accentColor }}
    >
      <CardContent className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <div 
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: `${accentColor}15`, color: accentColor }}
          >
            <Icon className="h-4 w-4" />
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-slate-900 dark:text-white text-sm">{label}</h4>
            <p className="text-xs text-slate-500">{completed}/{total} {t("مراحل", "stages")}</p>
          </div>
          <div className="text-end">
            <span className="text-lg font-bold" style={{ color: accentColor }}>{pct}%</span>
          </div>
        </div>
        <Progress value={pct} className="h-2 bg-slate-100 dark:bg-slate-800" />
      </CardContent>
    </Card>
  );
}

// ===== STAGE STEPPER =====
export function StageStepper({ stages, language: _language }: { stages: ProjectStage[]; language: "ar" | "en" }) {
  const sortedStages = [...stages].sort((a, b) => a.stageOrder - b.stageOrder);

  return (
    <div className="overflow-x-auto pb-2">
      <div className="flex items-center gap-0 min-w-max">
        {sortedStages.map((stage, idx) => {
          const isApproved = stage.status === "APPROVED";
          const isInProgress = stage.status === "IN_PROGRESS";
          const isRejected = stage.status === "REJECTED";
          const isSubmitted = stage.status === "SUBMITTED";

          return (
            <div key={stage.id} className="flex items-center shrink-0">
              {/* Step Node */}
              <div className="flex flex-col items-center gap-1.5 w-20">
                <div className={cn(
                  "w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 relative",
                  isApproved
                    ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20"
                    : isInProgress
                    ? "bg-teal-500 text-white shadow-md shadow-teal-500/20 animate-pulse"
                    : isRejected
                    ? "bg-red-500 text-white shadow-md shadow-red-500/20"
                    : isSubmitted
                    ? "bg-amber-500 text-white shadow-md shadow-amber-500/20"
                    : "bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400"
                )}>
                  {isApproved ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : isRejected ? (
                    <XCircle className="h-4 w-4" />
                  ) : isInProgress ? (
                    <Clock className="h-4 w-4" />
                  ) : (
                    <span>{idx + 1}</span>
                  )}
                </div>
                <span className={cn(
                  "text-[10px] text-center leading-tight max-w-[80px]",
                  isInProgress || isApproved ? "text-slate-900 dark:text-white font-medium" : "text-slate-500"
                )}>
                  {stage.stageName}
                </span>
              </div>
              
              {/* Connector Line */}
              {idx < sortedStages.length - 1 && (
                <div className={cn(
                  "w-8 h-1 rounded-full mx-1",
                  isApproved ? "bg-emerald-400" : "bg-slate-200 dark:bg-slate-700"
                )} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ===== DESIGN PIPELINE =====
export function DesignPipeline({ department, stages, language }: { department: string; stages: ProjectStage[]; language: "ar" | "en" }) {
  const isAr = language === "ar";
  const deptStages = stages.filter(s => s.department === department);
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case "APPROVED": return "bg-emerald-500";
      case "IN_PROGRESS": return "bg-teal-500";
      case "SUBMITTED": return "bg-amber-500";
      case "REJECTED": return "bg-red-500";
      default: return "bg-slate-200 dark:bg-slate-700";
    }
  };
  
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "APPROVED": return <CheckCircle2 className="h-3 w-3 text-white" />;
      case "IN_PROGRESS": return <Clock className="h-3 w-3 text-white" />;
      case "REJECTED": return <XCircle className="h-3 w-3 text-white" />;
      default: return <span className="text-[8px] text-slate-500 dark:text-slate-400">•</span>;
    }
  };

  return (
    <div className="space-y-3">
      {DESIGN_PIPELINE_STAGES.map((stage, idx) => {
        const stageData = deptStages.find(s => s.stageOrder === idx + 1);
        const status = stageData?.status || "NOT_STARTED";
        const color = getStatusColor(status);
        
        return (
          <div key={stage.key} className="flex items-center gap-3">
            <div className={cn("w-7 h-7 rounded-full flex items-center justify-center shrink-0", color)}>
              {getStatusIcon(status)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className={cn("text-xs font-medium", status !== "NOT_STARTED" ? "text-slate-900 dark:text-white" : "text-slate-400")}>
                  {isAr ? stage.labelAr : stage.labelEn}
                </span>
                {stageData?.notes && (
                  <span className="text-[9px] text-slate-400 truncate max-w-[120px]">{stageData.notes}</span>
                )}
              </div>
              {idx < DESIGN_PIPELINE_STAGES.length - 1 && (
                <div className={cn("w-0.5 h-3 ms-3 rounded-full", status === "APPROVED" ? "bg-emerald-300" : "bg-slate-200 dark:bg-slate-700")} />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ===== SUB-TAB RENDERER =====
export function SubTabsNav<T extends { id: string; icon: React.ComponentType<{ className?: string }>; labelAr: string; labelEn: string }>({ 
  tabs, 
  activeSubTab, 
  onSubTabChange, 
  language 
}: { 
  tabs: T[]; 
  activeSubTab: string; 
  onSubTabChange: (id: string) => void;
  language: "ar" | "en";
}) {
  const isAr = language === "ar";
  return (
    <ScrollArea className="w-full mb-4" dir={isAr ? "rtl" : "ltr"}>
      <div className="flex gap-2 pb-2">
        {tabs.map((tab) => (
          <Button
            key={tab.id}
            variant={activeSubTab === tab.id ? "default" : "outline"}
            size="sm"
            onClick={() => onSubTabChange(tab.id)}
            className={cn(
              "gap-1.5 h-8 text-xs whitespace-nowrap",
              activeSubTab === tab.id 
                ? "bg-teal-600 hover:bg-teal-700 text-white" 
                : "border-slate-200 dark:border-slate-700"
            )}
          >
            <tab.icon className="h-3.5 w-3.5" />
            {isAr ? tab.labelAr : tab.labelEn}
          </Button>
        ))}
      </div>
    </ScrollArea>
  );
}

// ===== HELPER FUNCTIONS =====
export function getContractorCategoryLabel(category: string, isAr: boolean) {
  if (!category) return isAr ? "غير محدد" : "Not specified";
  const labels: Record<string, { ar: string; en: string }> = {
    CIVIL: { ar: "أشغال مدنية", en: "Civil Works" },
    ELECTRICAL: { ar: "أشغال كهربائية", en: "Electrical" },
    MEP: { ar: "كهرباء وميكانيك", en: "MEP" },
    FINISHING: { ar: "تشطيبات", en: "Finishing" },
    PLUMBING: { ar: "سباكة", en: "Plumbing" },
    HVAC: { ar: "تكييف وتبريد", en: "HVAC" },
  };
  return labels[category]?.[isAr ? "ar" : "en"] || category;
}
