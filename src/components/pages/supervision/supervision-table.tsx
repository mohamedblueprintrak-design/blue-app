"use client";


import { useTranslations } from 'next-intl';
import { Badge } from "@/components/ui/badge";
import { StatusIcon } from "@/components/ui/status-icon";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  Eye,
  Trash2,
  MoreHorizontal,
  ClipboardCheck,
  Plus,
  ShieldCheck,
  HardHat,
  Users,
  Sun,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { STAGES, SupervisionChecklist, Violation } from "./types";

// ===== Badge Helpers =====
export function getStatusBadge(status: string, ar: boolean) {
  const map: Record<string, { label: string; className: string }> = {
    DRAFT: { label: ar ? "مسودة" : "Draft", className: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" },
    SUBMITTED: { label: ar ? "مُقدّم" : "Submitted", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
    APPROVED: { label: ar ? "معتمد" : "Approved", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  };
  const info = map[status] || map.DRAFT;
  return <Badge className={cn("text-[10px] h-5 border-0 flex items-center gap-1", info.className)}><StatusIcon status={status} className="h-3 w-3" />{info.label}</Badge>;
}

export function getViolationStatusBadge(status: string, ar: boolean) {
  const map: Record<string, { label: string; className: string; icon: typeof AlertCircle }> = {
    OPEN: { label: ar ? "مفتوح" : "Open", className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400", icon: AlertCircle },
    IN_PROGRESS: { label: ar ? "قيد المعالجة" : "In Progress", className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400", icon: Clock },
    RESOLVED: { label: ar ? "تم الحل" : "Resolved", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400", icon: CheckCircle2 },
    CLOSED: { label: ar ? "مغلق" : "Closed", className: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400", icon: XCircle },
  };
  const info = map[status] || map.OPEN;
  const Icon = info.icon;
  return (
    <Badge className={cn("text-[10px] h-5 border-0 flex items-center gap-1", info.className)}>
      <Icon className="h-3 w-3" />
      {info.label}
    </Badge>
  );
}

export function getSeverityBadge(severity: string, ar: boolean) {
  const map: Record<string, { label: string; className: string }> = {
    LOW: { label: ar ? "منخفض" : "Low", className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
    MEDIUM: { label: ar ? "متوسط" : "Medium", className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
    HIGH: { label: ar ? "مرتفع" : "High", className: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" },
    CRITICAL: { label: ar ? "حرج" : "Critical", className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  };
  const info = map[severity] || map.low;
  return <Badge className={cn("text-[10px] h-5 border-0", info.className)}>{info.label}</Badge>;
}

// ===== CalendarIcon =====
function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
      <line x1="16" x2="16" y1="2" y2="6" />
      <line x1="8" x2="8" y1="2" y2="6" />
      <line x1="3" x2="21" y1="10" y2="10" />
    </svg>
  );
}

// ===== Checklist List =====
interface ChecklistListProps {
  ar: boolean;
  checklists: SupervisionChecklist[];
  isLoading: boolean;
  onViewChecklist: (checklist: SupervisionChecklist) => void;
  onSubmitChecklist: (id: string) => void;
  onApproveChecklist: (id: string) => void;
  onDeleteChecklist: (id: string) => void;
  onCreateNew: () => void;
}

export function ChecklistList({
  ar,
  checklists,
  isLoading,
  onViewChecklist,
  onSubmitChecklist,
  onApproveChecklist,
  onDeleteChecklist,
  onCreateNew,
}: ChecklistListProps) {
  const tAuto = useTranslations();
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="p-4 animate-pulse">
            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/3 mb-3" />
            <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-2/3" />
          </Card>
        ))}
      </div>
    );
  }

  if (checklists.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] text-center">
        <div className="relative mb-4">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-900 flex items-center justify-center border border-slate-200 dark:border-slate-700">
            <ClipboardCheck className="h-9 w-9 text-slate-300 dark:text-slate-600" />
          </div>
          <div className="absolute -bottom-1 -end-1 w-8 h-8 rounded-xl bg-brand-navy-100 dark:bg-brand-navy-900/30 flex items-center justify-center border-2 border-white dark:border-slate-950">
            <Plus className="h-4 w-4 text-brand-navy-600 dark:text-brand-navy-400" />
          </div>
        </div>
        <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-1">{tAuto('auto.noChecklistsFound')}</h3>
        <p className="text-sm text-slate-500 mb-4 max-w-xs">
          {tAuto('auto.createANewSupervisionChecklistToTrackWor')}
        </p>
        <Button className="bg-brand-navy-600 hover:bg-brand-navy-700 text-white rounded-lg shadow-sm shadow-brand-navy-600/20" onClick={onCreateNew}>
          <Plus className="h-4 w-4 me-1.5" />
          {tAuto('auto.newChecklist')}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3 max-h-[calc(100vh-380px)] overflow-y-auto">
      {checklists.map((checklist) => {
        const checkedCount = checklist.items.filter(i => i.isChecked).length;
        const totalCount = checklist.items.length;
        const violationCount = checklist.violations.length;
        const stageLabel = STAGES.find(s => s.key === checklist.stage);
        const hasNonCompliant = checklist.items.some(i => !i.compliant && i.isChecked);

        return (
          <Card key={checklist.id} className={cn(
            "p-4 bg-white dark:bg-slate-900 hover:shadow-md transition-shadow group cursor-pointer",
            hasNonCompliant ? "border-orange-200 dark:border-orange-800/50" : "border-slate-200 dark:border-slate-700/50"
          )} onClick={() => onViewChecklist(checklist)}>
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2 flex-wrap">
                {stageLabel && (
                  <Badge variant="outline" className="text-[10px] h-5 border-brand-navy-300 dark:border-brand-navy-700 text-brand-navy-600 dark:text-brand-navy-400">
                    {ar ? stageLabel.ar : stageLabel.en}
                  </Badge>
                )}
                {getStatusBadge(checklist.status, ar)}
                {violationCount > 0 && (
                  <Badge variant="outline" className="text-[10px] h-5 border-red-300 dark:border-red-700 text-red-600 dark:text-red-400">
                    <AlertTriangle className="h-2.5 w-2.5 me-0.5" />
                    {violationCount} {tAuto('auto.violations1')}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => { e.stopPropagation(); onViewChecklist(checklist); }} aria-label="View checklist">
                  <Eye className="h-3.5 w-3.5" />
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <button className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" aria-label="More options">
                      <MoreHorizontal className="h-3.5 w-3.5" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align={ar ? "start" : "end"} className="w-36">
                    {checklist.status === "DRAFT" && (
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onSubmitChecklist(checklist.id); }}>
                        <CheckCircle2 className="h-3.5 w-3.5 me-2 text-blue-500" />
                        {tAuto('auto.submit')}
                      </DropdownMenuItem>
                    )}
                    {checklist.status === "SUBMITTED" && (
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onApproveChecklist(checklist.id); }}>
                        <ShieldCheck className="h-3.5 w-3.5 me-2 text-emerald-500" />
                        {tAuto('auto.approve')}
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem className="text-red-600 dark:text-red-400" onClick={(e) => { e.stopPropagation(); if (confirm(tAuto('auto.deleteThisChecklist'))) onDeleteChecklist(checklist.id); }}>
                      <Trash2 className="h-3.5 w-3.5 me-2" />
                      {tAuto('auto.delete')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-1 line-clamp-1">
              {checklist.title || (tAuto('auto.checklist'))}
            </h3>

            <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 mb-3">
              <span className="flex items-center gap-1">
                <CalendarIcon className="h-3 w-3" />
                {new Date(checklist.visitDate).toLocaleDateString(ar ? "ar-AE" : "en-US")}
              </span>
              {checklist.contractorName && (
                <span className="flex items-center gap-1">
                  <HardHat className="h-3 w-3" />
                  {checklist.contractorName}
                </span>
              )}
              {checklist.workerCount > 0 && (
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {checklist.workerCount}
                </span>
              )}
              {checklist.weather && (
                <span className="flex items-center gap-1">
                  <Sun className="h-3 w-3" />
                  {checklist.weather}
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              <Progress
                value={totalCount > 0 ? (checkedCount / totalCount) * 100 : 0}
                className={cn("h-1.5 flex-1", hasNonCompliant ? "bg-orange-100 dark:bg-orange-900/30 [&>div]:bg-orange-500" : "bg-slate-100 dark:bg-slate-800")}
              />
              <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 shrink-0">
                {checkedCount}/{totalCount}
              </span>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

// ===== Violations Table =====
interface ViolationsTableProps {
  ar: boolean;
  violations: Violation[];
  isLoading: boolean;
  onUpdateViolationStatus: (id: string, status: string) => void;
  onDeleteViolation: (id: string) => void;
}

export function ViolationsTable({
  ar,
  violations,
  isLoading,
  onUpdateViolationStatus,
  onDeleteViolation,
}: ViolationsTableProps) {
  const tAuto = useTranslations();
  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="p-4 animate-pulse">
            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/3 mb-3" />
            <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-2/3" />
          </Card>
        ))}
      </div>
    );
  }

  if (violations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[30vh] text-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-100 to-green-50 dark:from-emerald-900/30 dark:to-green-950/20 flex items-center justify-center mb-3">
          <ShieldCheck className="h-7 w-7 text-emerald-400" />
        </div>
        <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-1">{tAuto('auto.noViolationsFound')}</h3>
        <p className="text-sm text-slate-500">{tAuto('auto.noViolationsHaveBeenRecordedYet')}</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
      <div className="max-h-[calc(100vh-380px)] overflow-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50 dark:bg-slate-800/50">
              <TableHead className="text-[11px] h-8">{tAuto('auto.type')}</TableHead>
              <TableHead className="text-[11px] h-8">{tAuto('auto.description')}</TableHead>
              <TableHead className="text-[11px] h-8">{tAuto('auto.severity')}</TableHead>
              <TableHead className="text-[11px] h-8">{tAuto('auto.status1')}</TableHead>
              <TableHead className="text-[11px] h-8">{tAuto('auto.contractor')}</TableHead>
              <TableHead className="text-[11px] h-8">{tAuto('auto.deadline')}</TableHead>
              <TableHead className="text-[11px] h-8 w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {violations.map((violation) => (
              <TableRow key={violation.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                <TableCell className="text-xs py-2.5">
                  <Badge variant="outline" className="text-[9px] h-5">
                    {ar ? ({safety: "سلامة", quality: "جودة", specification: "مواصفات", ENVIRONMENTAL: "بيئة"} as Record<string, string>)[violation.type] || violation.type : violation.type}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs py-2.5 max-w-[200px]">
                  <p className="line-clamp-2 text-slate-700 dark:text-slate-300">{violation.description}</p>
                </TableCell>
                <TableCell className="text-xs py-2.5">{getSeverityBadge(violation.severity, ar)}</TableCell>
                <TableCell className="text-xs py-2.5">
                  <Select
                    value={violation.status}
                    onValueChange={(v) => onUpdateViolationStatus(violation.id, v)}
                  >
                    <SelectTrigger className={cn("h-6 w-auto border-0 p-0 text-[10px] font-medium bg-transparent shadow-none focus:ring-0")}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="OPEN">{tAuto('auto.open')}</SelectItem>
                      <SelectItem value="IN_PROGRESS">{tAuto('auto.inProgress')}</SelectItem>
                      <SelectItem value="RESOLVED">{tAuto('auto.resolved')}</SelectItem>
                      <SelectItem value="CLOSED">{tAuto('auto.closed')}</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="text-xs py-2.5 text-slate-500">{violation.contractorName || "-"}</TableCell>
                <TableCell className="text-xs py-2.5 text-slate-500">
                  {violation.deadline ? new Date(violation.deadline).toLocaleDateString(ar ? "ar-AE" : "en-US") : "-"}
                </TableCell>
                <TableCell className="text-xs py-2.5">
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-slate-400 hover:text-red-500" onClick={() => onDeleteViolation(violation.id)} aria-label="Delete violation">
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
