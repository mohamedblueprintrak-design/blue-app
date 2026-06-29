"use client";


import { useTranslations } from 'next-intl';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Sun,
  Thermometer,
  Users,
  HardHat,
  ClipboardCheck,
  ShieldCheck,
  ShieldAlert,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SupervisionChecklist } from "./types";
import { getStatusBadge, getSeverityBadge, getViolationStatusBadge } from "./supervision-table";

// ===== InfoPill =====
function InfoPill({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50">
      <span className="text-slate-400 dark:text-slate-500">{icon}</span>
      <div className="min-w-0">
        <p className="text-[9px] text-slate-400 dark:text-slate-500 leading-none">{label}</p>
        <p className="text-[11px] font-medium text-slate-700 dark:text-slate-300 leading-none mt-0.5 truncate">{value}</p>
      </div>
    </div>
  );
}

// ===== Detail View =====
interface SupervisionDetailProps {
  ar: boolean;
  viewChecklist: SupervisionChecklist | null;
  onClose: () => void;
  onSubmit: (id: string) => void;
  onApprove: (id: string) => void;
}

export function SupervisionDetail({
  ar,
  viewChecklist,
  onClose,
  onSubmit,
  onApprove,
}: SupervisionDetailProps) {
  const tAuto = useTranslations();
  return (
    <Dialog open={!!viewChecklist} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        {viewChecklist && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {viewChecklist.title || (tAuto('auto.checklist'))}
                {getStatusBadge(viewChecklist.status, ar)}
              </DialogTitle>
              <DialogDescription>
                {viewChecklist.project ? (ar ? viewChecklist.project.name : viewChecklist.project.nameEn || viewChecklist.project.name) : ""} - {new Date(viewChecklist.visitDate).toLocaleDateString(ar ? "ar-AE" : "en-US")}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Info Grid */}
              <div className="grid grid-cols-4 gap-3">
                <InfoPill icon={<Sun className="h-3.5 w-3.5" />} label={tAuto('auto.weather')} value={viewChecklist.weather || "-"} />
                <InfoPill icon={<Thermometer className="h-3.5 w-3.5" />} label={tAuto('auto.temp')} value={viewChecklist.temperature ? `${viewChecklist.temperature}°C` : "-"} />
                <InfoPill icon={<Users className="h-3.5 w-3.5" />} label={tAuto('auto.workers1')} value={viewChecklist.workerCount > 0 ? String(viewChecklist.workerCount) : "-"} />
                <InfoPill icon={<HardHat className="h-3.5 w-3.5" />} label={tAuto('auto.contractor')} value={viewChecklist.contractorName || "-"} />
              </div>

              {/* Overall Progress */}
              <Card className="p-4 bg-gradient-to-r from-brand-navy-50 to-cyan-50 dark:from-brand-navy-950/20 dark:to-cyan-950/20 border-brand-navy-100 dark:border-brand-navy-900/30">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-brand-navy-700 dark:text-brand-navy-300">{tAuto('auto.overallProgress')}</span>
                  <span className="text-lg font-bold text-brand-navy-700 dark:text-brand-navy-300">{Math.round(viewChecklist.progressOverall)}%</span>
                </div>
                <Progress value={viewChecklist.progressOverall} className="h-2 bg-brand-navy-100 dark:bg-brand-navy-900/30" />
              </Card>

              {/* Items */}
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <ClipboardCheck className="h-4 w-4 text-brand-navy-600 dark:text-brand-navy-400" />
                  {tAuto('auto.checklistItems')} ({viewChecklist.items.length})
                </h4>
                <div className="space-y-1.5 max-h-64 overflow-y-auto">
                  {viewChecklist.items.map((item) => (
                    <div key={item.id} className={cn(
                      "flex items-center gap-3 p-2.5 rounded-lg border",
                      item.isChecked && item.compliant ? "border-emerald-200 dark:border-emerald-800/30 bg-emerald-50/50 dark:bg-emerald-950/10" :
                      item.isChecked && !item.compliant ? "border-red-200 dark:border-red-800/30 bg-red-50/50 dark:bg-red-950/10" :
                      "border-slate-200 dark:border-slate-700/50"
                    )}>
                      <div className={cn(
                        "w-5 h-5 rounded-md flex items-center justify-center shrink-0",
                        item.isChecked ? (item.compliant ? "bg-emerald-500 text-white" : "bg-red-500 text-white") : "border border-slate-300 dark:border-slate-600"
                      )}>
                        {item.isChecked && (item.compliant ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-slate-900 dark:text-white line-clamp-1">{item.description}</p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-1">{item.specification}</p>
                      </div>
                      <Badge variant="outline" className="text-[9px] h-5 shrink-0">{item.category}</Badge>
                    </div>
                  ))}
                  {viewChecklist.items.length === 0 && (
                    <p className="text-xs text-slate-400 text-center py-4">{tAuto('auto.noItems')}</p>
                  )}
                </div>
              </div>

              {/* Violations in this checklist */}
              {viewChecklist.violations.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4 text-red-500 dark:text-red-400" />
                    {tAuto('auto.violations')} ({viewChecklist.violations.length})
                  </h4>
                  <div className="space-y-1.5">
                    {viewChecklist.violations.map((v) => (
                      <div key={v.id} className="flex items-start gap-3 p-2.5 rounded-lg border border-red-200 dark:border-red-800/30 bg-red-50/30 dark:bg-red-950/10">
                        <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-slate-700 dark:text-slate-300 line-clamp-2">{v.description}</p>
                          <div className="flex items-center gap-2 mt-1">
                            {getSeverityBadge(v.severity, ar)}
                            {getViolationStatusBadge(v.status, ar)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              {viewChecklist.notes && (
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                  <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1">{tAuto('auto.notes')}</p>
                  <p className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{viewChecklist.notes}</p>
                </div>
              )}
            </div>

            <DialogFooter>
              {viewChecklist.status === "DRAFT" && (
                <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => { onSubmit(viewChecklist.id); onClose(); }}>
                  {tAuto('auto.submit')}
                </Button>
              )}
              {viewChecklist.status === "SUBMITTED" && (
                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => { onApprove(viewChecklist.id); onClose(); }}>
                  <ShieldCheck className="h-4 w-4 me-1" />{tAuto('auto.approve')}
                </Button>
              )}
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
