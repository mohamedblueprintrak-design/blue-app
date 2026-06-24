"use client";


import { useTranslations } from 'next-intl';
import { useForm, useWatch, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { employeeSchema, getErrorMessage, type EmployeeFormData } from "@/lib/validations";
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
import type { Employee, UserOption } from "./types";
import { useEffect } from "react";

interface EmployeeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: Employee | null;
  users: UserOption[];
  ar: boolean;
  onSave: (data: EmployeeFormData) => void;
  isSaving: boolean;
}

const EMPTY_FORM: EmployeeFormData = {
  userId: "",
  department: "",
  position: "",
  salary: "0",
  employmentStatus: "ACTIVE",
  hireDate: "",
};

export function EmployeeFormDialog({
  open,
  onOpenChange,
  employee,
  users,
  ar,
  onSave,
  isSaving,
}: EmployeeFormDialogProps) {
  const tAuto = useTranslations();
  const form = useForm<EmployeeFormData>({
    resolver: zodResolver(employeeSchema) as Resolver<EmployeeFormData>,
    defaultValues: EMPTY_FORM,
  });

  const { register, handleSubmit, formState: { errors }, reset, setValue, control } = form;

  // useWatch is the React Compiler–compatible way to observe form values
  const watchedUserId = useWatch({ control, name: "userId" });
  const watchedEmploymentStatus = useWatch({ control, name: "employmentStatus" });

  useEffect(() => {
    if (employee) {
      reset({
        userId: employee.userId,
        department: employee.department,
        position: employee.position,
        salary: String(employee.salary),
        employmentStatus: employee.employmentStatus as EmployeeFormData["employmentStatus"],
        hireDate: employee.hireDate ? employee.hireDate.split("T")[0] : "",
      });
    } else {
      reset(EMPTY_FORM);
    }
  }, [employee, reset]);

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {employee ? (tAuto('auto.editEmployee')) : (tAuto('auto.newEmployee'))}
          </DialogTitle>
          <DialogDescription>
            {employee
              ? (tAuto('auto.editEmployeeInformation'))
              : (tAuto('auto.addANewEmployee'))}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSave)} className="space-y-4">
          {!employee && (
            <div className="space-y-2">
              <Label className="text-sm">{tAuto('auto.user')} *</Label>
              <Select
                value={watchedUserId}
                onValueChange={(v) => setValue("userId", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={tAuto('auto.selectUser')} />
                </SelectTrigger>
                <SelectContent>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.name} ({u.email})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-sm">{tAuto('auto.department')} *</Label>
              <Input
                {...register("department")}
                placeholder={tAuto('auto.eGArchitecture')}
                className={cn(errors.department && "border-red-500")}
              />
              {errors.department && <p className="text-red-500 text-xs mt-1">{getErrorMessage(errors.department.message || "", ar)}</p>}
            </div>
            <div className="space-y-2">
              <Label className="text-sm">{tAuto('auto.position')} *</Label>
              <Input
                {...register("position")}
                placeholder={tAuto('auto.eGSeniorEngineer')}
                className={cn(errors.position && "border-red-500")}
              />
              {errors.position && <p className="text-red-500 text-xs mt-1">{getErrorMessage(errors.position.message || "", ar)}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-sm">{tAuto('auto.salary')} ({tAuto('auto.aED')})</Label>
              <Input
                type="number"
                {...register("salary")}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">{tAuto('auto.employmentStatus')}</Label>
              <Select
                value={watchedEmploymentStatus}
                onValueChange={(v) => setValue("employmentStatus", v as EmployeeFormData["employmentStatus"])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">{tAuto('auto.active')}</SelectItem>
                  <SelectItem value="ON_LEAVE">{tAuto('auto.onLeave')}</SelectItem>
                  <SelectItem value="TERMINATED">{tAuto('auto.terminated')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm">{tAuto('auto.hireDate')}</Label>
            <Input
              type="date"
              {...register("hireDate")}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {tAuto('auto.cancel')}
            </Button>
            <Button
              type="submit"
              className="bg-brand-navy-600 hover:bg-brand-navy-700 text-white"
              disabled={isSaving}
            >
              {isSaving
                ? (tAuto('auto.saving'))
                : (tAuto('auto.save'))}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
