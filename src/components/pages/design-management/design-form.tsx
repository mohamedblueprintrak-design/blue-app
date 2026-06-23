"use client";


import { useTranslations } from 'next-intl';
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToastFeedback } from "@/hooks/use-toast-feedback";
import { getMutationHeaders } from "@/lib/csrf-client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, XCircle, ClipboardCheck, Sparkles, GitCompareArrows } from "lucide-react";
import { PHASE_ORDER, PHASE_CONFIG, DISCIPLINE_CONFIG, REVIEW_CHECKLIST } from "./types";
import type { DesignPhaseItem, DesignDrawingItem, ProjectOption } from "./types";

// ===== Add Phase Dialog =====
interface AddPhaseDialogProps {
  language: "ar" | "en";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filterProject: string;
  onFilterProjectChange: (value: string) => void;
  projects: ProjectOption[];
  phases: DesignPhaseItem[];
}

export function AddPhaseDialog({
  language, open, onOpenChange, filterProject, onFilterProjectChange, projects, phases,
}: AddPhaseDialogProps) {
  const tAuto = useTranslations();
  const ar = language === "ar";
  const queryClient = useQueryClient();
  const toast = useToastFeedback({ ar });

  const createPhaseMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await fetch("/api/design-phases", {
        method: "POST",
        headers: getMutationHeaders(),
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["design-phases"] });
      onOpenChange(false);
      toast.created(tAuto('auto.phase'));
    },
    onError: () => toast.error(tAuto('auto.createPhase')),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{tAuto('auto.addDesignPhase')}</DialogTitle>
          <DialogDescription>{tAuto('auto.selectPhaseAndProject')}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm">{tAuto('auto.project')} *</Label>
            <Select
              value={filterProject !== "all" ? filterProject : ""}
              onValueChange={(v) => onFilterProjectChange(v)}
            >
              <SelectTrigger>
                <SelectValue placeholder={tAuto('auto.selectProject')} />
              </SelectTrigger>
              <SelectContent>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {ar ? p.name : p.nameEn || p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-sm">{tAuto('auto.phase')} *</Label>
            <Select
              value=""
              onValueChange={(v) => {
                const existing = phases.find((p) => p.phase === v);
                if (existing) {
                  toast.error(tAuto('auto.phaseAlreadyExists'));
                  return;
                }
                const config = PHASE_CONFIG[v];
                createPhaseMutation.mutate({
                  projectId: filterProject !== "all" ? filterProject : projects[0]?.id,
                  phase: v,
                  phaseNameAr: config?.labelAr || "",
                  phaseNameEn: config?.labelEn || "",
                });
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder={tAuto('auto.selectPhase')} />
              </SelectTrigger>
              <SelectContent>
                {PHASE_ORDER.filter((pk) => !phases.some((p) => p.phase === pk)).map((pk) => {
                  const cfg = PHASE_CONFIG[pk];
                  return (
                    <SelectItem key={pk} value={pk}>
                      <span className="flex items-center gap-2">
                        <span>{cfg.icon}</span>
                        {ar ? cfg.labelAr : cfg.labelEn}
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {tAuto('auto.cancel')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ===== Add Drawing Dialog =====
interface AddDrawingDialogProps {
  language: "ar" | "en";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedPhaseId: string | null;
}

export function AddDrawingDialog({ language, open, onOpenChange, selectedPhaseId }: AddDrawingDialogProps) {
  const tAuto = useTranslations();
  const ar = language === "ar";
  const queryClient = useQueryClient();
  const toast = useToastFeedback({ ar });
  const [newDrawing, setNewDrawing] = useState({ title: "", drawingNumber: "", discipline: "" });

  const createDrawingMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await fetch("/api/design-drawings", {
        method: "POST",
        headers: getMutationHeaders(),
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["design-drawings"] });
      queryClient.invalidateQueries({ queryKey: ["design-phases"] });
      onOpenChange(false);
      setNewDrawing({ title: "", drawingNumber: "", discipline: "" });
      toast.created(tAuto('auto.drawing'));
    },
    onError: () => toast.error(tAuto('auto.createDrawing')),
  });

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) setNewDrawing({ title: "", drawingNumber: "", discipline: "" }); onOpenChange(v); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{tAuto('auto.uploadNewDrawing')}</DialogTitle>
          <DialogDescription>{tAuto('auto.enterNewDrawingDetails')}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm">{tAuto('auto.title')} *</Label>
            <Input
              value={newDrawing.title}
              onChange={(e) => setNewDrawing({ ...newDrawing, title: e.target.value })}
              placeholder={tAuto('auto.eGGroundFloorPlan')}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-sm">{tAuto('auto.drawing1')}</Label>
              <Input
                value={newDrawing.drawingNumber}
                onChange={(e) => setNewDrawing({ ...newDrawing, drawingNumber: e.target.value })}
                placeholder={tAuto('auto.a001')}
                dir="ltr"
                className="text-left"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">{tAuto('auto.discipline')}</Label>
              <Select
                value={newDrawing.discipline}
                onValueChange={(v) => setNewDrawing({ ...newDrawing, discipline: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={tAuto('auto.select1')} />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(DISCIPLINE_CONFIG).map(([key, val]) => (
                    <SelectItem key={key} value={key}>
                      {ar ? val.labelAr : val.labelEn}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { onOpenChange(false); setNewDrawing({ title: "", drawingNumber: "", discipline: "" }); }}>
            {tAuto('auto.cancel')}
          </Button>
          <Button
            className="bg-teal-600 hover:bg-teal-700 text-white"
            disabled={!newDrawing.title || !selectedPhaseId || createDrawingMutation.isPending}
            onClick={() => {
              createDrawingMutation.mutate({
                designPhaseId: selectedPhaseId,
                title: newDrawing.title,
                drawingNumber: newDrawing.drawingNumber,
                discipline: newDrawing.discipline,
              });
              setNewDrawing({ title: "", drawingNumber: "", discipline: "" });
            }}
          >
            {createDrawingMutation.isPending
              ? (tAuto('auto.creating'))
              : (tAuto('auto.create'))}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ===== Review Dialog =====
interface ReviewDialogProps {
  language: "ar" | "en";
  drawing: DesignDrawingItem | null;
  onClose: () => void;
}

export function ReviewDialog({ language, drawing, onClose }: ReviewDialogProps) {
  const tAuto = useTranslations();
  const ar = language === "ar";
  const queryClient = useQueryClient();
  const toast = useToastFeedback({ ar });
  const [reviewChecklist, setReviewChecklist] = useState<Record<string, boolean>>({});
  const [reviewNotesText, setReviewNotesText] = useState("");
  const [clashFlag, setClashFlag] = useState(false);
  const [clashNotesText, setClashNotesText] = useState("");

  const updateDrawingMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      const res = await fetch(`/api/design-drawings/${id}`, {
        method: "PUT",
        headers: getMutationHeaders(),
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["design-drawings"] });
      queryClient.invalidateQueries({ queryKey: ["design-phases"] });
      toast.updated(tAuto('auto.drawing'));
    },
    onError: () => toast.error(tAuto('auto.updateDrawing')),
  });

  const handleOpen = (open: boolean) => {
    if (!open) {
      onClose();
      setReviewChecklist({});
      setReviewNotesText("");
      setClashFlag(false);
      setClashNotesText("");
    }
  };

  // Reset state when drawing changes
  const handleDrawingChange = () => {
    if (drawing) {
      setClashFlag(drawing.clashDetected);
      setClashNotesText(drawing.clashNotes);
    }
  };

  // We need to initialize clash state when the dialog opens with a new drawing
  const isOpen = !!drawing;
  if (isOpen && drawing && clashFlag !== drawing.clashDetected && Object.keys(reviewChecklist).length === 0) {
    handleDrawingChange();
  }

  const submitReview = () => {
    if (!drawing) return;
    const allChecked = Object.values(reviewChecklist).every(Boolean);
    const newStatus = allChecked ? "APPROVED" : "REJECTED";
    updateDrawingMutation.mutate({
      id: drawing.id,
      data: {
        status: newStatus,
        reviewNotes: reviewNotesText,
        reviewedAt: new Date().toISOString(),
        clashDetected: clashFlag,
        clashNotes: clashNotesText,
        ...(allChecked ? { version: drawing.version + 1 } : {}),
      },
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpen}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        {drawing && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ClipboardCheck className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                {tAuto('auto.reviewDrawing')}
              </DialogTitle>
              <DialogDescription>
                {drawing.title}
                <span className="font-mono ms-2 text-xs" dir="ltr">V{drawing.version}</span>
              </DialogDescription>
            </DialogHeader>

            {/* Review Checklist */}
            <div>
              <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-500" />
                {tAuto('auto.reviewChecklist')}
              </h4>
              <div className="space-y-2">
                {REVIEW_CHECKLIST.map((item) => (
                  <label
                    key={item.id}
                    className={cn(
                      "flex items-center gap-3 p-2.5 rounded-lg border transition-colors cursor-pointer",
                      reviewChecklist[item.id]
                        ? "border-emerald-200 bg-emerald-50/50 dark:border-emerald-800/50 dark:bg-emerald-900/10"
                        : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                    )}
                  >
                    <Checkbox
                      checked={reviewChecklist[item.id] || false}
                      onCheckedChange={(checked) =>
                        setReviewChecklist((prev) => ({ ...prev, [item.id]: !!checked }))
                      }
                    />
                    <span className="text-sm text-slate-700 dark:text-slate-300">
                      {ar ? item.labelAr : item.labelEn}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <Separator />

            {/* Clash Detection */}
            <div>
              <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                <GitCompareArrows className="h-4 w-4 text-red-500" />
                {tAuto('auto.clashDetection')}
              </h4>
              <label className="flex items-center gap-3 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer mb-3">
                <Checkbox
                  checked={clashFlag}
                  onCheckedChange={(checked) => setClashFlag(!!checked)}
                />
                <span className="text-sm text-slate-700 dark:text-slate-300">
                  {tAuto('auto.clashDetected')}
                </span>
              </label>
              {clashFlag && (
                <Textarea
                  value={clashNotesText}
                  onChange={(e) => setClashNotesText(e.target.value)}
                  placeholder={tAuto('auto.describeTheDetectedClash')}
                  className="min-h-[60px] text-sm"
                />
              )}
            </div>

            <Separator />

            {/* Review Notes */}
            <div>
              <Label className="text-sm mb-2 block">{tAuto('auto.reviewNotes')}</Label>
              <Textarea
                value={reviewNotesText}
                onChange={(e) => setReviewNotesText(e.target.value)}
                placeholder={tAuto('auto.addYourReviewNotes')}
                className="min-h-[80px] text-sm"
              />
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => handleOpen(false)}>
                {tAuto('auto.cancel')}
              </Button>
              <Button
                variant="outline"
                className="border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
                onClick={() => {
                  if (!drawing) return;
                  updateDrawingMutation.mutate({
                    id: drawing.id,
                    data: {
                      status: "REJECTED",
                      reviewNotes: reviewNotesText,
                      reviewedAt: new Date().toISOString(),
                      clashDetected: clashFlag,
                      clashNotes: clashNotesText,
                    },
                  });
                  onClose();
                }}
                disabled={updateDrawingMutation.isPending}
              >
                <XCircle className="h-3.5 w-3.5 me-1" />
                {tAuto('auto.reject')}
              </Button>
              <Button
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={submitReview}
                disabled={updateDrawingMutation.isPending}
              >
                <CheckCircle2 className="h-3.5 w-3.5 me-1" />
                {tAuto('auto.approve')}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
