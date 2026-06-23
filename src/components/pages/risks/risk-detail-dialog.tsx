"use client";


import { useTranslations } from 'next-intl';
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ShieldAlert } from "lucide-react";
import { getCategoryBadge, getStrategyBadge, getStatusBadge, getScoreColor } from "./helpers";
import type { RiskItem } from "./types";

interface RiskDetailDialogProps {
  ar: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedRisk: RiskItem | null;
  toggleActionMutation: {
    mutate: (data: { actionId: string; completed: boolean }) => void;
  };
}

export function RiskDetailDialog({
  ar,
  open,
  onOpenChange,
  selectedRisk,
  toggleActionMutation,
}: RiskDetailDialogProps) {
  const tAuto = useTranslations();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        {selectedRisk && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-teal-500" />
                {selectedRisk.title}
              </DialogTitle>
              <DialogDescription>
                {selectedRisk.project ? (ar ? selectedRisk.project.name : selectedRisk.project.nameEn || selectedRisk.project.name) : ""}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Risk Info */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 text-center">
                  <div className="text-[10px] text-slate-500">{tAuto('auto.probability')}</div>
                  <div className="text-lg font-bold text-slate-900 dark:text-white">{selectedRisk.probability}</div>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 text-center">
                  <div className="text-[10px] text-slate-500">{tAuto('auto.impact')}</div>
                  <div className="text-lg font-bold text-slate-900 dark:text-white">{selectedRisk.impact}</div>
                </div>
                <div className={`rounded-lg p-3 text-center ${getScoreColor(selectedRisk.score)} bg-opacity-20`}>
                  <div className="text-[10px] text-slate-500">{tAuto('auto.score')}</div>
                  <Badge className={`text-sm font-bold ${getScoreColor(selectedRisk.score)} text-white border-0 h-7`}>
                    {selectedRisk.score}
                  </Badge>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 text-center">
                  <div className="text-[10px] text-slate-500">{tAuto('auto.status1')}</div>
                  <div className="mt-1">{getStatusBadge(selectedRisk.status, ar)}</div>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {getCategoryBadge(selectedRisk.category, ar)}
                {getStrategyBadge(selectedRisk.strategy, ar)}
              </div>

              {selectedRisk.mitigationPlan && (
                <div className="space-y-1.5">
                  <div className="text-xs font-medium text-slate-600 dark:text-slate-400">
                    {tAuto('auto.mitigationPlan')}
                  </div>
                  <p className="text-sm text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3">
                    {selectedRisk.mitigationPlan}
                  </p>
                </div>
              )}

              <Separator />

              {/* Action Items */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  {tAuto('auto.actionItems')} ({selectedRisk.actions.length})
                </Label>

                {selectedRisk.actions.length === 0 ? (
                  <div className="text-center py-3 border border-dashed border-slate-200 dark:border-slate-700 rounded-lg">
                    <p className="text-xs text-slate-400">{tAuto('auto.noActionItems')}</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedRisk.actions.map((action) => (
                      <div
                        key={action.id}
                        className={`p-3 rounded-lg border ${
                          action.completed
                            ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800/50"
                            : "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700"
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <Checkbox
                            checked={action.completed}
                            onCheckedChange={(checked) => {
                              toggleActionMutation.mutate({ actionId: action.id, completed: checked === true });
                            }}
                            className="mt-0.5 h-4 w-4"
                          />
                          <div className="flex-1 min-w-0">
                            <p className={`text-xs ${action.completed ? "line-through text-slate-400" : "text-slate-900 dark:text-white"}`}>
                              {action.description}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              {action.assignee && (
                                <span className="text-[10px] text-slate-500">
                                  {action.assignee.name}
                                </span>
                              )}
                              {action.dueDate && (
                                <span className="text-[10px] text-slate-400">
                                  {new Date(action.dueDate).toLocaleDateString(ar ? "ar-AE" : "en-US", { month: "short", day: "numeric" })}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
