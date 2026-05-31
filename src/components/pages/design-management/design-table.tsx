"use client";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import { FileText, Upload, Layers, MoreHorizontal, Eye, ClipboardCheck, Trash2, AlertTriangle } from "lucide-react";
import { DRAWING_STATUS_CONFIG, DISCIPLINE_CONFIG } from "./types";
import type { DesignDrawingItem } from "./types";

interface DesignTableProps {
  language: "ar" | "en";
  drawings: DesignDrawingItem[];
  drawingsLoading: boolean;
  onShowDetail: (drawing: DesignDrawingItem) => void;
  onOpenReview: (drawing: DesignDrawingItem) => void;
  onDeleteDrawing: (drawing: DesignDrawingItem) => void;
  onUploadDrawing: () => void;
}

export function DesignTable({
  language,
  drawings,
  drawingsLoading,
  onShowDetail,
  onOpenReview,
  onDeleteDrawing,
  onUploadDrawing,
}: DesignTableProps) {
  const ar = language === "ar";

  return (
    <Card className="border-slate-200 dark:border-slate-700/50 overflow-hidden">
      <CardContent className="p-0">
        {/* Drawings header */}
        <div className="flex items-center justify-between p-4 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-teal-600 dark:text-teal-400" />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              {ar ? "رسومات المرحلة" : "Phase Drawings"}
            </h3>
            <Badge variant="secondary" className="text-[10px] tabular-nums">
              {drawings.length}
            </Badge>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs border-teal-300 text-teal-700 hover:bg-teal-50 dark:border-teal-700 dark:text-teal-400 dark:hover:bg-teal-900/30"
            onClick={onUploadDrawing}
          >
            <Upload className="h-3 w-3 me-1" />
            {ar ? "رفع رسم" : "Upload Drawing"}
          </Button>
        </div>

        {drawingsLoading ? (
          <div className="flex items-center justify-center py-8 text-slate-400 text-sm">
            {ar ? "جارٍ التحميل..." : "Loading..."}
          </div>
        ) : drawings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
              <Layers className="h-6 w-6 text-slate-400" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-1">
              {ar ? "لا توجد رسومات" : "No drawings"}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {ar ? "ابدأ برفع أول رسم لهذه المرحلة" : "Upload the first drawing for this phase"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent bg-slate-50/80 dark:bg-slate-800/50">
                  <TableHead className="text-xs font-semibold">{ar ? "رقم الرسم" : "Drawing #"}</TableHead>
                  <TableHead className="text-xs font-semibold">{ar ? "العنوان" : "Title"}</TableHead>
                  <TableHead className="text-xs font-semibold">{ar ? "التخصص" : "Discipline"}</TableHead>
                  <TableHead className="text-xs font-semibold text-center">{ar ? "الإصدار" : "Version"}</TableHead>
                  <TableHead className="text-xs font-semibold">{ar ? "الحالة" : "Status"}</TableHead>
                  <TableHead className="text-xs font-semibold">{ar ? "التعارض" : "Clash"}</TableHead>
                  <TableHead className="text-xs font-semibold">{ar ? "المراجعة" : "Review"}</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {drawings.map((drawing) => {
                  const stCfg = DRAWING_STATUS_CONFIG[drawing.status] || DRAWING_STATUS_CONFIG.DRAFT;
                  const discCfg = DISCIPLINE_CONFIG[drawing.discipline] || { labelAr: drawing.discipline, labelEn: drawing.discipline };
                  return (
                    <TableRow
                      key={drawing.id}
                      className={cn(
                        "group even:bg-slate-50/50 dark:even:bg-slate-800/20 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50",
                        drawing.clashDetected && "border-s-red-300 border-s-4 dark:border-s-red-700",
                      )}
                    >
                      <TableCell className="text-xs font-mono text-slate-600 dark:text-slate-400">
                        {drawing.drawingNumber || "-"}
                      </TableCell>
                      <TableCell>
                        <button
                          onClick={() => onShowDetail(drawing)}
                          className="text-sm font-medium text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 hover:underline text-start"
                        >
                          {drawing.title}
                        </button>
                      </TableCell>
                      <TableCell className="text-xs text-slate-600 dark:text-slate-400">
                        {ar ? discCfg.labelAr : discCfg.labelEn}
                      </TableCell>
                      <TableCell className="text-xs text-center">
                        <span className={cn(
                          "inline-flex items-center justify-center min-w-[28px] h-6 rounded-md px-1.5 font-mono tabular-nums",
                          drawing.version >= 3
                            ? "bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400 font-bold"
                            : drawing.version >= 2
                              ? "bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400 font-semibold"
                              : "text-slate-600 dark:text-slate-400"
                        )}>
                          V{drawing.version}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium", stCfg.color)}>
                          {ar ? stCfg.labelAr : stCfg.labelEn}
                        </span>
                      </TableCell>
                      <TableCell>
                        {drawing.clashDetected ? (
                          <TooltipProvider delayDuration={0}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Badge variant="destructive" className="text-[9px] px-1.5 py-0 gap-0.5">
                                  <AlertTriangle className="h-2.5 w-2.5" />
                                  {ar ? "تعارض" : "Clash"}
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="text-[10px] max-w-[200px]">{drawing.clashNotes || (ar ? "يوجد تعارض" : "Clash detected")}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ) : (
                          <span className="text-[10px] text-slate-400">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-slate-500 dark:text-slate-400 max-w-[100px] truncate">
                        {drawing.reviewedBy || "-"}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300" aria-label="More options">
                              <MoreHorizontal className="h-3.5 w-3.5" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align={ar ? "start" : "end"} className="w-40">
                            <DropdownMenuItem onClick={() => onShowDetail(drawing)}>
                              <Eye className="h-3.5 w-3.5 me-2" />
                              {ar ? "التفاصيل" : "Details"}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onOpenReview(drawing)}>
                              <ClipboardCheck className="h-3.5 w-3.5 me-2" />
                              {ar ? "مراجعة" : "Review"}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-red-600 dark:text-red-400"
                              onClick={() => onDeleteDrawing(drawing)}
                            >
                              <Trash2 className="h-3.5 w-3.5 me-2" />
                              {ar ? "حذف" : "Delete"}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
