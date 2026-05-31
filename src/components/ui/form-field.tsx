"use client";

import { useFormContext, type FieldError } from "react-hook-form";
import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { getErrorMessage } from "@/lib/validations";

interface FormFieldProps {
  label: string;
  labelEn?: string;
  name: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
  className?: string;
  inputClassName?: string;
  children?: React.ReactNode;
  isAr?: boolean;
}

export function FormField({
  label,
  labelEn,
  name,
  type = "text",
  placeholder,
  required,
  className,
  inputClassName,
  children,
  isAr = true,
}: FormFieldProps) {
  const {
    register,
    formState: { errors },
  } = useFormContext();

  const error = errors[name] as FieldError | undefined;

  return (
    <div className={cn("space-y-1.5", className)}>
      <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
        {isAr ? label : labelEn || label}
        {required && <span className="text-red-500 ms-0.5">*</span>}
      </label>
      {children || (
        <input
          type={type}
          {...register(name)}
          placeholder={placeholder}
          className={cn(
            "w-full px-3 py-2 rounded-lg border text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100",
            "focus:outline-none focus:ring-2 transition-colors",
            error
              ? "border-red-500 focus:ring-red-500/20"
              : "border-slate-300 dark:border-slate-600 focus:ring-teal-500/20 focus:border-teal-500",
            inputClassName
          )}
        />
      )}
      {error && (
        <p className="text-xs text-red-500 flex items-center gap-1 mt-1">
          <AlertCircle className="h-3 w-3 shrink-0" />
          {getErrorMessage(error.message || "", isAr)}
        </p>
      )}
    </div>
  );
}

interface FormSelectFieldProps {
  label: string;
  labelEn?: string;
  name: string;
  children: React.ReactNode;
  placeholder?: string;
  required?: boolean;
  className?: string;
  isAr?: boolean;
}

export function FormSelectField({
  label,
  labelEn,
  name,
  children,
  placeholder: _placeholder,
  required,
  className,
  isAr = true,
}: FormSelectFieldProps) {
  const {
    formState: { errors },
  } = useFormContext();

  const error = errors[name] as FieldError | undefined;

  return (
    <div className={cn("space-y-1.5", className)}>
      <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
        {isAr ? label : labelEn || label}
        {required && <span className="text-red-500 ms-0.5">*</span>}
      </label>
      {children}
      {error && (
        <p className="text-xs text-red-500 flex items-center gap-1 mt-1">
          <AlertCircle className="h-3 w-3 shrink-0" />
          {getErrorMessage(error.message || "", isAr)}
        </p>
      )}
    </div>
  );
}

interface FormErrorProps {
  name: string;
  isAr?: boolean;
}

export function FormError({ name, isAr = true }: FormErrorProps) {
  const {
    formState: { errors },
  } = useFormContext();

  const error = errors[name] as FieldError | undefined;

  if (!error) return null;

  return (
    <p className="text-xs text-red-500 flex items-center gap-1 mt-1">
      <AlertCircle className="h-3 w-3 shrink-0" />
      {getErrorMessage(error.message || "", isAr)}
    </p>
  );
}
