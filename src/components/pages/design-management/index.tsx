"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToastFeedback } from "@/hooks/use-toast-feedback";
import { getMutationHeaders } from "@/lib/csrf-client";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import { BarChart3, ChevronRight } from "lucide-react";
import { PHASE_ORDER, PHASE_CONFIG, STATUS_CONFIG, formatDate } from "./types";
import type { DesignPhaseItem, DesignDrawingItem, ProjectOption } from "./types";
import { DesignStats } from "./design-stats";
import { DesignFilters } from "./design-filters";
import { DesignTable } from "./design-table";
import { DesignDetail } from "./design-detail";
import { AddPhaseDialog, AddDrawingDialog, ReviewDialog } from "./design-form";

interface DesignManagementProps {
  language: "ar" | "en";
}

export default function DesignManagement({ language }: DesignManagementProps) {
  const ar = language === "ar";
  const queryClient = useQueryClient();
  const toast = useToastFeedback({ ar });

  const [filterProject, setFilterProject] = useState<string>("all");
  const [selectedPhaseId, setSelectedPhaseId] = useState<string | null>(null);
  const [showAddPhaseDialog, setShowAddPhaseDialog] = useState(false);
  const [showAddDrawingDialog, setShowAddDrawingDialog] = useState(false);
  const [showDrawingDetail, setShowDrawingDetail] = useState<DesignDrawingItem | null>(null);
  const [showReviewDialog, setShowReviewDialog] = useState<DesignDrawingItem | null>(null);

  // Queries
  const { data: phases = [], isLoading: phasesLoading } = useQuery<DesignPhaseItem[]>({
    queryKey: ["design-phases", filterProject],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filterProject !== "all") params.set("projectId", filterProject);
      const res = await fetch(`/api/design-phases?${params}`);
      if (!res.ok) throw new Error("Failed to fetch design phases");
      const json = await res.json(); return json.data || json;
    },
  });

  const { data: projects = [] } = useQuery<ProjectOption[]>({
    queryKey: ["projects-list"],
    queryFn: async () => {
      const res = await fetch("/api/projects-simple");
      if (!res.ok) return [];
      const json = await res.json(); return json.data || json;
    },
  });

  const { data: drawings = [], isLoading: drawingsLoading } = useQuery<DesignDrawingItem[]>({
    queryKey: ["design-drawings", selectedPhaseId],
    queryFn: async () => {
      if (!selectedPhaseId) return [];
      const res = await fetch(`/api/design-drawings?designPhaseId=${selectedPhaseId}`);
      if (!res.ok) throw new Error("Failed to fetch drawings");
      const json = await res.json(); return json.data || json;
    },
    enabled: !!selectedPhaseId,
  });

  // Delete drawing mutation
  const deleteDrawingMutation = useMutation({
    mutationFn: async (id: string) => {
      await fetch(`/api/design-drawings/${id}`, { method: "DELETE", headers: getMutationHeaders() });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["design-drawings"] });
      queryClient.invalidateQueries({ queryKey: ["design-phases"] });
      setShowDrawingDetail(null);
      toast.deleted(ar ? "الرسم" : "Drawing");
    },
    onError: () => toast.error(ar ? "حذف الرسم" : "Delete drawing"),
  });

  // Statistics
  const totalDrawings = drawings.length;
  const reviewedCount = drawings.filter((d) => d.status === "APPROVED").length;
  const needsRevisionCount = drawings.filter((d) => d.status === "REJECTED").length;
  const clashCount = drawings.filter((d) => d.clashDetected).length;

  // Handlers
  const handleDeleteDrawing = (drawing: DesignDrawingItem) => {
    if (confirm(ar ? "هل أنت متأكد من الحذف؟" : "Delete this drawing?")) {
      deleteDrawingMutation.mutate(drawing.id);
    }
  };

  const handleOpenReview = (drawing: DesignDrawingItem) => {
    setShowDrawingDetail(null);
    setShowReviewDialog(drawing);
  };

  return (
    <div className="space-y-4">
      <DesignFilters
        language={language}
        filterProject={filterProject}
        onFilterProjectChange={setFilterProject}
        projects={projects}
        phaseCount={phases.length}
        onAddPhase={() => setShowAddPhaseDialog(true)}
      />

      <DesignStats
        language={language}
        totalDrawings={totalDrawings}
        reviewedCount={reviewedCount}
        needsRevisionCount={needsRevisionCount}
        clashCount={clashCount}
      />

      {/* Phase Pipeline Visualization */}
      <Card className="border-slate-200 dark:border-slate-700/50 overflow-hidden">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="h-4 w-4 text-slate-500" />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              {ar ? "خط أنابيب مراحل التصميم" : "Design Phase Pipeline"}
            </h3>
          </div>
          {phasesLoading ? (
            <div className="flex items-center justify-center py-8 text-slate-400 text-sm">
              {ar ? "جارٍ التحميل..." : "Loading..."}
            </div>
          ) : (
            <div className="relative">
              <div className="flex items-stretch gap-2 overflow-x-auto pb-2">
                {PHASE_ORDER.map((phaseKey, idx) => {
                  const phase = phases.find((p) => p.phase === phaseKey);
                  const config = PHASE_CONFIG[phaseKey];
                  const isSelected = selectedPhaseId === phase?.id;
                  const status = phase ? (STATUS_CONFIG[phase.status] || STATUS_CONFIG.not_started) : STATUS_CONFIG.not_started;
                  const drawingCount = phase?.drawings?.length || 0;

                  return (
                    <div key={phaseKey} className="flex items-center gap-2 min-w-0 flex-shrink-0">
                      {idx > 0 && (
                        <div className="flex items-center text-slate-300 dark:text-slate-600 mx-1">
                          <ChevronRight className="h-4 w-4" />
                        </div>
                      )}
                      <TooltipProvider delayDuration={0}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              onClick={() => phase && setSelectedPhaseId(isSelected ? null : phase.id)}
                              className={cn(
                                "flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all min-w-[130px] hover:shadow-md cursor-pointer",
                                isSelected
                                  ? "border-teal-500 bg-teal-50 dark:bg-teal-900/20 shadow-lg shadow-teal-500/10"
                                  : phase
                                    ? "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-teal-300"
                                    : "border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50"
                              )}
                            >
                              <span className="text-xl">{config.icon}</span>
                              <span className={cn(
                                "text-xs font-semibold text-center leading-tight",
                                phase ? "text-slate-900 dark:text-white" : "text-slate-400 dark:text-slate-500"
                              )}>
                                {ar ? config.labelAr : config.labelEn}
                              </span>
                              {phase && (
                                <>
                                  <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium", status.color)}>
                                    <span className={cn("w-1.5 h-1.5 rounded-full", status.dotColor)} />
                                    {ar ? status.labelAr : status.labelEn}
                                  </span>
                                  {drawingCount > 0 && (
                                    <span className="text-[10px] text-slate-500 dark:text-slate-400 tabular-nums">
                                      {drawingCount} {ar ? "رسم" : "drw"}
                                    </span>
                                  )}
                                  {phase.revisionCount > 0 && (
                                    <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium tabular-nums">
                                      {phase.revisionCount}x {ar ? "تعديل" : "rev"}
                                    </span>
                                  )}
                                </>
                              )}
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="bottom">
                            <p className="text-xs font-medium">
                              {ar ? config.labelAr : config.labelEn}
                              {phase && ` — ${ar ? status.labelAr : status.labelEn}`}
                            </p>
                            {phase?.dueDate && (
                              <p className="text-[10px] text-slate-400 mt-0.5">
                                {ar ? "الاستحقاق" : "Due"}: {formatDate(phase.dueDate, ar)}
                              </p>
                            )}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedPhaseId && (
        <DesignTable
          language={language}
          drawings={drawings}
          drawingsLoading={drawingsLoading}
          onShowDetail={setShowDrawingDetail}
          onOpenReview={handleOpenReview}
          onDeleteDrawing={handleDeleteDrawing}
          onUploadDrawing={() => setShowAddDrawingDialog(true)}
        />
      )}

      <AddPhaseDialog
        language={language}
        open={showAddPhaseDialog}
        onOpenChange={setShowAddPhaseDialog}
        filterProject={filterProject}
        onFilterProjectChange={setFilterProject}
        projects={projects}
        phases={phases}
      />

      <AddDrawingDialog
        language={language}
        open={showAddDrawingDialog}
        onOpenChange={setShowAddDrawingDialog}
        selectedPhaseId={selectedPhaseId}
      />

      <DesignDetail
        language={language}
        drawing={showDrawingDetail}
        onClose={() => setShowDrawingDetail(null)}
        onOpenReview={handleOpenReview}
        onDeleteDrawing={handleDeleteDrawing}
      />

      <ReviewDialog
        language={language}
        drawing={showReviewDialog}
        onClose={() => setShowReviewDialog(null)}
      />
    </div>
  );
}
