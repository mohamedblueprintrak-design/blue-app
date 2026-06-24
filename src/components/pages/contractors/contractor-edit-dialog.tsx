"use client";


import { useTranslations } from 'next-intl';
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
  const tAuto = useTranslations();
  const update = (field: string, value: string) => setFormData({ ...formData, [field]: value });

  return (
    <Dialog open={open} onOpenChange={(openVal) => { if (!openVal) { onCancel(); } onOpenChange(openVal); }}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isEditing ? <Edit3 className="h-5 w-5 text-amber-600" /> : <Users className="h-5 w-5 text-brand-navy-600" />}
            {isEditing ? (tAuto('auto.editContractor')) : (tAuto('auto.addNewContractor'))}
          </DialogTitle>
          <DialogDescription>{tAuto('auto.completeContractorProfile')}</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1 col-span-2 sm:col-span-1">
            <Label className="text-xs">{tAuto('auto.nameAr')} *</Label>
            <Input value={formData.name} onChange={(e) => update("name", e.target.value)} className="h-8 text-sm rounded-lg" />
          </div>
          <div className="space-y-1 col-span-2 sm:col-span-1">
            <Label className="text-xs">{tAuto('auto.nameEn')}</Label>
            <Input value={formData.nameEn} onChange={(e) => update("nameEn", e.target.value)} className="h-8 text-sm rounded-lg" dir="ltr" />
          </div>
          <div className="space-y-1 col-span-2 sm:col-span-1">
            <Label className="text-xs">{tAuto('auto.companyAr')}</Label>
            <Input value={formData.companyName} onChange={(e) => update("companyName", e.target.value)} className="h-8 text-sm rounded-lg" />
          </div>
          <div className="space-y-1 col-span-2 sm:col-span-1">
            <Label className="text-xs">{tAuto('auto.companyEn')}</Label>
            <Input value={formData.companyEn} onChange={(e) => update("companyEn", e.target.value)} className="h-8 text-sm rounded-lg" dir="ltr" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{tAuto('auto.category')}</Label>
            <Select value={formData.category} onValueChange={(v) => update("category", v)}>
              <SelectTrigger className="h-8 text-sm rounded-lg"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="CIVIL">{tAuto('auto.civil')}</SelectItem>
                <SelectItem value="ELECTRICAL">{tAuto('auto.electrical')}</SelectItem>
                <SelectItem value="MEP">MEP</SelectItem>
                <SelectItem value="FINISHING">{tAuto('auto.finishing')}</SelectItem>
                <SelectItem value="PLUMBING">{tAuto('auto.plumbing')}</SelectItem>
                <SelectItem value="HVAC">{tAuto('auto.hVAC')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{tAuto('auto.rating15')}</Label>
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
            <Label className="text-xs">{tAuto('auto.contactPerson')}</Label>
            <Input value={formData.contactPerson} onChange={(e) => update("contactPerson", e.target.value)} className="h-8 text-sm rounded-lg" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{tAuto('auto.phone')}</Label>
            <Input value={formData.phone} onChange={(e) => update("phone", e.target.value)} className="h-8 text-sm rounded-lg" dir="ltr" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{tAuto('auto.email')}</Label>
            <Input value={formData.email} onChange={(e) => update("email", e.target.value)} className="h-8 text-sm rounded-lg" dir="ltr" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{tAuto('auto.address')}</Label>
            <Input value={formData.address} onChange={(e) => update("address", e.target.value)} className="h-8 text-sm rounded-lg" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{tAuto('auto.cRNumber')}</Label>
            <Input value={formData.crNumber} onChange={(e) => update("crNumber", e.target.value)} className="h-8 text-sm rounded-lg" dir="ltr" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{tAuto('auto.licenseNumber')}</Label>
            <Input value={formData.licenseNumber} onChange={(e) => update("licenseNumber", e.target.value)} className="h-8 text-sm rounded-lg" dir="ltr" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{tAuto('auto.licenseExpiry')}</Label>
            <Input type="date" value={formData.licenseExpiry} onChange={(e) => update("licenseExpiry", e.target.value)} className="h-8 text-sm rounded-lg" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{tAuto('auto.classification')}</Label>
            <Select value={formData.classification} onValueChange={(v) => update("classification", v)}>
              <SelectTrigger className="h-8 text-sm rounded-lg"><SelectValue placeholder={tAuto('auto.selectClassification')} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="first">{tAuto('auto.1stClass')}</SelectItem>
                <SelectItem value="second">{tAuto('auto.2ndClass')}</SelectItem>
                <SelectItem value="third">{tAuto('auto.3rdClass')}</SelectItem>
                <SelectItem value="fourth">{tAuto('auto.4thClass')}</SelectItem>
                <SelectItem value="fifth">{tAuto('auto.5thClass')}</SelectItem>
                <SelectItem value="special">{tAuto('auto.specialCategory')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{tAuto('auto.established')}</Label>
            <Input type="date" value={formData.establishmentDate} onChange={(e) => update("establishmentDate", e.target.value)} className="h-8 text-sm rounded-lg" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{tAuto('auto.workers1')}</Label>
            <Input type="number" value={formData.workerCount} onChange={(e) => update("workerCount", e.target.value)} className="h-8 text-sm rounded-lg" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{tAuto('auto.engineers1')}</Label>
            <Input type="number" value={formData.engineerCount} onChange={(e) => update("engineerCount", e.target.value)} className="h-8 text-sm rounded-lg" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{tAuto('auto.tradeLicense')}</Label>
            <Input value={formData.tradeLicense} onChange={(e) => update("tradeLicense", e.target.value)} className="h-8 text-sm rounded-lg" dir="ltr" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{tAuto('auto.tradeLicenseExpiry')}</Label>
            <Input type="date" value={formData.tradeLicenseExpiry} onChange={(e) => update("tradeLicenseExpiry", e.target.value)} className="h-8 text-sm rounded-lg" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{tAuto('auto.vATNumber')}</Label>
            <Input value={formData.vatNumber} onChange={(e) => update("vatNumber", e.target.value)} className="h-8 text-sm rounded-lg" dir="ltr" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{tAuto('auto.experience')}</Label>
            <Input value={formData.experience} onChange={(e) => update("experience", e.target.value)} placeholder={tAuto('auto.yearsOfExperience')} className="h-8 text-sm rounded-lg" />
          </div>
          <div className="space-y-1 col-span-2">
            <Label className="text-xs">{tAuto('auto.specialties')}</Label>
            <Input value={formData.specialties} onChange={(e) => update("specialties", e.target.value)} placeholder={tAuto('auto.commaSeparated')} className="h-8 text-sm rounded-lg" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{tAuto('auto.bankName')}</Label>
            <Input value={formData.bankName} onChange={(e) => update("bankName", e.target.value)} className="h-8 text-sm rounded-lg" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">IBAN</Label>
            <Input value={formData.iban} onChange={(e) => update("iban", e.target.value)} className="h-8 text-sm rounded-lg font-mono" dir="ltr" />
          </div>
          <div className="space-y-1 col-span-2">
            <Label className="text-xs">{tAuto('auto.notes')}</Label>
            <Textarea value={formData.notes} onChange={(e) => update("notes", e.target.value)} className="text-sm min-h-[50px] rounded-lg" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>{tAuto('auto.cancel')}</Button>
          <Button
            className="bg-brand-navy-600 hover:bg-brand-navy-700 text-white rounded-lg"
            onClick={() => saveMutation.mutate(formData)}
            disabled={!formData.name || saveMutation.isPending}
          >
            {saveMutation.isPending ? (tAuto('auto.saving')) : (tAuto('auto.save'))}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
