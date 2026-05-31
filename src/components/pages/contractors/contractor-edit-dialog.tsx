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
import { Edit3, Users } from "lucide-react";
import { emptyForm } from "./types";

interface ContractorEditDialogProps {
  ar: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isEditing: boolean;
  formData: typeof emptyForm;
  setFormData: (d: typeof emptyForm) => void;
  saveMutation: { isPending: boolean; mutate: (data: typeof emptyForm) => void };
  onCancel: () => void;
}

export function ContractorEditDialog({
  ar,
  open,
  onOpenChange,
  isEditing,
  formData,
  setFormData,
  saveMutation,
  onCancel,
}: ContractorEditDialogProps) {
  const update = (field: string, value: string) => setFormData({ ...formData, [field]: value });

  return (
    <Dialog open={open} onOpenChange={(openVal) => { if (!openVal) { onCancel(); } onOpenChange(openVal); }}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isEditing ? <Edit3 className="h-5 w-5 text-amber-600" /> : <Users className="h-5 w-5 text-teal-600" />}
            {isEditing ? (ar ? "تعديل مقاول" : "Edit Contractor") : (ar ? "إضافة مقاول جديد" : "Add New Contractor")}
          </DialogTitle>
          <DialogDescription>{ar ? "ملف المقاول الكامل" : "Complete contractor profile"}</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1 col-span-2 sm:col-span-1">
            <Label className="text-xs">{ar ? "الاسم (عربي)" : "Name (Ar)"} *</Label>
            <Input value={formData.name} onChange={(e) => update("name", e.target.value)} className="h-8 text-sm rounded-lg" />
          </div>
          <div className="space-y-1 col-span-2 sm:col-span-1">
            <Label className="text-xs">{ar ? "الاسم (إنجليزي)" : "Name (En)"}</Label>
            <Input value={formData.nameEn} onChange={(e) => update("nameEn", e.target.value)} className="h-8 text-sm rounded-lg" dir="ltr" />
          </div>
          <div className="space-y-1 col-span-2 sm:col-span-1">
            <Label className="text-xs">{ar ? "اسم الشركة (عربي)" : "Company (Ar)"}</Label>
            <Input value={formData.companyName} onChange={(e) => update("companyName", e.target.value)} className="h-8 text-sm rounded-lg" />
          </div>
          <div className="space-y-1 col-span-2 sm:col-span-1">
            <Label className="text-xs">{ar ? "اسم الشركة (إنجليزي)" : "Company (En)"}</Label>
            <Input value={formData.companyEn} onChange={(e) => update("companyEn", e.target.value)} className="h-8 text-sm rounded-lg" dir="ltr" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{ar ? "التخصص" : "Category"}</Label>
            <Select value={formData.category} onValueChange={(v) => update("category", v)}>
              <SelectTrigger className="h-8 text-sm rounded-lg"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="CIVIL">{ar ? "أشغال مدنية" : "Civil"}</SelectItem>
                <SelectItem value="ELECTRICAL">{ar ? "كهرباء" : "Electrical"}</SelectItem>
                <SelectItem value="MEP">MEP</SelectItem>
                <SelectItem value="FINISHING">{ar ? "تشطيبات" : "Finishing"}</SelectItem>
                <SelectItem value="PLUMBING">{ar ? "سباكة" : "Plumbing"}</SelectItem>
                <SelectItem value="HVAC">{ar ? "تكييف" : "HVAC"}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{ar ? "التقييم (1-5)" : "Rating (1-5)"}</Label>
            <Select value={formData.rating} onValueChange={(v) => update("rating", v)}>
              <SelectTrigger className="h-8 text-sm rounded-lg"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5].map((r) => (
                  <SelectItem key={r} value={String(r)}>{r} ★</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{ar ? "جهة الاتصال" : "Contact Person"}</Label>
            <Input value={formData.contactPerson} onChange={(e) => update("contactPerson", e.target.value)} className="h-8 text-sm rounded-lg" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{ar ? "الهاتف" : "Phone"}</Label>
            <Input value={formData.phone} onChange={(e) => update("phone", e.target.value)} className="h-8 text-sm rounded-lg" dir="ltr" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{ar ? "البريد الإلكتروني" : "Email"}</Label>
            <Input value={formData.email} onChange={(e) => update("email", e.target.value)} className="h-8 text-sm rounded-lg" dir="ltr" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{ar ? "العنوان" : "Address"}</Label>
            <Input value={formData.address} onChange={(e) => update("address", e.target.value)} className="h-8 text-sm rounded-lg" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{ar ? "رقم السجل التجاري" : "CR Number"}</Label>
            <Input value={formData.crNumber} onChange={(e) => update("crNumber", e.target.value)} className="h-8 text-sm rounded-lg" dir="ltr" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{ar ? "رقم الترخيص" : "License Number"}</Label>
            <Input value={formData.licenseNumber} onChange={(e) => update("licenseNumber", e.target.value)} className="h-8 text-sm rounded-lg" dir="ltr" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{ar ? "انتهاء الترخيص" : "License Expiry"}</Label>
            <Input type="date" value={formData.licenseExpiry} onChange={(e) => update("licenseExpiry", e.target.value)} className="h-8 text-sm rounded-lg" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{ar ? "تصنيف المقاول" : "Classification"}</Label>
            <Select value={formData.classification} onValueChange={(v) => update("classification", v)}>
              <SelectTrigger className="h-8 text-sm rounded-lg"><SelectValue placeholder={ar ? "اختر التصنيف" : "Select classification"} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="first">{ar ? "الدرجة الأولى" : "1st Class"}</SelectItem>
                <SelectItem value="second">{ar ? "الدرجة الثانية" : "2nd Class"}</SelectItem>
                <SelectItem value="third">{ar ? "الدرجة الثالثة" : "3rd Class"}</SelectItem>
                <SelectItem value="fourth">{ar ? "الدرجة الرابعة" : "4th Class"}</SelectItem>
                <SelectItem value="fifth">{ar ? "الدرجة الخامسة" : "5th Class"}</SelectItem>
                <SelectItem value="special">{ar ? "فئة خاصة" : "Special Category"}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{ar ? "تاريخ التأسيس" : "Established"}</Label>
            <Input type="date" value={formData.establishmentDate} onChange={(e) => update("establishmentDate", e.target.value)} className="h-8 text-sm rounded-lg" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{ar ? "عدد العمال" : "Workers"}</Label>
            <Input type="number" value={formData.workerCount} onChange={(e) => update("workerCount", e.target.value)} className="h-8 text-sm rounded-lg" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{ar ? "عدد المهندسين" : "Engineers"}</Label>
            <Input type="number" value={formData.engineerCount} onChange={(e) => update("engineerCount", e.target.value)} className="h-8 text-sm rounded-lg" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{ar ? "رقم السجل التجاري" : "Trade License"}</Label>
            <Input value={formData.tradeLicense} onChange={(e) => update("tradeLicense", e.target.value)} className="h-8 text-sm rounded-lg" dir="ltr" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{ar ? "انتهاء السجل التجاري" : "Trade License Expiry"}</Label>
            <Input type="date" value={formData.tradeLicenseExpiry} onChange={(e) => update("tradeLicenseExpiry", e.target.value)} className="h-8 text-sm rounded-lg" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{ar ? "الرقم الضريبي" : "VAT Number"}</Label>
            <Input value={formData.vatNumber} onChange={(e) => update("vatNumber", e.target.value)} className="h-8 text-sm rounded-lg" dir="ltr" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{ar ? "الخبرة" : "Experience"}</Label>
            <Input value={formData.experience} onChange={(e) => update("experience", e.target.value)} placeholder={ar ? "سنوات الخبرة" : "Years of experience"} className="h-8 text-sm rounded-lg" />
          </div>
          <div className="space-y-1 col-span-2">
            <Label className="text-xs">{ar ? "التخصصات" : "Specialties"}</Label>
            <Input value={formData.specialties} onChange={(e) => update("specialties", e.target.value)} placeholder={ar ? "مفصولة بفواصل" : "Comma-separated"} className="h-8 text-sm rounded-lg" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{ar ? "البنك" : "Bank Name"}</Label>
            <Input value={formData.bankName} onChange={(e) => update("bankName", e.target.value)} className="h-8 text-sm rounded-lg" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">IBAN</Label>
            <Input value={formData.iban} onChange={(e) => update("iban", e.target.value)} className="h-8 text-sm rounded-lg font-mono" dir="ltr" />
          </div>
          <div className="space-y-1 col-span-2">
            <Label className="text-xs">{ar ? "ملاحظات" : "Notes"}</Label>
            <Textarea value={formData.notes} onChange={(e) => update("notes", e.target.value)} className="text-sm min-h-[50px] rounded-lg" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>{ar ? "إلغاء" : "Cancel"}</Button>
          <Button
            className="bg-teal-600 hover:bg-teal-700 text-white rounded-lg"
            onClick={() => saveMutation.mutate(formData)}
            disabled={!formData.name || saveMutation.isPending}
          >
            {saveMutation.isPending ? (ar ? "جارٍ الحفظ..." : "Saving...") : (ar ? "حفظ" : "Save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
