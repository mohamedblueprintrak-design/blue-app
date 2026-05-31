"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { FileText, Eye, History, ClipboardCheck, AlertTriangle, Trash2 } from "lucide-react";
import { DRAWING_STATUS_CONFIG, DISCIPLINE_CONFIG, formatDate } from "./types";
import type { DesignDrawingItem } from "./types";

interface DesignDetailProps {
  language: "ar" | "en";
  drawing: DesignDrawingItem | null;
  onClose: () => void;
  onOpenReview: (drawing: DesignDrawingItem) => void;
  onDeleteDrawing: (drawing: DesignDrawingItem) => void;
}

export function DesignDetail({ language, drawing, onClose, onOpenReview, onDeleteDrawing }: DesignDetailProps) {
  const ar = language === "ar";

  return (
    <Dialog open={!!drawing} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        {drawing && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                {drawing.title}
              </DialogTitle>
              <DialogDescription>
                {drawing.drawingNumber && (
                  <span className="font-mono" dir="ltr">{drawing.drawingNumber}</span>
                )}
                {" — "}
                {ar
                  ? DISCIPLINE_CONFIG[drawing.discipline]?.labelAr || drawing.discipline
                  : DISCIPLINE_CONFIG[drawing.discipline]?.labelEn || drawing.discipline
                }
              </DialogDescription>
            </DialogHeader>

            {/* Drawing Preview Placeholder */}
            <div className="w-full h-48 rounded-xl bg-slate-100 dark:bg-slate-800 border-2 border-dashed border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center gap-2">
              <Eye className="h-8 w-8 text-slate-300 dark:text-slate-600" />
              <span className="text-xs text-slate-400 dark:text-slate-500">
                {ar ? "معاينة الرسم" : "Drawing Preview"}
              </span>
              <span className="text-[10px] text-slate-300 dark:text-slate-600">
                {drawing.filePath
                  ? (ar ? "ملف: " : "File: ") + drawing.filePath
                  : (ar ? "لم يتم رفع ملف بعد" : "No file uploaded yet")
                }
              </span>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mb-1">{ar ? "الحالة" : "Status"}</p>
                <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium", DRAWING_STATUS_CONFIG[drawing.status]?.color)}>
                  {ar ? DRAWING_STATUS_CONFIG[drawing.status]?.labelAr : DRAWING_STATUS_CONFIG[drawing.status]?.labelEn}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mb-1">{ar ? "الإصدار" : "Version"}</p>
                <p className="text-sm font-bold font-mono text-slate-900 dark:text-white">V{drawing.version}</p>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mb-1">{ar ? "التعارض" : "Clash"}</p>
                <div className="flex items-center gap-1.5">
                  <span className={cn("w-2 h-2 rounded-full", drawing.clashDetected ? "bg-red-500" : "bg-emerald-500")} />
                  <span className="text-xs text-slate-700 dark:text-slate-300">
                    {drawing.clashDetected ? (ar ? "يوجد تعارض" : "Detected") : (ar ? "لا يوجد" : "None")}
                  </span>
                </div>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mb-1">{ar ? "المراجع" : "Reviewer"}</p>
                <p className="text-xs text-slate-700 dark:text-slate-300 truncate">{drawing.reviewedBy || "-"}</p>
              </div>
            </div>

            {/* Version History */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <History className="h-4 w-4 text-slate-500" />
                <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                  {ar ? "سجل الإصدارات" : "Version History"}
                </h4>
              </div>
              {drawing.revisions.length === 0 ? (
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 text-center">
                  <p className="text-xs text-slate-400">{ar ? "لا توجد مراجعات سابقة" : "No previous revisions"}</p>
                </div>
              ) : (
                <div className="space-y-1.5 max-h-32 overflow-y-auto">
                  {drawing.revisions.map((rev) => (
                    <div key={rev.id} className="flex items-center gap-3 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 text-xs">
                      <span className="font-mono font-semibold text-teal-600 dark:text-teal-400">V{rev.version}</span>
                      <span className="text-slate-600 dark:text-slate-400 flex-1 truncate">{rev.changeNotes || "-"}</span>
                      <span className="text-[10px] text-slate-400 tabular-nums">{formatDate(rev.createdAt, ar)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Review Notes */}
            {drawing.reviewNotes && (
              <div>
                <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                  <ClipboardCheck className="h-4 w-4 text-slate-500" />
                  {ar ? "ملاحظات المراجعة" : "Review Notes"}
                </h4>
                <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30">
                  <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">{drawing.reviewNotes}</p>
                </div>
              </div>
            )}

            {/* Clash Notes */}
            {drawing.clashDetected && drawing.clashNotes && (
              <div>
                <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  {ar ? "تفاصيل التعارض" : "Clash Details"}
                </h4>
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/30">
                  <p className="text-xs text-red-800 dark:text-red-300 leading-relaxed">{drawing.clashNotes}</p>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenReview(drawing)}>
                <ClipboardCheck className="h-3.5 w-3.5 me-1" />
                {ar ? "مراجعة" : "Review"}
              </Button>
              <Button
                variant="outline"
                className="text-red-600 dark:text-red-400 border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/20"
                onClick={() => onDeleteDrawing(drawing)}
              >
                <Trash2 className="h-3.5 w-3.5 me-1" />
                {ar ? "حذف" : "Delete"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
