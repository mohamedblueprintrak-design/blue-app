"use client";


import { useTranslations } from 'next-intl';
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import type { ContractItem, ClientOption, ProjectOption } from "./types";
import type { ContractFormData } from "@/lib/validations";
import { getErrorMessage } from "@/lib/validations";
import type { UseFormReturn } from "react-hook-form";

interface ContractFormDialogProps {
  ar: boolean;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  editContract: ContractItem | null;
  form: UseFormReturn<ContractFormData>;
  clients: ClientOption[];
  projects: ProjectOption[];
  onSave: (data: ContractFormData) => void;
  isPending: boolean;
  onCancel: () => void;
}

export function ContractFormDialog({
  ar,
  isOpen,
  onOpenChange,
  editContract,
  form,
  clients,
  projects,
  onSave,
  isPending,
  onCancel,
}: ContractFormDialogProps) {
  const tAuto = useTranslations();
  const { register, handleSubmit, formState: { errors }, setValue, watch } = form;

  return (
    <Dialog
      open={isOpen}
      onOpenChange={onOpenChange}
    >
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editContract ? (tAuto('auto.editContract')) : (tAuto('auto.newContract'))}
          </DialogTitle>
          <DialogDescription>
            {editContract
              ? (tAuto('auto.editContractInformation'))
              : (tAuto('auto.addANewContract'))}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSave as (data: unknown) => void)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-sm">{tAuto('auto.contractNo')} *</Label>
              <Input
                {...register("number")}
                placeholder={tAuto('auto.contractNumber')}
                className={cn("h-8 text-sm rounded-lg", errors.number && "border-red-500")}
              />
              {errors.number && <p className="text-red-500 text-xs mt-1">{getErrorMessage(errors.number.message || "", ar)}</p>}
            </div>
            <div className="space-y-2">
              <Label className="text-sm">{tAuto('auto.title')} *</Label>
              <Input
                {...register("title")}
                placeholder={tAuto('auto.contractTitle')}
                className={cn("h-8 text-sm rounded-lg", errors.title && "border-red-500")}
              />
              {errors.title && <p className="text-red-500 text-xs mt-1">{getErrorMessage(errors.title.message || "", ar)}</p>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-sm">{tAuto('auto.client')} *</Label>
              <Select
                 
                value={watch("clientId")}
                onValueChange={(v) => setValue("clientId", v)}
              >
                <SelectTrigger className={cn("h-8 text-sm rounded-lg", errors.clientId && "border-red-500")}>
                  <SelectValue placeholder={tAuto('auto.selectClient')} />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} {c.company ? `(${c.company})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.clientId && <p className="text-red-500 text-xs mt-1">{getErrorMessage(errors.clientId.message || "", ar)}</p>}
            </div>
            <div className="space-y-2">
              <Label className="text-sm">{tAuto('auto.project')} *</Label>
              <Select
                value={watch("projectId")}
                onValueChange={(v) => setValue("projectId", v)}
              >
                <SelectTrigger className={cn("h-8 text-sm rounded-lg", errors.projectId && "border-red-500")}>
                  <SelectValue placeholder={tAuto('auto.selectProject')} />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {ar ? p.name : p.nameEn || p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.projectId && <p className="text-red-500 text-xs mt-1">{getErrorMessage(errors.projectId.message || "", ar)}</p>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-sm">{tAuto('auto.valueAED')} *</Label>
              <Input
                type="number"
                {...register("value")}
                placeholder="0"
                className={cn("h-8 text-sm font-mono tabular-nums rounded-lg", errors.value && "border-red-500")}
              />
              {errors.value && <p className="text-red-500 text-xs mt-1">{getErrorMessage(errors.value.message || "", ar)}</p>}
            </div>
            <div className="space-y-2">
              <Label className="text-sm">{tAuto('auto.type')}</Label>
              <Select
                value={watch("type")}
                onValueChange={(v) => setValue("type", v as ContractFormData["type"])}
              >
                <SelectTrigger className="h-8 text-sm rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ENGINEERING_SERVICES">{tAuto('auto.engineeringServices')}</SelectItem>
                  <SelectItem value="CONSTRUCTION">{tAuto('auto.construction')}</SelectItem>
                  <SelectItem value="CONSULTING">{tAuto('auto.consulting')}</SelectItem>
                  <SelectItem value="MAINTENANCE">{tAuto('auto.maintenance')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-sm">{tAuto('auto.startDate')}</Label>
              <Input
                type="date"
                {...register("startDate")}
                className="h-8 text-sm rounded-lg"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">{tAuto('auto.endDate')}</Label>
              <Input
                type="date"
                {...register("endDate")}
                className="h-8 text-sm rounded-lg"
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
              type="submit"
              className="bg-brand-navy-600 hover:bg-brand-navy-700 text-white rounded-lg shadow-sm shadow-brand-navy-600/20"
              disabled={isPending}
            >
              {isPending
                ? (tAuto('auto.saving'))
                : (tAuto('auto.save'))}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
