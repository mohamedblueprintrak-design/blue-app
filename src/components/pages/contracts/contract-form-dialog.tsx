"use client";

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
  const { register, handleSubmit, formState: { errors }, setValue, watch } = form;

  return (
    <Dialog
      open={isOpen}
      onOpenChange={onOpenChange}
    >
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editContract ? (ar ? "تعديل عقد" : "Edit Contract") : (ar ? "عقد جديد" : "New Contract")}
          </DialogTitle>
          <DialogDescription>
            {editContract
              ? (ar ? "تعديل بيانات العقد" : "Edit contract information")
              : (ar ? "إضافة عقد جديد" : "Add a new contract")}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSave as (data: unknown) => void)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-sm">{ar ? "رقم العقد" : "Contract No."} *</Label>
              <Input
                {...register("number")}
                placeholder={ar ? "رقم العقد" : "Contract number"}
                className={cn("h-8 text-sm rounded-lg", errors.number && "border-red-500")}
              />
              {errors.number && <p className="text-red-500 text-xs mt-1">{getErrorMessage(errors.number.message || "", ar)}</p>}
            </div>
            <div className="space-y-2">
              <Label className="text-sm">{ar ? "العنوان" : "Title"} *</Label>
              <Input
                {...register("title")}
                placeholder={ar ? "عنوان العقد" : "Contract title"}
                className={cn("h-8 text-sm rounded-lg", errors.title && "border-red-500")}
              />
              {errors.title && <p className="text-red-500 text-xs mt-1">{getErrorMessage(errors.title.message || "", ar)}</p>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-sm">{ar ? "العميل" : "Client"} *</Label>
              <Select
                 
                value={watch("clientId")}
                onValueChange={(v) => setValue("clientId", v)}
              >
                <SelectTrigger className={cn("h-8 text-sm rounded-lg", errors.clientId && "border-red-500")}>
                  <SelectValue placeholder={ar ? "اختر عميل" : "Select client"} />
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
              <Label className="text-sm">{ar ? "المشروع" : "Project"} *</Label>
              <Select
                value={watch("projectId")}
                onValueChange={(v) => setValue("projectId", v)}
              >
                <SelectTrigger className={cn("h-8 text-sm rounded-lg", errors.projectId && "border-red-500")}>
                  <SelectValue placeholder={ar ? "اختر مشروع" : "Select project"} />
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
              <Label className="text-sm">{ar ? "القيمة (د.إ)" : "Value (AED)"} *</Label>
              <Input
                type="number"
                {...register("value")}
                placeholder="0"
                className={cn("h-8 text-sm font-mono tabular-nums rounded-lg", errors.value && "border-red-500")}
              />
              {errors.value && <p className="text-red-500 text-xs mt-1">{getErrorMessage(errors.value.message || "", ar)}</p>}
            </div>
            <div className="space-y-2">
              <Label className="text-sm">{ar ? "النوع" : "Type"}</Label>
              <Select
                value={watch("type")}
                onValueChange={(v) => setValue("type", v as ContractFormData["type"])}
              >
                <SelectTrigger className="h-8 text-sm rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ENGINEERING_SERVICES">{ar ? "خدمات هندسية" : "Engineering Services"}</SelectItem>
                  <SelectItem value="CONSTRUCTION">{ar ? "بناء" : "Construction"}</SelectItem>
                  <SelectItem value="CONSULTING">{ar ? "استشارات" : "Consulting"}</SelectItem>
                  <SelectItem value="MAINTENANCE">{ar ? "صيانة" : "Maintenance"}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-sm">{ar ? "تاريخ البدء" : "Start Date"}</Label>
              <Input
                type="date"
                {...register("startDate")}
                className="h-8 text-sm rounded-lg"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">{ar ? "تاريخ الانتهاء" : "End Date"}</Label>
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
              {ar ? "إلغاء" : "Cancel"}
            </Button>
            <Button
              type="submit"
              className="bg-teal-600 hover:bg-teal-700 text-white rounded-lg shadow-sm shadow-teal-600/20"
              disabled={isPending}
            >
              {isPending
                ? (ar ? "جارٍ الحفظ..." : "Saving...")
                : (ar ? "حفظ" : "Save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
