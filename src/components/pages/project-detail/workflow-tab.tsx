"use client";

import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { StatusIcon } from "@/components/ui/status-icon";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { getMutationHeaders } from "@/lib/csrf-client";
import {
  GitBranch,
  CheckCircle2,
  Clock,
  Play,
  RotateCcw,
  Circle,
  CheckSquare,
  TrendingUp,
  Activity,
} from "lucide-react";
import { toast } from "sonner";
import { StatCard } from "./helpers";
import type { WorkflowData } from "./types";

// ===== WORKFLOW TAB =====
export default function WorkflowTab({ projectId, language }: { projectId: string; language: "ar" | "en" }) {
  const isAr = language === "ar";
  const t = (ar: string, en: string) => (isAr ? ar : en);
  const [selectedStageIdx, setSelectedStageIdx] = useState(0);

  const { data: workflow, isLoading, refetch } = useQuery({
    queryKey: ["project-workflow", projectId],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/workflow`);
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      if (data && typeof data === "object") {
        if ("workflow" in data) {
          return data.workflow as WorkflowData | null;
        }
        return data as WorkflowData | null;
      }
      return null;
    },
    enabled: !!projectId,
  });

  const initMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/workflow/init`, { method: "POST", headers: getMutationHeaders() });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => { refetch(); toast.success(t("تم إنشاء سير العمل", "Workflow initialized")); },
    onError: () => toast.error(t("فشل إنشاء سير العمل", "Failed to initialize")),
  });

  const actionMutation = useMutation({
    mutationFn: async ({ stepId, action, notes }: { stepId: string; action: string; notes?: string }) => {
      const stage = workflow?.stages?.[selectedStageIdx];
      const res = await fetch(`/api/projects/${projectId}/workflow/stages/${stage?.id}/steps/${stepId}/action`, {
        method: "POST",
        headers: getMutationHeaders(),
        body: JSON.stringify({ action, userId: "system", notes }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => { refetch(); toast.success(t("تم تنفيذ الإجراء", "Action executed")); },
    onError: () => toast.error(t("فشل تنفيذ الإجراء", "Action failed")),
  });

  const stages = workflow?.stages || [];
  const currentStage = stages[selectedStageIdx];
  const progressPct = workflow?.progress || 0;

  const getStageStatusColor = (status: string) => {
    switch (status) {
      case "COMPLETED": return "bg-emerald-500 text-white border-emerald-500";
      case "IN_PROGRESS": return "bg-teal-500 text-white border-teal-500 ring-2 ring-teal-200";
      case "PENDING": return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-300";
      default: return "bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500 border-slate-200";
    }
  };

  const getStepStatusBadge = (status: string) => {
    switch (status) {
      case "COMPLETED": return <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-[10px] border-0 flex items-center gap-1"><StatusIcon status="completed" className="h-3 w-3" />{t("مكتمل", "Done")}</Badge>;
      case "IN_PROGRESS": return <Badge className="bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400 text-[10px] border-0 flex items-center gap-1"><StatusIcon status="in_progress" className="h-3 w-3" />{t("قيد التنفيذ", "In Progress")}</Badge>;
      case "PENDING": return <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-[10px] border-0 flex items-center gap-1"><StatusIcon status="pending" className="h-3 w-3" />{t("بانتظار", "Pending")}</Badge>;
      case "returned": return <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 text-[10px] border-0 flex items-center gap-1"><StatusIcon status="rejected" className="h-3 w-3" />{t("معاد", "Returned")}</Badge>;
      default: return <Badge className="bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 text-[10px] border-0 flex items-center gap-1"><StatusIcon status="locked" className="h-3 w-3" />{t("مقفل", "Locked")}</Badge>;
    }
  };

  if (isLoading) {
    return <div className="space-y-4"><Skeleton className="h-40 rounded-xl" /><Skeleton className="h-64 rounded-xl" /></div>;
  }

  if (!workflow) {
    return (
      <Card className="border-slate-200 dark:border-slate-700/50">
        <CardContent className="py-16 text-center">
          <GitBranch className="h-16 w-16 mx-auto mb-4 text-slate-300 dark:text-slate-600" />
          <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-2">{t("سير العمل", "Workflow")}</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto mb-4">
            {t("لم يتم إنشاء سير العمل لهذا المشروع بعد. اضغط لإنشاء سير عمل تلقائي من القالب الافتراضي.", "Workflow has not been created yet. Click to initialize from the default template.")}
          </p>
          <Button onClick={() => initMutation.mutate()} disabled={initMutation.isPending} className="bg-teal-600 hover:bg-teal-700 gap-2">
            <Play className="h-4 w-4" />
            {initMutation.isPending ? t("جارٍ الإنشاء...", "Creating...") : t("إنشاء سير العمل", "Initialize Workflow")}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Progress Header */}
      <Card className="border-slate-200 dark:border-slate-700/50 overflow-hidden">
        <div className="bg-gradient-to-r from-teal-600 to-cyan-500 p-4 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                <GitBranch className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm">{workflow.template?.name || t("سير العمل", "Workflow")}</h3>
                <p className="text-xs text-white/70">{t("المرحلة الحالية", "Current Stage")}: {stages.find(s => s.status === "IN_PROGRESS" || s.status === "PENDING")?.name || "—"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-end">
                <span className="text-2xl font-bold">{Math.round(progressPct)}%</span>
                <p className="text-[10px] text-white/60">{t("الإنجاز", "Progress")}</p>
              </div>
            </div>
          </div>
          <Progress value={progressPct} className="h-1.5 mt-3 bg-white/20" />
        </div>
      </Card>

      {/* Horizontal Stage Pipeline */}
      <Card className="border-slate-200 dark:border-slate-700/50">
        <CardContent className="p-4">
          <div className="overflow-x-auto pb-2">
            <div className="flex items-center gap-1 min-w-max">
              {stages.map((stage, idx) => {
                const isActive = idx === selectedStageIdx;
                return (
                  <React.Fragment key={stage.id}>
                    <button
                      onClick={() => setSelectedStageIdx(idx)}
                      className={cn(
                        "flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap",
                        getStageStatusColor(stage.status),
                        isActive && "ring-2 ring-offset-1 dark:ring-offset-slate-900"
                      )}
                    >
                      {stage.status === "COMPLETED" ? <CheckCircle2 className="h-3.5 w-3.5" /> :
                       stage.status === "IN_PROGRESS" ? <Clock className="h-3.5 w-3.5" /> :
                       <span className="w-3.5 h-3.5 rounded-full border-2 border-current opacity-50" />}
                      <span>{isAr ? stage.name : stage.nameEn || stage.name}</span>
                    </button>
                    {idx < stages.length - 1 && (
                      <div className={cn("w-4 h-0.5 rounded", stage.status === "COMPLETED" ? "bg-emerald-400" : "bg-slate-200 dark:bg-slate-700")} />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Selected Stage Steps */}
      {currentStage && (
        <Card className="border-slate-200 dark:border-slate-700/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", currentStage.status === "COMPLETED" ? "bg-emerald-100 text-emerald-600" : "bg-teal-100 text-teal-600")}>
                  {currentStage.status === "COMPLETED" ? <CheckCircle2 className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                </div>
                <div>
                  <span>{isAr ? currentStage.name : currentStage.nameEn || currentStage.name}</span>
                  <p className="text-[10px] text-slate-400 font-normal">
                    {t("المرحلة", "Stage")} {selectedStageIdx + 1}/{stages.length}
                    {currentStage.dueDate && ` • ${t("الموعد", "Due")}: ${new Date(currentStage.dueDate).toLocaleDateString(isAr ? "ar-AE" : "en-US")}`}
                  </p>
                </div>
              </CardTitle>
              {getStepStatusBadge(currentStage.status)}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {currentStage.steps.map((step) => (
                <div key={step.id} className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border transition-all",
                  step.status === "COMPLETED" ? "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/50" :
                  step.status === "IN_PROGRESS" ? "bg-teal-50 dark:bg-teal-950/20 border-teal-200 dark:border-teal-800/50" :
                  step.status === "PENDING" ? "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700" :
                  "bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-800 opacity-60"
                )}>
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                    step.status === "COMPLETED" ? "bg-emerald-100 text-emerald-600" :
                    step.status === "IN_PROGRESS" ? "bg-teal-100 text-teal-600" :
                    step.status === "PENDING" ? "bg-amber-100 text-amber-600" :
                    "bg-slate-100 text-slate-400"
                  )}>
                    {step.status === "COMPLETED" ? <CheckCircle2 className="h-4 w-4" /> :
                     step.status === "IN_PROGRESS" ? <Play className="h-3.5 w-3.5" /> :
                     step.status === "returned" ? <RotateCcw className="h-4 w-4" /> :
                     <Circle className="h-3.5 w-3.5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">
                        {isAr ? step.name : step.nameEn || step.name}
                      </span>
                      {getStepStatusBadge(step.status)}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      {step.assignee && <span className="text-[10px] text-slate-400">{step.assignee.name}</span>}
                      {step.assignedRole && !step.assignee && <span className="text-[10px] text-slate-400 italic">{step.assignedRole}</span>}
                      {step.dueDate && <span className="text-[10px] text-slate-400">{new Date(step.dueDate).toLocaleDateString(isAr ? "ar-AE" : "en-US")}</span>}
                    </div>
                    {step.returnReason && <p className="text-[10px] text-red-500 mt-1">{step.returnReason}</p>}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {step.status === "PENDING" && (
                      <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1 bg-teal-600 text-white border-0 hover:bg-teal-700"
                        onClick={() => actionMutation.mutate({ stepId: step.id, action: "start" })}>
                        <Play className="h-3 w-3" />{t("بدء", "Start")}
                      </Button>
                    )}
                    {step.status === "IN_PROGRESS" && (
                      <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1 bg-emerald-600 text-white border-0 hover:bg-emerald-700"
                        onClick={() => actionMutation.mutate({ stepId: step.id, action: "complete" })}>
                        <CheckCircle2 className="h-3 w-3" />{t("إكمال", "Complete")}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label={t("المراحل", "Stages")} value={`${stages.filter(s => s.status === "COMPLETED").length}/${stages.length}`} icon={GitBranch} color="bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400" />
        <StatCard label={t("الخطوات", "Steps")} value={`${workflow.progressData?.completedSteps || 0}/${workflow.progressData?.totalSteps || 0}`} icon={CheckSquare} color="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400" />
        <StatCard label={t("المكتمل", "Completed")} value={`${Math.round(progressPct)}%`} icon={TrendingUp} color="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" />
        <StatCard label={t("الحالة", "Status")} value={workflow.status === "COMPLETED" ? t("مكتمل", "Done") : t("نشط", "Active")} icon={Activity} color="bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400" />
      </div>
    </div>
  );
}
