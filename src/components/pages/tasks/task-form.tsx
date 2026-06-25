"use client";


import { useTranslations } from 'next-intl';
import { useEffect } from "react";

import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { taskSchema, getErrorMessage, type TaskFormData } from "@/lib/validations";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToastFeedback } from "@/hooks/use-toast-feedback";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
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
import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { getMutationHeaders } from "@/lib/csrf-client";
import { extractErrorMessage } from "@/lib/api/fetch-client";
import { type ProjectOption, type UserOption } from "./types";

// ===== Task Form Props =====
interface TaskFormProps {
  ar: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultStatus: string;
  projectId?: string;
  projects: ProjectOption[];
  users: UserOption[];
}

export function TaskForm({
  ar,
  open,
  onOpenChange,
  defaultStatus,
  projectId,
  projects,
  users,
}: TaskFormProps) {
  const tAuto = useTranslations();
  const queryClient = useQueryClient();
  const toast = useToastFeedback({ ar });

  // Form
  const form = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema) as Resolver<TaskFormData>,
    defaultValues: {
      title: "",
      description: "",
      projectId: projectId || "",
      assigneeId: "",
      priority: "NORMAL" as const,
      status: "TODO" as const,
      startDate: "",
      dueDate: "",
      taskType: 'STANDARD' as const,
      isGovernmental: false,
      slaDays: "",
    },
  });
  const { register, handleSubmit: rhfHandleSubmit, formState: { errors }, reset, setValue, watch } = form;

  useEffect(() => {
    if (open) {
      const draft = localStorage.getItem("draft_task_form");
      if (draft) {
        try {
          const parsed = JSON.parse(draft);
          Object.keys(parsed).forEach(k => {
            setValue(k as keyof TaskFormData, parsed[k]);
          });
          toast.showSuccess(tAuto('auto.draftRestoredSuccessfully'));
        } catch (_e) { /* intentional */ }
      }
      
      // eslint-disable-next-line
      const subscription = watch((value) => {
        const timeout = setTimeout(() => {
          localStorage.setItem("draft_task_form", JSON.stringify(value));
        }, 1000);
        return () => clearTimeout(timeout);
      });
      return () => subscription.unsubscribe();
    }
  }, [open, watch, setValue, toast, ar, tAuto]);

  // Create task mutation
  const createTaskMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: getMutationHeaders(),
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(extractErrorMessage(errData.error, 'Failed to create task'));
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      onOpenChange(false);
      localStorage.removeItem("draft_task_form");
      reset();
      toast.created(tAuto('auto.task'));
    },
    onError: (error: Error) => {
      toast.showError(ar ? `فشل في إنشاء المهمة: ${error.message}` : `Failed to create task: ${error.message}`);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{tAuto('auto.newTask')}</DialogTitle>
          <DialogDescription>
            {tAuto('auto.addANewTaskToTheBoard')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={rhfHandleSubmit((data) => createTaskMutation.mutate({ ...data, status: defaultStatus }))} className="space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <Label className="text-sm">{tAuto('auto.title')} *</Label>
            <Input
              {...register("title")}
              placeholder={tAuto('auto.enterTaskTitle')}
              className={cn(errors.title && "border-red-500 focus:ring-red-500/20 focus:border-red-500")}
            />
            {errors.title && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertCircle className="h-3 w-3 shrink-0" />{getErrorMessage(errors.title.message || "", ar)}</p>}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label className="text-sm">{tAuto('auto.description')}</Label>
            <Textarea
              {...register("description")}
              placeholder={tAuto('auto.taskDescriptionOptional')}
              rows={3}
            />
          </div>

          {/* Project + Assignee */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-sm">{tAuto('auto.project')}</Label>
              <Select
                 
                value={watch("projectId")}
                onValueChange={(v) => setValue("projectId", v)}
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
              <Label className="text-sm">{tAuto('auto.assignee')}</Label>
              <Select
                value={watch("assigneeId")}
                onValueChange={(v) => setValue("assigneeId", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={tAuto('auto.selectAssignee')} />
                </SelectTrigger>
                <SelectContent>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Priority + Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-sm">{tAuto('auto.priority')}</Label>
              <Select
                value={watch("priority")}
                onValueChange={(v) => setValue("priority", v as TaskFormData["priority"])}
              >
                <SelectTrigger className={cn(errors.priority && "border-red-500 focus:ring-red-500/20")}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NORMAL">{tAuto('auto.normal')}</SelectItem>
                  <SelectItem value="MEDIUM">{tAuto('auto.medium')}</SelectItem>
                  <SelectItem value="HIGH">{tAuto('auto.high')}</SelectItem>
                  <SelectItem value="URGENT">{tAuto('auto.urgent')}</SelectItem>
                </SelectContent>
              </Select>
              {errors.priority && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertCircle className="h-3 w-3 shrink-0" />{getErrorMessage(errors.priority.message || "", ar)}</p>}
            </div>
            <div className="space-y-2">
              <Label className="text-sm">{tAuto('auto.startDate')}</Label>
              <Input
                type="date"
                {...register("startDate")}
                className={cn(errors.startDate && "border-red-500 focus:ring-red-500/20 focus:border-red-500")}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-sm">{tAuto('auto.dueDate')}</Label>
              <Input
                type="date"
                {...register("dueDate")}
                className={cn(errors.dueDate && "border-red-500 focus:ring-red-500/20 focus:border-red-500")}
              />
            </div>
          </div>

          <Separator />

          {/* Governmental + SLA */}
          <div className="flex items-center gap-2">
            <Checkbox
              checked={watch("isGovernmental")}
              onCheckedChange={(checked) => {
                setValue("isGovernmental", !!checked);
                setValue("taskType", !!checked ? 'GOVERNMENTAL' : 'STANDARD');
              }}
            />
            <Label className="text-sm cursor-pointer">
              {tAuto('auto.governmentalTask')}
            </Label>
          </div>

          {(watch("isGovernmental") || watch("taskType") === 'GOVERNMENTAL' || watch("taskType") === 'MANDATORY') && (
            <div className="space-y-2">
              <Label className="text-sm">{tAuto('auto.sLADays')}</Label>
              <Input
                type="number"
                min={1}
                value={watch("slaDays") || ""}
                onChange={(e) => setValue("slaDays", e.target.value)}
                placeholder={tAuto('auto.numberOfSLADays')}
              />
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {tAuto('auto.cancel')}
            </Button>
            <Button
              className="bg-brand-navy-600 hover:bg-brand-navy-700 text-white"
              type="submit"
              disabled={createTaskMutation.isPending}
            >
              {createTaskMutation.isPending
                ? tAuto('auto.creating')
                : tAuto('auto.create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
