"use client";

import { useForm, type Resolver } from "react-hook-form";
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

export function EmployeeFormDialog({
  open,
  onOpenChange,
  employee,
  users,
  ar,
  onSave,
  isSaving,
}: EmployeeFormDialogProps) {
  // eslint-disable-next-line react-hooks/exhaustive-deps -- emptyForm is a stable default values object
  const emptyForm = {
    userId: "",
    department: "",
    position: "",
    salary: "0",
    employmentStatus: "ACTIVE",
    hireDate: "",
  };

  const form = useForm<EmployeeFormData>({
    resolver: zodResolver(employeeSchema) as unknown as Resolver<EmployeeFormData>,
    defaultValues: emptyForm,
  });

  const { register, handleSubmit, formState: { errors }, reset, setValue, watch } = form;

  useEffect(() => {
    if (employee) {
      reset({
        userId: employee.userId,
        department: employee.department,
        position: employee.position,
        salary: String(employee.salary),
        employmentStatus: employee.employmentStatus,
        hireDate: employee.hireDate ? employee.hireDate.split("T")[0] : "",
      });
    } else {
      reset(emptyForm);
    }
  }, [employee, reset, emptyForm]);

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {employee ? (ar ? "تعديل موظف" : "Edit Employee") : (ar ? "موظف جديد" : "New Employee")}
          </DialogTitle>
          <DialogDescription>
            {employee
              ? (ar ? "تعديل بيانات الموظف" : "Edit employee information")
              : (ar ? "إضافة موظف جديد" : "Add a new employee")}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSave)} className="space-y-4">
          {!employee && (
            <div className="space-y-2">
              <Label className="text-sm">{ar ? "المستخدم" : "User"} *</Label>
              <Select
                value={watch("userId")}
                onValueChange={(v) => setValue("userId", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={ar ? "اختر مستخدم" : "Select user"} />
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
              <Label className="text-sm">{ar ? "القسم" : "Department"} *</Label>
              <Input
                {...register("department")}
                placeholder={ar ? "مثال: الهندسة المعمارية" : "e.g., Architecture"}
                className={cn(errors.department && "border-red-500")}
              />
              {errors.department && <p className="text-red-500 text-xs mt-1">{getErrorMessage(errors.department.message || "", ar)}</p>}
            </div>
            <div className="space-y-2">
              <Label className="text-sm">{ar ? "المنصب" : "Position"} *</Label>
              <Input
                {...register("position")}
                placeholder={ar ? "مثال: مهندس أول" : "e.g., Senior Engineer"}
                className={cn(errors.position && "border-red-500")}
              />
              {errors.position && <p className="text-red-500 text-xs mt-1">{getErrorMessage(errors.position.message || "", ar)}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-sm">{ar ? "الراتب" : "Salary"} ({ar ? "د.إ" : "AED"})</Label>
              <Input
                type="number"
                {...register("salary")}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">{ar ? "حالة التوظيف" : "Employment Status"}</Label>
              <Select
                value={watch("employmentStatus")}
                onValueChange={(v) => setValue("employmentStatus", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">{ar ? "نشط" : "Active"}</SelectItem>
                  <SelectItem value="ON_LEAVE">{ar ? "إجازة" : "On Leave"}</SelectItem>
                  <SelectItem value="TERMINATED">{ar ? "منتهي" : "Terminated"}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm">{ar ? "تاريخ التعيين" : "Hire Date"}</Label>
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
              {ar ? "إلغاء" : "Cancel"}
            </Button>
            <Button
              type="submit"
              className="bg-teal-600 hover:bg-teal-700 text-white"
              disabled={isSaving}
            >
              {isSaving
                ? (ar ? "جارٍ الحفظ..." : "Saving...")
                : (ar ? "حفظ" : "Save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
