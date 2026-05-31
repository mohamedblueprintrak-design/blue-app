"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  Plus,
  Send,
  X,
  Package,
} from "lucide-react";
import type { ProjectOption, UserOption } from "./types";

interface CreateTransmittalDialogProps {
  ar: boolean;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  projects: ProjectOption[];
  users: UserOption[];
  projectId?: string;
  filterProject: string;
  onSubmit: (data: Record<string, unknown>) => void;
  isPending: boolean;
}

export function CreateTransmittalDialog({
  ar,
  isOpen,
  onOpenChange,
  projects,
  users,
  projectId,
  filterProject,
  onSubmit,
  isPending,
}: CreateTransmittalDialogProps) {
  const [formData, setFormData] = useState({
    projectId: projectId || "",
    subject: "",
    fromId: "",
    toName: "",
    toEmail: "",
    toCompany: "",
    toPhone: "",
    deliveryMethod: "EMAIL",
  });

  const [newItems, setNewItems] = useState<
    Array<{ documentNumber: string; title: string; revision: string; copies: number; purpose: string }>
  >([]);

  const resetForm = () => {
    setFormData({
      projectId: projectId || (filterProject !== "all" ? filterProject : ""),
      subject: "",
      fromId: "",
      toName: "",
      toEmail: "",
      toCompany: "",
      toPhone: "",
      deliveryMethod: "EMAIL",
    });
    setNewItems([]);
  };

  const addNewItem = () => {
    setNewItems([...newItems, { documentNumber: "", title: "", revision: "0", copies: 1, purpose: "REVIEW" }]);
  };

  const removeNewItem = (index: number) => {
    setNewItems(newItems.filter((_, i) => i !== index));
  };

  const updateNewItem = (index: number, field: string, value: string | number) => {
    const updated = [...newItems];
    updated[index] = { ...updated[index], [field]: value };
    setNewItems(updated);
  };

  const handleSubmit = () => {
    onSubmit({
      ...formData,
      items: newItems.length > 0 ? newItems : [],
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5 text-teal-500" />
              {ar ? "إحالة جديدة" : "New Transmittal"}
            </DialogTitle>
            <DialogDescription>
              {ar ? "إنشاء إحالة مستندات جديدة وإرسالها" : "Create and send a new document transmittal"}
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
                <Label className="text-sm">{ar ? "طريقة التسليم" : "Delivery Method"}</Label>
                <Select value={formData.deliveryMethod} onValueChange={(v) => setFormData({ ...formData, deliveryMethod: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EMAIL">{ar ? "بريد إلكتروني" : "Email"}</SelectItem>
                    <SelectItem value="MANUAL">{ar ? "يدوي" : "Manual"}</SelectItem>
                    <SelectItem value="COURIER">{ar ? "ساعي" : "Courier"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm">{ar ? "الموضوع *" : "Subject *"}</Label>
              <Input
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                placeholder={ar ? "موضوع الإحالة" : "Transmittal subject"}
              />
            </div>

            <Separator />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm">{ar ? "من (المرسل) *" : "From *"}</Label>
                <Select value={formData.fromId} onValueChange={(v) => setFormData({ ...formData, fromId: v })}>
                  <SelectTrigger><SelectValue placeholder={ar ? "اختر المرسل" : "Select sender"} /></SelectTrigger>
                  <SelectContent>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm">{ar ? "إلى (الاسم)" : "To (Name)"}</Label>
                <Input
                  value={formData.toName}
                  onChange={(e) => setFormData({ ...formData, toName: e.target.value })}
                  placeholder={ar ? "اسم المستلم" : "Recipient name"}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label className="text-sm">{ar ? "البريد الإلكتروني" : "Email"}</Label>
                <Input
                  value={formData.toEmail}
                  onChange={(e) => setFormData({ ...formData, toEmail: e.target.value })}
                  placeholder="email@example.com"
                  type="email"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">{ar ? "الشركة" : "Company"}</Label>
                <Input
                  value={formData.toCompany}
                  onChange={(e) => setFormData({ ...formData, toCompany: e.target.value })}
                  placeholder={ar ? "اسم الشركة" : "Company name"}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">{ar ? "الهاتف" : "Phone"}</Label>
                <Input
                  value={formData.toPhone}
                  onChange={(e) => setFormData({ ...formData, toPhone: e.target.value })}
                  placeholder={ar ? "رقم الهاتف" : "Phone number"}
                />
              </div>
            </div>

            <Separator />

            {/* Transmittal Items */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium flex items-center gap-1.5">
                  <Package className="h-4 w-4" />
                  {ar ? "بنود الإحالة" : "Transmittal Items"}
                </Label>
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={addNewItem}>
                  <Plus className="h-3 w-3 me-1" />
                  {ar ? "إضافة بند" : "Add Item"}
                </Button>
              </div>

              {newItems.length === 0 ? (
                <div className="text-center py-4 border border-dashed border-slate-200 dark:border-slate-700 rounded-lg">
                  <p className="text-xs text-slate-400">
                    {ar ? "لم يتم إضافة بنود بعد" : "No items added yet"}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {newItems.map((item, index) => (
                    <div key={index} className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                          {ar ? "بند" : "Item"} {index + 1}
                        </span>
                        <button
                          onClick={() => removeNewItem(index)}
                          className="p-0.5 text-slate-400 hover:text-red-500"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          className="h-7 text-xs"
                          value={item.documentNumber}
                          onChange={(e) => updateNewItem(index, "documentNumber", e.target.value)}
                          placeholder={ar ? "رقم المستند" : "Doc Number"}
                        />
                        <Input
                          className="h-7 text-xs"
                          value={item.title}
                          onChange={(e) => updateNewItem(index, "title", e.target.value)}
                          placeholder={ar ? "العنوان" : "Title"}
                        />
                        <Input
                          className="h-7 text-xs"
                          value={item.revision}
                          onChange={(e) => updateNewItem(index, "revision", e.target.value)}
                          placeholder={ar ? "المراجعة" : "Rev"}
                        />
                        <Select value={item.purpose} onValueChange={(v) => updateNewItem(index, "purpose", v)}>
                          <SelectTrigger className="h-7 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="REVIEW">{ar ? "مراجعة" : "Review"}</SelectItem>
                            <SelectItem value="APPROVAL">{ar ? "اعتماد" : "Approval"}</SelectItem>
                            <SelectItem value="INFORMATION">{ar ? "معلومات" : "Information"}</SelectItem>
                            <SelectItem value="EXECUTION">{ar ? "تنفيذ" : "Execution"}</SelectItem>
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
              onClick={handleSubmit}
              disabled={!formData.projectId || !formData.subject || !formData.fromId || isPending}
            >
              {isPending ? (ar ? "جارٍ الإنشاء..." : "Creating...") : (ar ? "إنشاء وإرسال" : "Create & Send")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
}
