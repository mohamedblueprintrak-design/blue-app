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
  const tAuto = useTranslations();
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
            {editTender ? (tAuto('auto.editTender')) : (tAuto('auto.newTender'))}
          </DialogTitle>
          <DialogDescription>
            {editTender
              ? (tAuto('auto.editTenderInformation'))
              : (tAuto('auto.addANewTender'))}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-sm">{tAuto('auto.tenderNo')}</Label>
              <Input
                value={formData.tenderNumber}
                onChange={(e) => updateField("tenderNumber", e.target.value)}
                placeholder={tAuto('auto.tenderNumber')}
                className="h-8 text-sm rounded-lg"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">{tAuto('auto.title')} *</Label>
              <Input
                value={formData.title}
                onChange={(e) => updateField("title", e.target.value)}
                placeholder={tAuto('auto.tenderTitle')}
                className="h-8 text-sm rounded-lg"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-sm">{tAuto('auto.authority')}</Label>
              <Select
                value={formData.authority}
                onValueChange={(v) => updateField("authority", v)}
              >
                <SelectTrigger className="h-8 text-sm rounded-lg">
                  <SelectValue placeholder={tAuto('auto.selectAuthority')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rak_municipality">{tAuto('auto.rAKMunicipality')}</SelectItem>
                  <SelectItem value="rak_properties">RAK Properties</SelectItem>
                  <SelectItem value="al_hamra">{tAuto('auto.alHamra')}</SelectItem>
                  <SelectItem value="marjan">{tAuto('auto.marjan')}</SelectItem>
                  <SelectItem value="rakez">RAKEZ</SelectItem>
                  <SelectItem value="private">{tAuto('auto.private')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">{tAuto('auto.projectType')}</Label>
              <Select
                value={formData.projectType}
                onValueChange={(v) => updateField("projectType", v)}
              >
                <SelectTrigger className="h-8 text-sm rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="VILLA">{tAuto('auto.villa')}</SelectItem>
                  <SelectItem value="BUILDING">{tAuto('auto.building')}</SelectItem>
                  <SelectItem value="infrastructure">{tAuto('auto.infrastructure')}</SelectItem>
                  <SelectItem value="road">{tAuto('auto.road')}</SelectItem>
                  <SelectItem value="landscape">{tAuto('auto.landscape')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm">{tAuto('auto.description')}</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => updateField("description", e.target.value)}
              placeholder={tAuto('auto.tenderDescription')}
              className="text-sm min-h-[60px] rounded-lg"
            />
          </div>

          {/* Budget & Dates */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label className="text-sm">{tAuto('auto.estBudget')}</Label>
              <Input
                type="number"
                value={formData.estimatedBudget}
                onChange={(e) => updateField("estimatedBudget", e.target.value)}
                placeholder="0"
                className="h-8 text-sm font-mono tabular-nums rounded-lg"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">{tAuto('auto.closingDate')}</Label>
              <Input
                type="date"
                value={formData.closingDate}
                onChange={(e) => updateField("closingDate", e.target.value)}
                className="h-8 text-sm rounded-lg"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">{tAuto('auto.submissionDate')}</Label>
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
              <Label className="text-sm">{tAuto('auto.status1')}</Label>
              <Select
                value={formData.status}
                onValueChange={(v) => updateField("status", v)}
              >
                <SelectTrigger className="h-8 text-sm rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="IDENTIFIED">{tAuto('auto.identified')}</SelectItem>
                  <SelectItem value="PREPARING">{tAuto('auto.preparing')}</SelectItem>
                  <SelectItem value="SUBMITTED">{tAuto('auto.submitted')}</SelectItem>
                  <SelectItem value="QUALIFIED">{tAuto('auto.qualified')}</SelectItem>
                  <SelectItem value="WON">{tAuto('auto.won')}</SelectItem>
                  <SelectItem value="LOST">{tAuto('auto.lost')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">{tAuto('auto.source')}</Label>
              <Select
                value={formData.source}
                onValueChange={(v) => updateField("source", v)}
              >
                <SelectTrigger className="h-8 text-sm rounded-lg">
                  <SelectValue placeholder={tAuto('auto.selectSource')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="WEBSITE">{tAuto('auto.website')}</SelectItem>
                  <SelectItem value="REFERRAL">{tAuto('auto.referral')}</SelectItem>
                  <SelectItem value="DIRECT">{tAuto('auto.direct')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Conditional Fields */}
          {(formData.status === "WON") && (
            <div className="space-y-2">
              <Label className="text-sm">{tAuto('auto.winnerName')}</Label>
              <Input
                value={formData.winnerName}
                onChange={(e) => updateField("winnerName", e.target.value)}
                placeholder={tAuto('auto.winnerName1')}
                className="h-8 text-sm rounded-lg"
              />
            </div>
          )}

          {(formData.status === "LOST") && (
            <div className="space-y-2">
              <Label className="text-sm">{tAuto('auto.lostReason')}</Label>
              <Textarea
                value={formData.lostReason}
                onChange={(e) => updateField("lostReason", e.target.value)}
                placeholder={tAuto('auto.reasonForLosing')}
                className="text-sm min-h-[50px] rounded-lg"
              />
            </div>
          )}

          {/* Qualifications & Docs */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-sm">{tAuto('auto.qualifications')}</Label>
              <Input
                value={formData.qualifications}
                onChange={(e) => updateField("qualifications", e.target.value)}
                placeholder={tAuto('auto.commaSeparated')}
                className="h-8 text-sm rounded-lg"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">{tAuto('auto.requiredDocs')}</Label>
              <Input
                value={formData.requiredDocs}
                onChange={(e) => updateField("requiredDocs", e.target.value)}
                placeholder={tAuto('auto.commaSeparated')}
                className="h-8 text-sm rounded-lg"
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label className="text-sm">{tAuto('auto.notes')}</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => updateField("notes", e.target.value)}
              placeholder={tAuto('auto.additionalNotes1')}
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
            {tAuto('auto.cancel')}
          </Button>
          <Button
            className="bg-teal-600 hover:bg-teal-700 text-white rounded-lg shadow-sm shadow-teal-600/20"
            disabled={!formData.title.trim() || isPending}
            onClick={onSave}
          >
            {isPending
              ? (tAuto('auto.saving'))
              : (tAuto('auto.save'))}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
