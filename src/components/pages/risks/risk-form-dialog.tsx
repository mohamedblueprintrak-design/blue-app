"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
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
import { Plus, ShieldAlert, Trash2 } from "lucide-react";
import { categories, strategies } from "./constants";
import { getScoreColor, getScoreTextColor } from "./helpers";
import type { RiskFormData, NewAction, ProjectOption, UserOption } from "./types";
import { UseMutateFunction } from "@tanstack/react-query";

interface RiskFormDialogProps {
  ar: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formData: RiskFormData;
  setFormData: React.Dispatch<React.SetStateAction<RiskFormData>>;
  newActions: NewAction[];
  setNewActions: React.Dispatch<React.SetStateAction<NewAction[]>>;
  projects: ProjectOption[];
  users: UserOption[];
  createMutation: {
    mutate: (data: Record<string, unknown>) => void;
    isPending: boolean;
  };
  resetForm: () => void;
}

export function RiskFormDialog({
  ar,
  open,
  onOpenChange,
  formData,
  setFormData,
  newActions,
  setNewActions,
  projects,
  users,
  createMutation,
  resetForm,
}: RiskFormDialogProps) {
  const score = formData.probability * formData.impact;

  const addNewAction = () => {
    setNewActions([...newActions, { description: "", assigneeId: "", dueDate: "" }]);
  };

  const removeNewAction = (index: number) => {
    setNewActions(newActions.filter((_, i) => i !== index));
  };

  const updateNewAction = (index: number, field: string, value: string) => {
    const updated = [...newActions];
    updated[index] = { ...updated[index], [field]: value };
    setNewActions(updated);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-teal-500" />
            {ar ? "خطر جديد" : "New Risk"}
          </DialogTitle>
          <DialogDescription>
            {ar ? "تسجيل خطر جديد وتحديد استراتيجية المعالجة" : "Register a new risk and define mitigation strategy"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-sm">{ar ? "المشروع *" : "Project *"}</Label>
              <Select value={formData.projectId} onValueChange={(v) => setFormData({ ...formData, projectId: v })}>
                <SelectTrigger><SelectValue placeholder={ar ? "اختر مشروع" : "Select project"} /></SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{ar ? p.name : p.nameEn || p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">{ar ? "التصنيف" : "Category"}</Label>
              <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{ar ? c.ar : c.en}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm">{ar ? "عنوان الخطر *" : "Risk Title *"}</Label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder={ar ? "وصف الخطر" : "Risk description"}
            />
          </div>

          {/* Probability & Impact */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
              <div className="flex items-center justify-between">
                <Label className="text-sm">{ar ? "الاحتمالية" : "Probability"}</Label>
                <span className="text-sm font-bold text-slate-900 dark:text-white">{formData.probability}</span>
              </div>
              <Slider
                value={[formData.probability]}
                onValueChange={([v]) => setFormData({ ...formData, probability: v })}
                min={1}
                max={5}
                step={1}
                className="mt-2"
              />
              <div className="flex justify-between text-[8px] text-slate-400 mt-1">
                <span>{ar ? "نادر" : "Rare"}</span>
                <span>{ar ? "مؤكد تقريباً" : "Almost Certain"}</span>
              </div>
            </div>
            <div className="space-y-2 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
              <div className="flex items-center justify-between">
                <Label className="text-sm">{ar ? "التأثير" : "Impact"}</Label>
                <span className="text-sm font-bold text-slate-900 dark:text-white">{formData.impact}</span>
              </div>
              <Slider
                value={[formData.impact]}
                onValueChange={([v]) => setFormData({ ...formData, impact: v })}
                min={1}
                max={5}
                step={1}
                className="mt-2"
              />
              <div className="flex justify-between text-[8px] text-slate-400 mt-1">
                <span>{ar ? "ضئيل" : "Insignificant"}</span>
                <span>{ar ? "كارثي" : "Catastrophic"}</span>
              </div>
            </div>
          </div>

          {/* Score Display */}
          <div className={`flex items-center justify-center p-3 rounded-lg ${getScoreColor(score)} bg-opacity-10`}>
            <div className="text-center">
              <div className={`text-2xl font-bold ${getScoreTextColor(score)}`}>{score}</div>
              <div className="text-xs text-slate-500">{ar ? "درجة الخطر" : "Risk Score"}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-sm">{ar ? "الاستراتيجية" : "Strategy"}</Label>
              <Select value={formData.strategy} onValueChange={(v) => setFormData({ ...formData, strategy: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {strategies.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{ar ? s.ar : s.en}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">{ar ? "المسؤول" : "Assignee"}</Label>
              <Select value={formData.assigneeId} onValueChange={(v) => setFormData({ ...formData, assigneeId: v })}>
                <SelectTrigger><SelectValue placeholder={ar ? "اختر مسؤول" : "Select assignee"} /></SelectTrigger>
                <SelectContent>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm">{ar ? "خطة التخفيف" : "Mitigation Plan"}</Label>
            <Textarea
              value={formData.mitigationPlan}
              onChange={(e) => setFormData({ ...formData, mitigationPlan: e.target.value })}
              placeholder={ar ? "وصف خطة تخفيف الخطر" : "Describe the risk mitigation plan"}
              rows={3}
            />
          </div>

          <Separator />

          {/* Action Items */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">
                {ar ? "بنود العمل" : "Action Items"}
              </Label>
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={addNewAction}>
                <Plus className="h-3 w-3 me-1" />
                {ar ? "إضافة بند" : "Add Action"}
              </Button>
            </div>
            {newActions.length === 0 ? (
              <div className="text-center py-3 border border-dashed border-slate-200 dark:border-slate-700 rounded-lg">
                <p className="text-xs text-slate-400">{ar ? "لم يتم إضافة بنود عمل" : "No action items"}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {newActions.map((action, index) => (
                  <div key={index} className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-slate-500">
                        {ar ? "بند عمل" : "Action"} {index + 1}
                      </span>
                      <button onClick={() => removeNewAction(index)} className="p-0.5 text-slate-400 hover:text-red-500">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <Input
                        className="h-7 text-xs sm:col-span-2"
                        value={action.description}
                        onChange={(e) => updateNewAction(index, "description", e.target.value)}
                        placeholder={ar ? "وصف الإجراء" : "Action description"}
                      />
                      <Select value={action.assigneeId} onValueChange={(v) => updateNewAction(index, "assigneeId", v)}>
                        <SelectTrigger className="h-7 text-xs">
                          <SelectValue placeholder={ar ? "مسؤول" : "Assignee"} />
                        </SelectTrigger>
                        <SelectContent>
                          {users.map((u) => (
                            <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { onOpenChange(false); resetForm(); }}>
            {ar ? "إلغاء" : "Cancel"}
          </Button>
          <Button
            className="bg-teal-600 hover:bg-teal-700 text-white"
            onClick={() => createMutation.mutate({ ...formData, actions: newActions })}
            disabled={!formData.projectId || !formData.title || createMutation.isPending}
          >
            {createMutation.isPending ? (ar ? "جارٍ الإنشاء..." : "Creating...") : (ar ? "إنشاء" : "Create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
