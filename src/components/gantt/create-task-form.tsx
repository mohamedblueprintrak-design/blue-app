import React, { useState } from "react";
import { Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DialogFooter } from "@/components/ui/dialog";

export interface CreateFormData {
  title: string;
  description?: string;
  startDate?: string | null;
  endDate?: string | null;
  priority?: string;
}

export function CreateTaskForm({
  ar,
  onSubmit,
  onCancel,
  isLoading,
}: {
  ar: boolean;
  onSubmit: (data: CreateFormData) => void;
  onCancel: () => void;
  isLoading: boolean;
}) {
  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [priority, setPriority] = useState("NORMAL");

  const handleSubmit = () => {
    onSubmit({
      title,
      startDate: startDate || null,
      endDate: endDate || null,
      priority,
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>{ar ? "العنوان" : "Title"} *</Label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={ar ? "عنوان المهمة" : "Task title"}
          className="bg-slate-50 dark:bg-slate-800"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>{ar ? "تاريخ البداية" : "Start Date"}</Label>
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="bg-slate-50 dark:bg-slate-800" />
        </div>
        <div>
          <Label>{ar ? "تاريخ النهاية" : "End Date"}</Label>
          <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="bg-slate-50 dark:bg-slate-800" />
        </div>
      </div>
      <div>
        <Label>{ar ? "الأولوية" : "Priority"}</Label>
        <Select value={priority} onValueChange={setPriority}>
          <SelectTrigger className="bg-slate-50 dark:bg-slate-800">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="LOW">{ar ? "منخفضة" : "Low"}</SelectItem>
            <SelectItem value="NORMAL">{ar ? "عادية" : "Normal"}</SelectItem>
            <SelectItem value="HIGH">{ar ? "عالية" : "High"}</SelectItem>
            <SelectItem value="URGENT">{ar ? "حرجة" : "Urgent"}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>
          {ar ? "إلغاء" : "Cancel"}
        </Button>
        <Button onClick={handleSubmit} disabled={!title || isLoading} className="bg-teal-600 hover:bg-teal-700 text-white border-0">
          {isLoading ? <Loader2 className="w-4 h-4 me-1 animate-spin" /> : <Plus className="w-4 h-4 me-1" />}
          {ar ? "إضافة" : "Add"}
        </Button>
      </DialogFooter>
    </div>
  );
}
