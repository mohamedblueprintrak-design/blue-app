"use client";


import { useTranslations } from 'next-intl';
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
  const tAuto = useTranslations();
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
              <Send className="h-5 w-5 text-brand-navy-500" />
              {tAuto('auto.newTransmittal')}
            </DialogTitle>
            <DialogDescription>
              {tAuto('auto.createAndSendANewDocumentTransmittal')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm">{tAuto('auto.project2')}</Label>
                <Select value={formData.projectId} onValueChange={(v) => setFormData({ ...formData, projectId: v })}>
                  <SelectTrigger><SelectValue placeholder={tAuto('auto.selectProject')} /></SelectTrigger>
                  <SelectContent>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{ar ? p.name : p.nameEn || p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm">{tAuto('auto.deliveryMethod')}</Label>
                <Select value={formData.deliveryMethod} onValueChange={(v) => setFormData({ ...formData, deliveryMethod: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EMAIL">{tAuto('auto.email')}</SelectItem>
                    <SelectItem value="MANUAL">{tAuto('auto.manual')}</SelectItem>
                    <SelectItem value="COURIER">{tAuto('auto.courier')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm">{tAuto('auto.subject1')}</Label>
              <Input
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                placeholder={tAuto('auto.transmittalSubject')}
              />
            </div>

            <Separator />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm">{tAuto('auto.from1')}</Label>
                <Select value={formData.fromId} onValueChange={(v) => setFormData({ ...formData, fromId: v })}>
                  <SelectTrigger><SelectValue placeholder={tAuto('auto.selectSender')} /></SelectTrigger>
                  <SelectContent>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm">{tAuto('auto.toName')}</Label>
                <Input
                  value={formData.toName}
                  onChange={(e) => setFormData({ ...formData, toName: e.target.value })}
                  placeholder={tAuto('auto.recipientName')}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label className="text-sm">{tAuto('auto.email')}</Label>
                <Input
                  value={formData.toEmail}
                  onChange={(e) => setFormData({ ...formData, toEmail: e.target.value })}
                  placeholder="email@example.com"
                  type="email"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">{tAuto('auto.company')}</Label>
                <Input
                  value={formData.toCompany}
                  onChange={(e) => setFormData({ ...formData, toCompany: e.target.value })}
                  placeholder={tAuto('auto.companyName')}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">{tAuto('auto.phone')}</Label>
                <Input
                  value={formData.toPhone}
                  onChange={(e) => setFormData({ ...formData, toPhone: e.target.value })}
                  placeholder={tAuto('auto.phoneNumber')}
                />
              </div>
            </div>

            <Separator />

            {/* Transmittal Items */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium flex items-center gap-1.5">
                  <Package className="h-4 w-4" />
                  {tAuto('auto.transmittalItems')}
                </Label>
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={addNewItem}>
                  <Plus className="h-3 w-3 me-1" />
                  {tAuto('auto.addItem1')}
                </Button>
              </div>

              {newItems.length === 0 ? (
                <div className="text-center py-4 border border-dashed border-slate-200 dark:border-slate-700 rounded-lg">
                  <p className="text-xs text-slate-400">
                    {tAuto('auto.noItemsAddedYet')}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {newItems.map((item, index) => (
                    <div key={index} className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                          {tAuto('auto.item')} {index + 1}
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
                          placeholder={tAuto('auto.docNumber')}
                        />
                        <Input
                          className="h-7 text-xs"
                          value={item.title}
                          onChange={(e) => updateNewItem(index, "title", e.target.value)}
                          placeholder={tAuto('auto.title')}
                        />
                        <Input
                          className="h-7 text-xs"
                          value={item.revision}
                          onChange={(e) => updateNewItem(index, "revision", e.target.value)}
                          placeholder={tAuto('auto.rev2')}
                        />
                        <Select value={item.purpose} onValueChange={(v) => updateNewItem(index, "purpose", v)}>
                          <SelectTrigger className="h-7 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="REVIEW">{tAuto('auto.review')}</SelectItem>
                            <SelectItem value="APPROVAL">{tAuto('auto.approval')}</SelectItem>
                            <SelectItem value="INFORMATION">{tAuto('auto.information')}</SelectItem>
                            <SelectItem value="EXECUTION">{tAuto('auto.execution')}</SelectItem>
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
              {tAuto('auto.cancel')}
            </Button>
            <Button
              className="bg-brand-navy-600 hover:bg-brand-navy-700 text-white"
              onClick={handleSubmit}
              disabled={!formData.projectId || !formData.subject || !formData.fromId || isPending}
            >
              {isPending ? (tAuto('auto.creating')) : (tAuto('auto.createSend'))}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
}
