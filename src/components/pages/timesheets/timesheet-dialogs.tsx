"use client";


import { useTranslations } from 'next-intl';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { TASK_TYPES, DAYS_AR, DAYS_EN, STATUS_CONFIG } from "./constants";
import type { Timesheet, FormEntry, EmployeeOption, ProjectOption } from "./types";

interface TimesheetFormDialogProps {
  ar: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingId: string | null;
  weekStart: Date;
  weekDays: Date[];
  formEmployeeId: string;
  setFormEmployeeId: (v: string) => void;
  formProjectId: string | null;
  setFormProjectId: (v: string | null) => void;
  formNotes: string;
  setFormNotes: (v: string) => void;
  formEntries: FormEntry[];
  updateEntry: (index: number, field: string, value: string | number | null) => void;
  totalFormHours: number;
  employees: EmployeeOption[];
  projects: ProjectOption[];
  saveMutation: { isPending: boolean; mutate: (data: Record<string, unknown>) => void };
  navigateWeek: (direction: number) => void;
  handleSubmit: () => void;
  resetForm: () => void;
}

export function TimesheetFormDialog({
  ar,
  open,
  onOpenChange,
  editingId,
  weekStart,
  weekDays,
  formEmployeeId,
  setFormEmployeeId,
  formProjectId,
  setFormProjectId,
  formNotes,
  setFormNotes,
  formEntries,
  updateEntry,
  totalFormHours,
  employees,
  projects,
  saveMutation,
  navigateWeek,
  handleSubmit,
  resetForm,
}: TimesheetFormDialogProps) {
  const tAuto = useTranslations();
  return (
    <Dialog
      open={open}
      onOpenChange={(open) => {
        if (!open) resetForm();
        onOpenChange(open);
      }}
    >
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingId
              ? tAuto('auto.editTimesheet')
              : tAuto('auto.newTimesheet')}
          </DialogTitle>
          <DialogDescription>
            {editingId
              ? tAuto('auto.updateTimesheetDetails')
              : tAuto('auto.createANewTimesheet')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Week navigation */}
          <div className="flex items-center justify-between">
            <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => navigateWeek(-1)} aria-label={tAuto('auto.previousWeek')}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium text-slate-900 dark:text-white">
              {weekStart.toLocaleDateString(ar ? "ar-AE" : "en-US", {
                month: "short",
                day: "numeric",
              })}{" "}
              -{" "}
              {new Date(weekStart.getTime() + 6 * 86400000).toLocaleDateString(
                ar ? "ar-AE" : "en-US",
                { month: "short", day: "numeric", year: "numeric" }
              )}
            </span>
            <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => navigateWeek(1)} aria-label={tAuto('auto.nextWeek')}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Employee & Project */}
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">{tAuto('auto.employee')} *</Label>
              <Select
                value={formEmployeeId}
                onValueChange={setFormEmployeeId}
                disabled={!!editingId}
              >
                <SelectTrigger>
                  <SelectValue placeholder={tAuto('auto.selectEmployee')} />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.user?.name || emp.user?.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{tAuto('auto.projectOptional')}</Label>
              <Select
                value={formProjectId || "none"}
                onValueChange={(v) => setFormProjectId(v === "none" ? null : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={tAuto('auto.selectProject')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{tAuto('auto.noProject')}</SelectItem>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {ar ? p.name : p.nameEn || p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Day-by-day entry grid */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                {tAuto('auto.dailyHoursEntry')}
              </h3>
              <Badge variant="outline" className="text-[10px] px-1.5">
                {tAuto('auto.total')}: {totalFormHours}h
              </Badge>
            </div>
            <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
              <div className="grid grid-cols-7 gap-0">
                {weekDays.map((day, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      "border-b border-slate-200 dark:border-slate-700 last:border-b-0",
                      idx < 6 && "border-e"
                    )}
                  >
                    <div className="p-2 bg-slate-50 dark:bg-slate-800/50 text-center border-b border-slate-200 dark:border-slate-700">
                      <p className="text-[10px] font-semibold text-slate-700 dark:text-slate-300">
                        {ar ? DAYS_AR[idx] : DAYS_EN[idx]}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {day.getDate()}
                      </p>
                    </div>
                    <div className="p-2 space-y-1.5">
                      <Input
                        type="number"
                        min="0"
                        max="24"
                        step="0.5"
                        value={formEntries[idx]?.hours || 0}
                        onChange={(e) =>
                          updateEntry(idx, "hours", parseFloat(e.target.value) || 0)
                        }
                        className="text-center text-sm h-8"
                        placeholder="0"
                      />
                      <Select
                        value={formEntries[idx]?.taskType || "regular"}
                        onValueChange={(v) => updateEntry(idx, "taskType", v)}
                      >
                        <SelectTrigger className="h-6 text-[10px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TASK_TYPES.map((t) => (
                            <SelectItem key={t.value} value={t.value}>
                              {ar ? t.labelAr : t.labelEn}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label className="text-xs">{tAuto('auto.notes')}</Label>
            <Textarea
              value={formNotes}
              onChange={(e) => setFormNotes(e.target.value)}
              placeholder={tAuto('auto.anyAdditionalNotes')}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { resetForm(); onOpenChange(false); }}>
            {tAuto('auto.cancel')}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={saveMutation.isPending}
            className="bg-violet-600 hover:bg-violet-700 text-white"
          >
            {saveMutation.isPending
              ? tAuto('auto.saving')
              : editingId
              ? tAuto('auto.update')
              : tAuto('auto.create')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface TimesheetViewDialogProps {
  ar: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  viewingTimesheet: Timesheet | null;
}

export function TimesheetViewDialog({
  ar,
  open,
  onOpenChange,
  viewingTimesheet,
}: TimesheetViewDialogProps) {
  const tAuto = useTranslations();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{tAuto('auto.timesheetDetails')}</DialogTitle>
        </DialogHeader>
        {viewingTimesheet && (
          <div className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-slate-500">{tAuto('auto.employee')}</Label>
                <p className="text-sm font-medium text-slate-900 dark:text-white">
                  {viewingTimesheet.employee?.user?.name || "-"}
                </p>
              </div>
              <div>
                <Label className="text-xs text-slate-500">{tAuto('auto.project')}</Label>
                <p className="text-sm font-medium text-slate-900 dark:text-white">
                  {viewingTimesheet.project
                    ? ar
                      ? viewingTimesheet.project.name
                      : viewingTimesheet.project.nameEn || viewingTimesheet.project.name
                    : "-"}
                </p>
              </div>
              <div>
                <Label className="text-xs text-slate-500">{tAuto('auto.week')}</Label>
                <p className="text-sm font-medium text-slate-900 dark:text-white">
                  {new Date(viewingTimesheet.weekStart).toLocaleDateString(ar ? "ar-AE" : "en-US", {
                    month: "short",
                    day: "numeric",
                  })}{" "}
                  -{" "}
                  {new Date(viewingTimesheet.weekEnd).toLocaleDateString(ar ? "ar-AE" : "en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </p>
              </div>
              <div>
                <Label className="text-xs text-slate-500">{tAuto('auto.status1')}</Label>
                <span
                  className={cn(
                    "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border mt-0.5",
                    (STATUS_CONFIG[viewingTimesheet.status] || STATUS_CONFIG.DRAFT).color
                  )}
                >
                  {ar
                    ? (STATUS_CONFIG[viewingTimesheet.status] || STATUS_CONFIG.DRAFT).label
                    : (STATUS_CONFIG[viewingTimesheet.status] || STATUS_CONFIG.DRAFT).labelEn}
                </span>
              </div>
              <div>
                <Label className="text-xs text-slate-500">{tAuto('auto.totalHours')}</Label>
                <p className="text-sm font-bold text-violet-600 dark:text-violet-400">
                  {Number(viewingTimesheet.totalHours)}h
                </p>
              </div>
              {viewingTimesheet.approvedBy && (
                <div>
                  <Label className="text-xs text-slate-500">{tAuto('auto.approvedBy')}</Label>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">
                    {viewingTimesheet.approvedBy.name}
                  </p>
                </div>
              )}
            </div>

            {viewingTimesheet.rejectedReason && (
              <div className="rounded-lg bg-red-50 dark:bg-red-900/20 p-3 border border-red-200 dark:border-red-800">
                <Label className="text-xs text-red-600 dark:text-red-400">{tAuto('auto.rejectionReason')}</Label>
                <p className="text-sm text-red-700 dark:text-red-300 mt-1">{viewingTimesheet.rejectedReason}</p>
              </div>
            )}

            {/* Entries table */}
            <div>
              <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                {tAuto('auto.hourDetails')}
              </h4>
              <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent bg-slate-50/80 dark:bg-slate-800/50">
                      <TableHead className="text-xs">{tAuto('auto.day')}</TableHead>
                      <TableHead className="text-xs">{tAuto('auto.date')}</TableHead>
                      <TableHead className="text-xs">{tAuto('auto.hours')}</TableHead>
                      <TableHead className="text-xs">{tAuto('auto.type')}</TableHead>
                      <TableHead className="text-xs">{tAuto('auto.description')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {viewingTimesheet.entries.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-xs text-slate-400 py-4">
                          {tAuto('auto.noEntries')}
                        </TableCell>
                      </TableRow>
                    ) : (
                      viewingTimesheet.entries.map((entry) => (
                        <TableRow key={entry.id}>
                          <TableCell className="text-xs">
                            {(() => {
                              const d = new Date(entry.date);
                              const dayIdx = (d.getDay() + 6) % 7;
                              return ar ? DAYS_AR[dayIdx] : DAYS_EN[dayIdx];
                            })()}
                          </TableCell>
                          <TableCell className="text-xs text-slate-500">
                            {new Date(entry.date).toLocaleDateString(ar ? "ar-AE" : "en-US", {
                              month: "short",
                              day: "numeric",
                            })}
                          </TableCell>
                          <TableCell className="text-xs font-semibold tabular-nums">
                            {Number(entry.hours)}h
                          </TableCell>
                          <TableCell className="text-xs">
                            {TASK_TYPES.find((t) => t.value === entry.taskType)
                              ? ar
                                ? TASK_TYPES.find((t) => t.value === entry.taskType)!.labelAr
                                : TASK_TYPES.find((t) => t.value === entry.taskType)!.labelEn
                              : entry.taskType}
                          </TableCell>
                          <TableCell className="text-xs text-slate-500 max-w-[200px] truncate">
                            {entry.description || "-"}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>

            {viewingTimesheet.notes && (
              <div>
                <Label className="text-xs text-slate-500">{tAuto('auto.notes')}</Label>
                <p className="text-sm text-slate-700 dark:text-slate-300 mt-1">{viewingTimesheet.notes}</p>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

interface TimesheetRejectDialogProps {
  ar: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rejectedReason: string;
  setRejectedReason: (v: string) => void;
  onReject: () => void;
  isPending: boolean;
}

export function TimesheetRejectDialog({
  ar,
  open,
  onOpenChange,
  rejectedReason,
  setRejectedReason,
  onReject,
  isPending,
}: TimesheetRejectDialogProps) {
  const tAuto = useTranslations();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{tAuto('auto.rejectTimesheet')}</DialogTitle>
          <DialogDescription>
            {tAuto('auto.pleaseProvideAReasonForRejection')}
          </DialogDescription>
        </DialogHeader>
        <Textarea
          value={rejectedReason}
          onChange={(e) => setRejectedReason(e.target.value)}
          placeholder={tAuto('auto.rejectionReason1')}
          rows={3}
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {tAuto('auto.cancel')}
          </Button>
          <Button
            variant="destructive"
            onClick={onReject}
            disabled={!rejectedReason.trim() || isPending}
          >
            {tAuto('auto.reject')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
