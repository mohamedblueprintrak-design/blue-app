"use client";


import { useTranslations } from 'next-intl';
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CheckCircle, ClipboardCheck, UserCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { getMutationHeaders } from "@/lib/csrf-client";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
} from "recharts";
import type { BidItem, EvaluationItem } from "./types";
import { EVALUATION_CRITERIA } from "./types";

export function EvaluationDialog({
  bid,
  ar,
  open,
  onClose,
}: {
  bid: BidItem;
  ar: boolean;
  open: boolean;
  onClose: () => void;
}) {
  const tAuto = useTranslations();
  const queryClient = useQueryClient();
  const [scores, setScores] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState("");
  const [evaluatorName, setEvaluatorName] = useState("");
  const [saved, setSaved] = useState(false);

  const { data: existingEvals = [] } = useQuery<EvaluationItem[]>({
    queryKey: ["bid-evaluations", bid.id],
    queryFn: async () => {
      const res = await fetch(`/api/bids/${bid.id}/evaluate`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: open,
  });

  // Derive scores from existing evaluations
  const effectiveScores = useMemo(() => {
    if (Object.keys(scores).length > 0) return scores;
    if (existingEvals.length === 0) return scores;
    const init: Record<string, number> = {};
    existingEvals.forEach((ev) => { init[ev.criteria] = ev.score; });
    return init;
  }, [existingEvals, scores]);

  const totalWeighted = useMemo(() => {
    let total = 0;
    EVALUATION_CRITERIA.forEach((c) => {
      const score = effectiveScores[c.key] || 0;
      total += (score * c.weight) / 100;
    });
    return Math.round(total * 10) / 10;
  }, [effectiveScores]);

  const chartData = useMemo(() => {
    return EVALUATION_CRITERIA.map((c) => ({
      criteria: ar ? c.ar : c.en,
      score: effectiveScores[c.key] || 0,
      fullMark: 100,
    }));
  }, [effectiveScores, ar]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const evaluations = EVALUATION_CRITERIA.map((c) => ({
        criteria: c.key,
        score: effectiveScores[c.key] || 0,
        maxScore: 100,
        weight: c.weight,
        notes: "",
      }));
      const res = await fetch(`/api/bids/${bid.id}/evaluate`, {
        method: "POST",
        headers: getMutationHeaders(),
        body: JSON.stringify({
          evaluations,
          evaluatedBy: evaluatorName || "System",
          technicalScore: scores.technical || 0,
          financialScore: scores.financial || 0,
          evaluationNotes: notes,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bids"] });
      queryClient.invalidateQueries({ queryKey: ["bid-evaluations", bid.id] });
      setSaved(true);
      setTimeout(() => { onClose(); setSaved(false); }, 1200);
    },
  });

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-teal-600" />
            {ar ? `تقييم عطاء - ${bid.contractorName}` : `Evaluate Bid - ${bid.contractorName}`}
          </DialogTitle>
          <DialogDescription>
            {tAuto('auto.scoreEachEvaluationCriterion0100')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Evaluator */}
          <div className="space-y-1">
            <Label className="text-xs flex items-center gap-1.5">
              <UserCheck className="h-3 w-3" />
              {tAuto('auto.evaluator')}
            </Label>
            <Input
              value={evaluatorName}
              onChange={(e) => setEvaluatorName(e.target.value)}
              placeholder={tAuto('auto.evaluatorName')}
              className="h-8 text-sm rounded-lg"
            />
          </div>

          {/* Score Inputs */}
          <div className="space-y-3">
            {EVALUATION_CRITERIA.map((c) => (
              <div key={c.key} className="rounded-lg border border-slate-200 dark:border-slate-700 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium text-slate-900 dark:text-white">
                      {ar ? c.ar : c.en}
                    </span>
                    <span className="text-xs text-slate-400 ms-2">({c.weight}%)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={effectiveScores[c.key] ?? ""}
                      onChange={(e) => setScores({ ...scores, [c.key]: Math.min(100, Math.max(0, Number(e.target.value))) })}
                      className="w-20 h-7 text-sm text-center rounded-lg font-mono"
                      placeholder="0"
                    />
                    <span className="text-xs text-slate-400">/100</span>
                  </div>
                </div>
                <Progress
                  value={effectiveScores[c.key] || 0}
                  className={cn(
                    "h-1.5",
                    (effectiveScores[c.key] || 0) >= 70 ? "[&>div]:bg-emerald-500" :
                    (effectiveScores[c.key] || 0) >= 40 ? "[&>div]:bg-amber-500" :
                    "[&>div]:bg-red-500"
                  )}
                />
              </div>
            ))}
          </div>

          {/* Total Score */}
          <div className="rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 p-4 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-white/70">{tAuto('auto.weightedTotal')}</p>
                <p className="text-3xl font-bold tabular-nums">{totalWeighted}</p>
              </div>
              <div className="text-4xl font-bold text-white/20">/ 100</div>
            </div>
          </div>

          {/* Radar Chart */}
          {Object.keys(effectiveScores).length > 0 && (
            <div className="h-[220px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={chartData}>
                  <PolarGrid stroke="var(--color-slate-200)" />
                  <PolarAngleAxis dataKey="criteria" tick={{ fontSize: 10 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9 }} />
                  <Radar name={tAuto('auto.scores')} dataKey="score" stroke="var(--color-teal-500)" fill="var(--color-teal-500)" fillOpacity={0.3} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-1">
            <Label className="text-xs">{tAuto('auto.evaluationNotes')}</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={tAuto('auto.addEvaluationNotes')}
              className="text-sm min-h-[60px] rounded-lg"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {tAuto('auto.cancel')}
          </Button>
          <Button
            className={cn(
              "rounded-lg text-white",
              saved
                ? "bg-emerald-600 hover:bg-emerald-600"
                : "bg-teal-600 hover:bg-teal-700"
            )}
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || saved}
          >
            {saved ? (
              <><CheckCircle className="h-3.5 w-3.5 me-1" />{tAuto('auto.saved')}</>
            ) : saveMutation.isPending ? (
              tAuto('auto.saving')
            ) : (
              <><ClipboardCheck className="h-3.5 w-3.5 me-1" />{tAuto('auto.saveEvaluation')}</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
