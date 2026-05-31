"use client";

import { Button } from "@/components/ui/button";
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
import { TenderFormData, TenderItem } from "./types";

interface TenderFormProps {
  open: boolean;
  editTender: TenderItem | null;
  formData: TenderFormData;
  isAr: boolean;
  isPending: boolean;
  onFormDataChange: (data: TenderFormData) => void;
  onSave: () => void;
  onCancel: () => void;
}

export function TenderForm({
  open,
  editTender,
  formData,
  isAr,
  isPending,
  onFormDataChange,
  onSave,
  onCancel,
}: TenderFormProps) {
  const updateField = <K extends keyof TenderFormData>(key: K, value: TenderFormData[K]) => {
    onFormDataChange({ ...formData, [key]: value });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onCancel();
      }}
    >
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editTender ? (isAr ? "تعديل مناقصة" : "Edit Tender") : (isAr ? "مناقصة جديدة" : "New Tender")}
          </DialogTitle>
          <DialogDescription>
            {editTender
              ? (isAr ? "تعديل بيانات المناقصة" : "Edit tender information")
              : (isAr ? "إضافة مناقصة جديدة" : "Add a new tender")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-sm">{isAr ? "رقم المناقصة" : "Tender No."}</Label>
              <Input
                value={formData.tenderNumber}
                onChange={(e) => updateField("tenderNumber", e.target.value)}
                placeholder={isAr ? "رقم المناقصة" : "Tender number"}
                className="h-8 text-sm rounded-lg"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">{isAr ? "العنوان" : "Title"} *</Label>
              <Input
                value={formData.title}
                onChange={(e) => updateField("title", e.target.value)}
                placeholder={isAr ? "عنوان المناقصة" : "Tender title"}
                className="h-8 text-sm rounded-lg"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-sm">{isAr ? "الجهة" : "Authority"}</Label>
              <Select
                value={formData.authority}
                onValueChange={(v) => updateField("authority", v)}
              >
                <SelectTrigger className="h-8 text-sm rounded-lg">
                  <SelectValue placeholder={isAr ? "اختر الجهة" : "Select authority"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rak_municipality">{isAr ? "بلدية رأس الخيمة" : "RAK Municipality"}</SelectItem>
                  <SelectItem value="rak_properties">RAK Properties</SelectItem>
                  <SelectItem value="al_hamra">{isAr ? "الحمراء" : "Al Hamra"}</SelectItem>
                  <SelectItem value="marjan">{isAr ? "مرجان" : "Marjan"}</SelectItem>
                  <SelectItem value="rakez">RAKEZ</SelectItem>
                  <SelectItem value="private">{isAr ? "خاصة" : "Private"}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">{isAr ? "نوع المشروع" : "Project Type"}</Label>
              <Select
                value={formData.projectType}
                onValueChange={(v) => updateField("projectType", v)}
              >
                <SelectTrigger className="h-8 text-sm rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="VILLA">{isAr ? "فيلا" : "Villa"}</SelectItem>
                  <SelectItem value="BUILDING">{isAr ? "مبنى" : "Building"}</SelectItem>
                  <SelectItem value="infrastructure">{isAr ? "بنية تحتية" : "Infrastructure"}</SelectItem>
                  <SelectItem value="road">{isAr ? "طريق" : "Road"}</SelectItem>
                  <SelectItem value="landscape">{isAr ? "تنسيق مواقع" : "Landscape"}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm">{isAr ? "الوصف" : "Description"}</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => updateField("description", e.target.value)}
              placeholder={isAr ? "وصف المناقصة..." : "Tender description..."}
              className="text-sm min-h-[60px] rounded-lg"
            />
          </div>

          {/* Budget & Dates */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label className="text-sm">{isAr ? "الميزانية التقديرية" : "Est. Budget"}</Label>
              <Input
                type="number"
                value={formData.estimatedBudget}
                onChange={(e) => updateField("estimatedBudget", e.target.value)}
                placeholder="0"
                className="h-8 text-sm font-mono tabular-nums rounded-lg"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">{isAr ? "تاريخ الإغلاق" : "Closing Date"}</Label>
              <Input
                type="date"
                value={formData.closingDate}
                onChange={(e) => updateField("closingDate", e.target.value)}
                className="h-8 text-sm rounded-lg"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">{isAr ? "تاريخ التقديم" : "Submission Date"}</Label>
              <Input
                type="date"
                value={formData.submissionDate}
                onChange={(e) => updateField("submissionDate", e.target.value)}
                className="h-8 text-sm rounded-lg"
              />
            </div>
          </div>

          {/* Status & Source */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-sm">{isAr ? "الحالة" : "Status"}</Label>
              <Select
                value={formData.status}
                onValueChange={(v) => updateField("status", v)}
              >
                <SelectTrigger className="h-8 text-sm rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="IDENTIFIED">{isAr ? "مُحدّدة" : "Identified"}</SelectItem>
                  <SelectItem value="PREPARING">{isAr ? "قيد التحضير" : "Preparing"}</SelectItem>
                  <SelectItem value="SUBMITTED">{isAr ? "مقدّمة" : "Submitted"}</SelectItem>
                  <SelectItem value="QUALIFIED">{isAr ? "مؤهّلة" : "Qualified"}</SelectItem>
                  <SelectItem value="WON">{isAr ? "فُزنا" : "Won"}</SelectItem>
                  <SelectItem value="LOST">{isAr ? "خسرنا" : "Lost"}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">{isAr ? "المصدر" : "Source"}</Label>
              <Select
                value={formData.source}
                onValueChange={(v) => updateField("source", v)}
              >
                <SelectTrigger className="h-8 text-sm rounded-lg">
                  <SelectValue placeholder={isAr ? "اختر المصدر" : "Select source"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="WEBSITE">{isAr ? "موقع إلكتروني" : "Website"}</SelectItem>
                  <SelectItem value="REFERRAL">{isAr ? "إحالة" : "Referral"}</SelectItem>
                  <SelectItem value="DIRECT">{isAr ? "مباشر" : "Direct"}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Conditional Fields */}
          {(formData.status === "WON") && (
            <div className="space-y-2">
              <Label className="text-sm">{isAr ? "اسم الفائز" : "Winner Name"}</Label>
              <Input
                value={formData.winnerName}
                onChange={(e) => updateField("winnerName", e.target.value)}
                placeholder={isAr ? "اسم الفائز" : "Winner name"}
                className="h-8 text-sm rounded-lg"
              />
            </div>
          )}

          {(formData.status === "LOST") && (
            <div className="space-y-2">
              <Label className="text-sm">{isAr ? "سبب الخسارة" : "Lost Reason"}</Label>
              <Textarea
                value={formData.lostReason}
                onChange={(e) => updateField("lostReason", e.target.value)}
                placeholder={isAr ? "سبب الخسارة..." : "Reason for losing..."}
                className="text-sm min-h-[50px] rounded-lg"
              />
            </div>
          )}

          {/* Qualifications & Docs */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-sm">{isAr ? "المؤهلات المطلوبة" : "Qualifications"}</Label>
              <Input
                value={formData.qualifications}
                onChange={(e) => updateField("qualifications", e.target.value)}
                placeholder={isAr ? "مفصولة بفواصل" : "Comma-separated"}
                className="h-8 text-sm rounded-lg"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">{isAr ? "المستندات المطلوبة" : "Required Docs"}</Label>
              <Input
                value={formData.requiredDocs}
                onChange={(e) => updateField("requiredDocs", e.target.value)}
                placeholder={isAr ? "مفصولة بفواصل" : "Comma-separated"}
                className="h-8 text-sm rounded-lg"
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label className="text-sm">{isAr ? "ملاحظات" : "Notes"}</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => updateField("notes", e.target.value)}
              placeholder={isAr ? "ملاحظات إضافية..." : "Additional notes..."}
              className="text-sm min-h-[50px] rounded-lg"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            className="rounded-lg"
            onClick={onCancel}
          >
            {isAr ? "إلغاء" : "Cancel"}
          </Button>
          <Button
            className="bg-teal-600 hover:bg-teal-700 text-white rounded-lg shadow-sm shadow-teal-600/20"
            disabled={!formData.title.trim() || isPending}
            onClick={onSave}
          >
            {isPending
              ? (isAr ? "جارٍ الحفظ..." : "Saving...")
              : (isAr ? "حفظ" : "Save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
