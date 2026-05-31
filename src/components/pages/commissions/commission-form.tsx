"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getMutationHeaders } from "@/lib/csrf-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { UserOption, ProjectOption } from "./types";

// ===== Commission Form Dialog =====
interface CommissionFormProps {
  language: "ar" | "en";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  users: UserOption[];
  projects: ProjectOption[];
}

export function CommissionFormDialog({ language, open, onOpenChange, users, projects }: CommissionFormProps) {
  const ar = language === "ar";
  const queryClient = useQueryClient();
  const emptyForm = { userId: "", projectId: "", type: "project_referral", amount: "", percentage: "", baseAmount: "", description: "" };
  const [formData, setFormData] = useState(emptyForm);

  const createMutation = useMutation({
    mutationFn: async (data: typeof emptyForm) => {
      const res = await fetch("/api/commissions", { method: "POST", headers: getMutationHeaders(), body: JSON.stringify(data) });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["commissions"] }); onOpenChange(false); setFormData(emptyForm); },
  });

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { onOpenChange(false); setFormData(emptyForm); } }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{ar ? "عمولة جديدة" : "New Commission"}</DialogTitle>
          <DialogDescription>{ar ? "إضافة عمولة جديدة للموظف" : "Add a new commission for employee"}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">{ar ? "الموظف" : "Employee"} *</Label>
              <Select value={formData.userId} onValueChange={(v) => setFormData({ ...formData, userId: v })}>
                <SelectTrigger className="h-8 text-sm rounded-lg"><SelectValue placeholder={ar ? "اختر موظف" : "Select employee"} /></SelectTrigger>
                <SelectContent>
                  {users.map((u) => (<SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{ar ? "النوع" : "Type"}</Label>
              <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
                <SelectTrigger className="h-8 text-sm rounded-lg"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="project_referral">{ar ? "إحالة مشروع" : "Project Referral"}</SelectItem>
                  <SelectItem value="completion_bonus">{ar ? "مكافأة إنجاز" : "Completion Bonus"}</SelectItem>
                  <SelectItem value="client_satisfaction">{ar ? "رضا العميل" : "Client Satisfaction"}</SelectItem>
                  <SelectItem value="performance">{ar ? "أداء مميز" : "Performance"}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{ar ? "المشروع" : "Project"}</Label>
            <Select value={formData.projectId} onValueChange={(v) => setFormData({ ...formData, projectId: v })}>
              <SelectTrigger className="h-8 text-sm rounded-lg"><SelectValue placeholder={ar ? "اختر مشروع" : "Select project"} /></SelectTrigger>
              <SelectContent>
                {projects.map((p) => (<SelectItem key={p.id} value={p.id}>{ar ? p.name : p.nameEn || p.name}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">{ar ? "المبلغ (د.إ)" : "Amount (AED)"}</Label>
              <Input type="number" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} placeholder="0" className="h-8 text-sm tabular-nums font-mono rounded-lg" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{ar ? "النسبة %" : "Percentage %"}</Label>
              <Input type="number" value={formData.percentage} onChange={(e) => setFormData({ ...formData, percentage: e.target.value })} placeholder="0" className="h-8 text-sm tabular-nums font-mono rounded-lg" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{ar ? "المبلغ الأساسي" : "Base Amount"}</Label>
              <Input type="number" value={formData.baseAmount} onChange={(e) => setFormData({ ...formData, baseAmount: e.target.value })} placeholder="0" className="h-8 text-sm tabular-nums font-mono rounded-lg" />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{ar ? "الوصف" : "Description"}</Label>
            <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder={ar ? "وصف العمولة" : "Commission description"} className="text-sm min-h-[60px] rounded-lg" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { onOpenChange(false); setFormData(emptyForm); }}>{ar ? "إلغاء" : "Cancel"}</Button>
          <Button className="bg-teal-600 hover:bg-teal-700 text-white" onClick={() => createMutation.mutate(formData)} disabled={!formData.userId || !formData.amount || createMutation.isPending}>
            {createMutation.isPending ? (ar ? "جارٍ الحفظ..." : "Saving...") : (ar ? "حفظ" : "Save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ===== Referral Form Dialog =====
interface ReferralFormProps {
  language: "ar" | "en";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  users: UserOption[];
  projects: ProjectOption[];
}

export function ReferralFormDialog({ language, open, onOpenChange, users, projects }: ReferralFormProps) {
  const ar = language === "ar";
  const queryClient = useQueryClient();
  const emptyForm = { referrerId: "", referredName: "", referredPhone: "", referredEmail: "", projectId: "", notes: "" };
  const [formData, setFormData] = useState(emptyForm);

  const createMutation = useMutation({
    mutationFn: async (data: typeof emptyForm) => {
      const res = await fetch("/api/referrals", { method: "POST", headers: getMutationHeaders(), body: JSON.stringify(data) });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["referrals"] }); onOpenChange(false); setFormData(emptyForm); },
  });

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { onOpenChange(false); setFormData(emptyForm); } }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{ar ? "إحالة جديدة" : "New Referral"}</DialogTitle>
          <DialogDescription>{ar ? "إضافة إحالة عميل جديد" : "Add a new client referral"}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1">
            <Label className="text-xs">{ar ? "المحيل" : "Referrer"} *</Label>
            <Select value={formData.referrerId} onValueChange={(v) => setFormData({ ...formData, referrerId: v })}>
              <SelectTrigger className="h-8 text-sm rounded-lg"><SelectValue placeholder={ar ? "اختر المحيل" : "Select referrer"} /></SelectTrigger>
              <SelectContent>
                {users.map((u) => (<SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">{ar ? "اسم المُحال" : "Referred Name"} *</Label>
              <Input value={formData.referredName} onChange={(e) => setFormData({ ...formData, referredName: e.target.value })} placeholder={ar ? "اسم العميل المحال" : "Referred client name"} className="h-8 text-sm rounded-lg" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{ar ? "الهاتف" : "Phone"}</Label>
              <Input value={formData.referredPhone} onChange={(e) => setFormData({ ...formData, referredPhone: e.target.value })} placeholder="+971 XX XXX XXXX" dir="ltr" className="h-8 text-sm rounded-lg text-left" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">{ar ? "البريد الإلكتروني" : "Email"}</Label>
              <Input type="email" value={formData.referredEmail} onChange={(e) => setFormData({ ...formData, referredEmail: e.target.value })} placeholder="email@example.com" dir="ltr" className="h-8 text-sm rounded-lg text-left" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{ar ? "المشروع" : "Project"}</Label>
              <Select value={formData.projectId} onValueChange={(v) => setFormData({ ...formData, projectId: v })}>
                <SelectTrigger className="h-8 text-sm rounded-lg"><SelectValue placeholder={ar ? "اختر مشروع" : "Select project"} /></SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (<SelectItem key={p.id} value={p.id}>{ar ? p.name : p.nameEn || p.name}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{ar ? "ملاحظات" : "Notes"}</Label>
            <Textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} placeholder={ar ? "ملاحظات إضافية" : "Additional notes"} className="text-sm min-h-[60px] rounded-lg" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { onOpenChange(false); setFormData(emptyForm); }}>{ar ? "إلغاء" : "Cancel"}</Button>
          <Button className="bg-teal-600 hover:bg-teal-700 text-white" onClick={() => createMutation.mutate(formData)} disabled={!formData.referrerId || !formData.referredName || createMutation.isPending}>
            {createMutation.isPending ? (ar ? "جارٍ الحفظ..." : "Saving...") : (ar ? "حفظ" : "Save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ===== Campaign Form Dialog =====
interface CampaignFormProps {
  language: "ar" | "en";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editId: string | null;
  onEditIdChange: (id: string | null) => void;
}

export function CampaignFormDialog({ language, open, onOpenChange, editId, onEditIdChange }: CampaignFormProps) {
  const ar = language === "ar";
  const queryClient = useQueryClient();
  const emptyForm = { name: "", type: "SOCIAL_MEDIA", budget: "", startDate: "", endDate: "", notes: "" };
  const [formData, setFormData] = useState(emptyForm);

  const createMutation = useMutation({
    mutationFn: async (data: typeof emptyForm) => {
      const res = await fetch("/api/marketing-campaigns", { method: "POST", headers: getMutationHeaders(), body: JSON.stringify(data) });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["marketing-campaigns"] }); onOpenChange(false); setFormData(emptyForm); onEditIdChange(null); },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      const res = await fetch(`/api/marketing-campaigns/${id}`, { method: "PUT", headers: getMutationHeaders(), body: JSON.stringify(data) });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["marketing-campaigns"] }); },
  });

  const handleSave = () => {
    if (editId) {
      updateMutation.mutate({
        id: editId,
        data: { name: formData.name, type: formData.type, budget: parseFloat(formData.budget) || 0, startDate: formData.startDate || null, endDate: formData.endDate || null, notes: formData.notes },
      });
      onOpenChange(false);
      onEditIdChange(null);
      setFormData(emptyForm);
    } else {
      createMutation.mutate(formData);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { onOpenChange(false); setFormData(emptyForm); onEditIdChange(null); } }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{editId ? (ar ? "تعديل حملة" : "Edit Campaign") : (ar ? "حملة جديدة" : "New Campaign")}</DialogTitle>
          <DialogDescription>{editId ? (ar ? "تعديل بيانات الحملة" : "Update campaign details") : (ar ? "إضافة حملة تسويقية جديدة" : "Add a new marketing campaign")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1">
            <Label className="text-xs">{ar ? "اسم الحملة" : "Campaign Name"} *</Label>
            <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder={ar ? "اسم الحملة" : "Campaign name"} className="h-8 text-sm rounded-lg" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">{ar ? "النوع" : "Type"}</Label>
              <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
                <SelectTrigger className="h-8 text-sm rounded-lg"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="SOCIAL_MEDIA">{ar ? "وسائل التواصل" : "Social Media"}</SelectItem>
                  <SelectItem value="google_ads">{ar ? "إعلانات جوجل" : "Google Ads"}</SelectItem>
                  <SelectItem value="REFERRAL">{ar ? "إحالات" : "Referral"}</SelectItem>
                  <SelectItem value="DIRECT">{ar ? "مباشر" : "Direct"}</SelectItem>
                  <SelectItem value="exhibition">{ar ? "معارض" : "Exhibition"}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{ar ? "الميزانية (د.إ)" : "Budget (AED)"}</Label>
              <Input type="number" value={formData.budget} onChange={(e) => setFormData({ ...formData, budget: e.target.value })} placeholder="0" className="h-8 text-sm tabular-nums font-mono rounded-lg" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">{ar ? "تاريخ البداية" : "Start Date"}</Label>
              <Input type="date" value={formData.startDate} onChange={(e) => setFormData({ ...formData, startDate: e.target.value })} className="h-8 text-sm rounded-lg" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{ar ? "تاريخ النهاية" : "End Date"}</Label>
              <Input type="date" value={formData.endDate} onChange={(e) => setFormData({ ...formData, endDate: e.target.value })} className="h-8 text-sm rounded-lg" />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{ar ? "ملاحظات" : "Notes"}</Label>
            <Textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} placeholder={ar ? "ملاحظات" : "Notes"} className="text-sm min-h-[60px] rounded-lg" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { onOpenChange(false); setFormData(emptyForm); onEditIdChange(null); }}>{ar ? "إلغاء" : "Cancel"}</Button>
          <Button className="bg-teal-600 hover:bg-teal-700 text-white" onClick={handleSave} disabled={!formData.name || createMutation.isPending || updateMutation.isPending}>
            {(createMutation.isPending || updateMutation.isPending) ? (ar ? "جارٍ الحفظ..." : "Saving...") : (ar ? "حفظ" : "Save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
