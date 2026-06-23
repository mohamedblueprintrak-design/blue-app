import { useTranslations } from 'next-intl';
import React from "react";
import { Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GanttTask, STATUS_LABELS } from "@/components/gantt/gantt-types";

interface TaskDetailPanelProps {
  ar: boolean;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  selectedTask: GanttTask | null;
  onSelectedTaskChange: (task: GanttTask) => void;
  onDelete: (id: string) => void;
  onSave: (task: GanttTask) => void;
  isDeleting: boolean;
  isSaving: boolean;
}

export function TaskDetailPanel({
  ar,
  isOpen,
  onOpenChange,
  selectedTask,
  onSelectedTaskChange,
  onDelete,
  onSave,
  isDeleting,
  isSaving,
}: TaskDetailPanelProps) {
  const tAuto = useTranslations();
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{tAuto('auto.editTask')}</DialogTitle>
          <DialogDescription>{tAuto('auto.editTaskDetailsInTheTimeline')}</DialogDescription>
        </DialogHeader>
        {selectedTask && (
          <div className="space-y-4">
            <div>
              <Label>{tAuto('auto.title')}</Label>
              <Input
                value={selectedTask.title}
                onChange={(e) => onSelectedTaskChange({ ...selectedTask, title: e.target.value })}
                className="bg-slate-50 dark:bg-slate-800"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{tAuto('auto.startDate')}</Label>
                <Input
                  type="date"
                  value={selectedTask.startDate?.split("T")[0] || ""}
                  onChange={(e) => onSelectedTaskChange({ ...selectedTask, startDate: e.target.value || null })}
                  className="bg-slate-50 dark:bg-slate-800"
                />
              </div>
              <div>
                <Label>{tAuto('auto.endDate')}</Label>
                <Input
                  type="date"
                  value={selectedTask.endDate?.split("T")[0] || ""}
                  onChange={(e) => onSelectedTaskChange({ ...selectedTask, endDate: e.target.value || null })}
                  className="bg-slate-50 dark:bg-slate-800"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{tAuto('auto.progress')} (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={selectedTask.progress}
                  onChange={(e) => onSelectedTaskChange({ ...selectedTask, progress: parseInt(e.target.value) || 0 })}
                  className="bg-slate-50 dark:bg-slate-800"
                />
              </div>
              <div>
                <Label>{tAuto('auto.status1')}</Label>
                <Select
                  value={selectedTask.status}
                  onValueChange={(value) => onSelectedTaskChange({ ...selectedTask, status: value })}
                >
                  <SelectTrigger className="bg-slate-50 dark:bg-slate-800">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(STATUS_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {ar ? label.ar : label.en}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="destructive" onClick={() => selectedTask && onDelete(selectedTask.id)} disabled={isDeleting}>
            {isDeleting ? <Loader2 className="w-4 h-4 me-1 animate-spin" /> : <Trash2 className="w-4 h-4 me-1" />}
            {tAuto('auto.delete')}
          </Button>
          <Button
            onClick={() => {
              if (selectedTask) {
                onSave(selectedTask);
              }
            }}
            disabled={isSaving}
            className="bg-teal-600 hover:bg-teal-700 text-white border-0"
          >
            {isSaving ? <Loader2 className="w-4 h-4 me-1 animate-spin" /> : null}
            {tAuto('auto.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
