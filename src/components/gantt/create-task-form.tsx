import { useTranslations } from 'next-intl';
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
  ar: _ar,
  onSubmit,
  onCancel,
  isLoading,
}: {
  ar: boolean;
  onSubmit: (data: CreateFormData) => void;
  onCancel: () => void;
  isLoading: boolean;
}) {
  const tAuto = useTranslations();
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
        <Label>{tAuto('auto.title')} *</Label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={tAuto('auto.taskTitle')}
          className="bg-slate-50 dark:bg-slate-800"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>{tAuto('auto.startDate')}</Label>
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="bg-slate-50 dark:bg-slate-800" />
        </div>
        <div>
          <Label>{tAuto('auto.endDate')}</Label>
          <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="bg-slate-50 dark:bg-slate-800" />
        </div>
      </div>
      <div>
        <Label>{tAuto('auto.priority')}</Label>
        <Select value={priority} onValueChange={setPriority}>
          <SelectTrigger className="bg-slate-50 dark:bg-slate-800">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="LOW">{tAuto('auto.low')}</SelectItem>
            <SelectItem value="NORMAL">{tAuto('auto.normal')}</SelectItem>
            <SelectItem value="HIGH">{tAuto('auto.high')}</SelectItem>
            <SelectItem value="URGENT">{tAuto('auto.urgent')}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>
          {tAuto('auto.cancel')}
        </Button>
        <Button onClick={handleSubmit} disabled={!title || isLoading} className="bg-brand-navy-600 hover:bg-brand-navy-700 text-white border-0">
          {isLoading ? <Loader2 className="w-4 h-4 me-1 animate-spin" /> : <Plus className="w-4 h-4 me-1" />}
          {tAuto('auto.add')}
        </Button>
      </DialogFooter>
    </div>
  );
}
