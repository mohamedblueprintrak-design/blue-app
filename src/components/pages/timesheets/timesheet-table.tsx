"use client";


import { useTranslations } from 'next-intl';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Eye,
  Trash2,
  MoreHorizontal,
  FileText,
  Send,
  CheckCircle2,
  XCircle,
  Undo2,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { STATUS_CONFIG } from "./constants";
import type { Timesheet } from "./types";

interface TimesheetTableProps {
  ar: boolean;
  isLoading: boolean;
  timesheets: Timesheet[];
  onView: (ts: Timesheet) => void;
  onEdit: (ts: Timesheet) => void;
  onDelete: (id: string) => void;
  onSubmitStatus: (id: string, status: string) => void;
  onReject: (id: string) => void;
}

export function TimesheetTable({
  ar,
  isLoading,
  timesheets,
  onView,
  onEdit,
  onDelete,
  onSubmitStatus,
  onReject,
}: TimesheetTableProps) {
  const tAuto = useTranslations();
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
      {isLoading ? (
        <div className="p-8 text-center text-slate-400">{tAuto('auto.loading')}</div>
      ) : timesheets.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[30vh] text-center p-8">
          <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
            <Clock className="h-6 w-6 text-slate-400" />
          </div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-1">
            {tAuto('auto.noTimesheets')}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {tAuto('auto.addANewTimesheetToGetStarted')}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto max-h-[calc(100vh-420px)] overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent bg-slate-50/80 dark:bg-slate-800/50">
                <TableHead className="text-xs font-semibold">{tAuto('auto.employee')}</TableHead>
                <TableHead className="text-xs font-semibold">{tAuto('auto.week')}</TableHead>
                <TableHead className="text-xs font-semibold">{tAuto('auto.project')}</TableHead>
                <TableHead className="text-xs font-semibold">{tAuto('auto.totalHours')}</TableHead>
                <TableHead className="text-xs font-semibold">{tAuto('auto.status1')}</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {timesheets.map((ts) => {
                const statusCfg = STATUS_CONFIG[ts.status] || STATUS_CONFIG.DRAFT;
                const StatusIcon = statusCfg.icon;
                return (
                  <TableRow
                    key={ts.id}
                    className="group even:bg-slate-50/50 dark:even:bg-slate-800/20 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center text-[10px] font-bold text-violet-600 dark:text-violet-400">
                          {(ts.employee?.user?.name || "?").charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-900 dark:text-white">
                            {ts.employee?.user?.name || "-"}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {ts.employee?.department || ""}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-slate-600 dark:text-slate-400">
                      <div>
                        {new Date(ts.weekStart).toLocaleDateString(ar ? "ar-AE" : "en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                        {" - "}
                        {new Date(ts.weekEnd).toLocaleDateString(ar ? "ar-AE" : "en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-slate-600 dark:text-slate-400">
                      {ts.project ? (ar ? ts.project.name : ts.project.nameEn || ts.project.name) : "-"}
                    </TableCell>
                    <TableCell className="text-sm font-semibold text-slate-900 dark:text-white tabular-nums">
                      {Number(ts.totalHours)}
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border",
                          statusCfg.color
                        )}
                      >
                        <StatusIcon className="h-3 w-3" />
                        {ar ? statusCfg.label : statusCfg.labelEn}
                      </span>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300" aria-label="More options">
                            <MoreHorizontal className="h-3.5 w-3.5" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align={ar ? "start" : "end"} className="w-40">
                          <DropdownMenuItem onClick={() => onView(ts)}>
                            <Eye className="h-3.5 w-3.5 me-2" />
                            {tAuto('auto.view')}
                          </DropdownMenuItem>
                          {(ts.status === "DRAFT" || ts.status === "REJECTED") && (
                            <DropdownMenuItem onClick={() => onEdit(ts)}>
                              <FileText className="h-3.5 w-3.5 me-2" />
                              {tAuto('auto.edit')}
                            </DropdownMenuItem>
                          )}
                          {ts.status === "DRAFT" && (
                            <DropdownMenuItem onClick={() => onSubmitStatus(ts.id, "SUBMITTED")}>
                              <Send className="h-3.5 w-3.5 me-2" />
                              {tAuto('auto.submit')}
                            </DropdownMenuItem>
                          )}
                          {ts.status === "SUBMITTED" && (
                            <>
                              <DropdownMenuItem onClick={() => onSubmitStatus(ts.id, "APPROVED")}>
                                <CheckCircle2 className="h-3.5 w-3.5 me-2" />
                                {tAuto('auto.approve')}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-red-600 dark:text-red-400 focus:text-red-600"
                                onClick={() => onReject(ts.id)}
                              >
                                <XCircle className="h-3.5 w-3.5 me-2" />
                                {tAuto('auto.reject')}
                              </DropdownMenuItem>
                            </>
                          )}
                          {ts.status === "REJECTED" && (
                            <DropdownMenuItem onClick={() => onSubmitStatus(ts.id, "DRAFT")}>
                              <Undo2 className="h-3.5 w-3.5 me-2" />
                              {tAuto('auto.revertToDraft')}
                            </DropdownMenuItem>
                          )}
                          {(ts.status === "DRAFT" || ts.status === "REJECTED") && (
                            <DropdownMenuItem
                              className="text-red-600 dark:text-red-400 focus:text-red-600"
                              onClick={() => {
                                if (confirm(tAuto('auto.deleteThisTimesheet')))
                                  onDelete(ts.id);
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5 me-2" />
                              {tAuto('auto.delete')}
                            </DropdownMenuItem>
                          )}
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
    </div>
  );
}
