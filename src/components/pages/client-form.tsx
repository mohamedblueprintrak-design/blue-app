"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { clientSchema, getErrorMessage, type ClientFormData } from "@/lib/validations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertCircle, FileText, Upload, User, Landmark, Home, Briefcase, MapPin } from 'lucide-react';
import { cn } from "@/lib/utils";
import {
  type Client,
  type FullAddressData,
  NATIONALITIES,
  EMIRATES,
  SERVICES,
  PROJECT_TYPES,
  LAND_PROJECT_TYPES,
  REFERRAL_SOURCES,
  parseFullAddress,
  parseServicesWanted,
} from "./client-shared";

interface ClientFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editClient: Client | null;
  onSave: (payload: Record<string, unknown>) => void;
  isSaving: boolean;
  ar: boolean;
}

export default function ClientFormDialog({ open, onOpenChange, editClient, onSave, isSaving, ar }: ClientFormDialogProps) {
  // Form state for fields not in Zod schema (managed via local state)
  const [formClientType, setFormClientType] = useState<string>("INDIVIDUAL");
  const [formServices, setFormServices] = useState<string[]>([]);
  const [formProjectType, setFormProjectType] = useState<string>("");
  const [formReferralSource, setFormReferralSource] = useState<string>("");
  const [formAddress, setFormAddress] = useState<FullAddressData>({});

  const resetLocalForm = useCallback(() => {
    setFormClientType("INDIVIDUAL");
    setFormServices([]);
    setFormProjectType("");
    setFormReferralSource("");
    setFormAddress({});
  }, []);

  const emptyForm: ClientFormData = useMemo(() => ({
    name: "", company: "", email: "", phone: "", address: "",
    taxNumber: "", creditLimit: "0", paymentTerms: "",
    serviceType: "", serviceNotes: "",
  }), []);
  const form = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema) as Resolver<ClientFormData>,
    defaultValues: emptyForm,
  });
  const { register, handleSubmit: rhfHandleSubmit, formState: { errors }, reset, watch, setValue } = form;

  // Helper to access form fields not in the Zod schema
  // eslint-disable-next-line react-hooks/incompatible-library -- React Hook Form's watch() cannot be safely memoized
  const watchField = (name: string) => (watch as (n: string) => string | undefined)(name) || "";
  const registerExtra = (name: string) => (register as (n: string) => Record<string, unknown>)(name);
  const setValueExtra = (name: string, value: string) => (setValue as (n: string, v: string) => void)(name, value);

  // Populate form when editing
  useEffect(() => {
    if (editClient) {
      reset({
        name: editClient.name,
        company: editClient.company,
        email: editClient.email,
        phone: editClient.phone,
        address: editClient.address,
        taxNumber: editClient.taxNumber,
        creditLimit: String(editClient.creditLimit),
        paymentTerms: editClient.paymentTerms,
        serviceType: editClient.serviceType || "",
        serviceNotes: editClient.serviceNotes || "",
      });
      setFormClientType(editClient.clientType || "INDIVIDUAL");
      setFormServices(parseServicesWanted(editClient.servicesWanted));
      setFormProjectType(editClient.projectType || "");
      setFormReferralSource(editClient.referralSource || "");
      setFormAddress(parseFullAddress(editClient.fullAddress));
    } else if (open) {
      reset(emptyForm);
      resetLocalForm();
    }
  }, [editClient, open, reset, resetLocalForm, emptyForm]);

  const handleSave = (data: ClientFormData) => {
    const payload: Record<string, unknown> = {
      ...data,
      clientType: formClientType,
      nameEn: watchField("nameEn") || "",
      companyEn: watchField("companyEn") || "",
      idNumber: watchField("idNumber") || "",
      nationality: watchField("nationality") || "",
      extraPhone: watchField("extraPhone") || "",
      fullAddress: JSON.stringify(formAddress),
      servicesWanted: JSON.stringify(formServices),
      projectType: formProjectType,
      notes: watchField("notes") || "",
      referralSource: formReferralSource,
      referralDetail: watchField("referralDetail") || "",
      landLocation: watchField("landLocation") || "",
      landArea: watchField("landArea") || "",
      plotNumber: watchField("plotNumber") || "",
      planNumber: watchField("planNumber") || "",
    };
    onSave(payload);
  };

  const toggleService = (service: string) => {
    setFormServices((prev) =>
      prev.includes(service) ? prev.filter((s) => s !== service) : [...prev, service]
    );
  };

  const showLandSection = LAND_PROJECT_TYPES.includes(formProjectType);

  const handleClose = () => {
    onOpenChange(false);
    reset(emptyForm);
    resetLocalForm();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) handleClose(); else onOpenChange(isOpen); }}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-hidden flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle>
            {editClient ? (ar ? "تعديل عميل" : "Edit Client") : (ar ? "عميل جديد" : "New Client")}
          </DialogTitle>
          <DialogDescription>
            {editClient
              ? (ar ? "تعديل بيانات العميل" : "Edit client information")
              : (ar ? "إضافة عميل جديد" : "Add a new client")}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={rhfHandleSubmit(handleSave as (data: ClientFormData) => void)} className="flex-1 overflow-hidden flex flex-col">
          <Tabs defaultValue="basic" dir={ar ? "rtl" : "ltr"} className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="w-full grid grid-cols-5 shrink-0 h-9 bg-slate-100 dark:bg-slate-800">
              <TabsTrigger value="basic" className="text-xs gap-1">
                {ar ? "الأساسية" : "Basic"}
              </TabsTrigger>
              <TabsTrigger value="contact" className="text-xs gap-1">
                {ar ? "الاتصال" : "Contact"}
              </TabsTrigger>
              <TabsTrigger value="SERVICES" className="text-xs gap-1">
                {ar ? "الخدمات" : "Services"}
              </TabsTrigger>
              <TabsTrigger value="land" className="text-xs gap-1">
                {ar ? "الأرض" : "Land"}
              </TabsTrigger>
              <TabsTrigger value="REFERRAL" className="text-xs gap-1">
                {ar ? "المصدر" : "Referral"}
              </TabsTrigger>
            </TabsList>

            <ScrollArea className="flex-1 mt-3">
              {/* ===== Section 1: Basic Info ===== */}
              <TabsContent value="basic" className="space-y-4 px-1">
                {/* Client Type */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">{ar ? "نوع العميل" : "Client Type"} *</Label>
                  <RadioGroup
                    value={formClientType}
                    onValueChange={setFormClientType}
                    className="flex gap-4"
                    dir={ar ? "rtl" : "ltr"}
                  >
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer">
                      <RadioGroupItem value="INDIVIDUAL" id="type-individual" />
                      <Label htmlFor="type-individual" className="text-sm cursor-pointer flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5 text-sky-500" />
                        {ar ? "فرد" : "Individual"}
                      </Label>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer">
                      <RadioGroupItem value="COMPANY" id="type-company" />
                      <Label htmlFor="type-company" className="text-sm cursor-pointer flex items-center gap-1.5">
                        <Briefcase className="h-3.5 w-3.5 text-violet-500" />
                        {ar ? "شركة" : "Company"}
                      </Label>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer">
                      <RadioGroupItem value="GOVERNMENT" id="type-government" />
                      <Label htmlFor="type-government" className="text-sm cursor-pointer flex items-center gap-1.5">
                        <Landmark className="h-3.5 w-3.5 text-amber-500" />
                        {ar ? "حكومة" : "Government"}
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                {/* Name Arabic + English */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-sm">{ar ? "الاسم (عربي)" : "Name (Arabic)"} *</Label>
                    <Input
                      {...register("name")}
                      placeholder={ar ? "اسم العميل بالعربي" : "Client name in Arabic"}
                      dir="rtl"
                      className={cn(errors.name && "border-red-500 focus:ring-red-500/20 focus:border-red-500")}
                    />
                    {errors.name && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertCircle className="h-3 w-3 shrink-0" />{getErrorMessage(errors.name.message || "", ar)}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">{ar ? "الاسم (إنجليزي)" : "Name (English)"}</Label>
                    <Input
                      {...registerExtra("nameEn")}
                      placeholder={ar ? "اسم العميل بالإنجليزي" : "Client name in English"}
                      dir="ltr"
                    />
                  </div>
                </div>

                {/* Company Name - shown for company/government */}
                {(formClientType === "COMPANY" || formClientType === "GOVERNMENT") && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-sm">{ar ? "اسم الجهة (عربي)" : "Organization (Arabic)"}</Label>
                      <Input
                        {...register("company")}
                        placeholder={ar ? "اسم الشركة/الجهة" : "Company/Organization name"}
                        dir="rtl"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm">{ar ? "اسم الجهة (إنجليزي)" : "Organization (English)"}</Label>
                      <Input
                        {...registerExtra("companyEn")}
                        placeholder={ar ? "اسم الشركة بالإنجليزي" : "Organization in English"}
                        dir="ltr"
                      />
                    </div>
                  </div>
                )}

                {/* ID / Commercial Registration */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-sm">
                      {formClientType === "INDIVIDUAL"
                        ? (ar ? "رقم الهوية الإماراتية" : "UAE ID Number")
                        : (ar ? "السجل التجاري" : "Commercial Registration")}
                    </Label>
                    <Input
                      {...registerExtra("idNumber")}
                      placeholder={formClientType === "INDIVIDUAL" ? "784-XXXX-XXXXXXX-X" : "CR-XXXXX"}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">{ar ? "الجنسية" : "Nationality"}</Label>
                    <Select
                      value={watchField("nationality") || ""}
                      onValueChange={(v) => setValueExtra("nationality", v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={ar ? "اختر الجنسية..." : "Select nationality..."} />
                      </SelectTrigger>
                      <SelectContent>
                        {NATIONALITIES.map((n) => (
                          <SelectItem key={n.value} value={n.value}>
                            {ar ? n.ar : n.en}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* ID Photo Upload */}
                <div className="space-y-2">
                  <Label className="text-sm">{ar ? "صورة الهوية" : "ID Photo"}</Label>
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      {watchField("idPhoto") ? (
                        <div className="w-16 h-16 rounded-xl border-2 border-slate-200 dark:border-slate-700 overflow-hidden bg-slate-100 dark:bg-slate-800">
                          <div className="w-full h-full flex items-center justify-center">
                            <FileText className="h-6 w-6 text-teal-500" />
                          </div>
                        </div>
                      ) : (
                        <div className="w-16 h-16 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center bg-slate-50 dark:bg-slate-800/50">
                          <Upload className="h-5 w-5 text-slate-400" />
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-2 h-8 text-xs rounded-lg"
                        onClick={() => {
                          const input = document.createElement("input");
                          input.type = "file";
                          input.accept = "image/jpeg,image/png,image/webp";
                          input.onchange = () => {
                            if (input.files && input.files[0]) {
                              const file = input.files[0];
                              if (file.size > 5 * 1024 * 1024) {
                                alert(ar ? "حجم الملف يجب أن يكون أقل من 5 ميجابايت" : "File size must be less than 5MB");
                                return;
                              }
                              setValueExtra("idPhoto", file.name);
                            }
                          };
                          input.click();
                        }}
                      >
                        <Upload className="h-3.5 w-3.5" />
                        {ar ? "اختيار ملف" : "Choose File"}
                      </Button>
                      {watchField("idPhoto") && (
                        <span className="text-xs text-slate-500 flex items-center gap-1">
                          <FileText className="h-3 w-3" />
                          {watchField("idPhoto")}
                        </span>
                      )}
                      <p className="text-[10px] text-slate-400">
                        {ar ? "JPG, PNG أو WebP - حد أقصى 5 ميجابايت" : "JPG, PNG or WebP - Max 5MB"}
                      </p>
                    </div>
                  </div>
                  <input type="hidden" {...registerExtra("idPhoto")} />
                </div>

                {/* Credit Limit & Payment Terms */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-sm">{ar ? "حد الائتمان" : "Credit Limit"} ({ar ? "د.إ" : "AED"})</Label>
                    <Input type="number" {...register("creditLimit")} placeholder="0" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">{ar ? "شروط الدفع" : "Payment Terms"}</Label>
                    <Input {...register("paymentTerms")} placeholder={ar ? "مثال: 30 يوم" : "e.g., Net 30"} />
                  </div>
                </div>

                {/* Tax Number */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-sm">{ar ? "الرقم الضريبي" : "Tax Number"}</Label>
                    <Input {...register("taxNumber")} placeholder={ar ? "الرقم الضريبي" : "Tax number"} />
                  </div>
                </div>
              </TabsContent>

              {/* ===== Section 2: Contact Info ===== */}
              <TabsContent value="contact" className="space-y-4 px-1">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-sm">{ar ? "البريد الإلكتروني" : "Email"}</Label>
                    <Input
                      type="email"
                      {...register("email")}
                      placeholder="email@example.com"
                      className={cn(errors.email && "border-red-500 focus:ring-red-500/20 focus:border-red-500")}
                    />
                    {errors.email && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertCircle className="h-3 w-3 shrink-0" />{getErrorMessage(errors.email.message || "", ar)}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">{ar ? "رقم الهاتف" : "Mobile Phone"} *</Label>
                    <Input
                      {...register("phone")}
                      placeholder="+971 XX XXX XXXX"
                      className={cn(errors.phone && "border-red-500 focus:ring-red-500/20 focus:border-red-500")}
                    />
                    {errors.phone && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertCircle className="h-3 w-3 shrink-0" />{getErrorMessage(errors.phone.message || "", ar)}</p>}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">

                  <div className="space-y-2">
                    <Label className="text-sm">{ar ? "هاتف إضافي" : "Extra Phone"}</Label>
                    <Input
                      {...registerExtra("extraPhone")}
                      placeholder="+971 XX XXX XXXX"
                      dir="ltr"
                    />
                  </div>
                </div>

                <Separator />

                {/* Full Address */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-rose-500" />
                    {ar ? "العنوان التفصيلي" : "Full Address"}
                  </Label>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-2">
                      <Label className="text-xs text-slate-500">{ar ? "الإمارة" : "Emirate"}</Label>
                      <Select
                        value={formAddress.emirate || ""}
                        onValueChange={(v) => setFormAddress((p) => ({ ...p, emirate: v }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={ar ? "اختر الإمارة..." : "Select emirate..."} />
                        </SelectTrigger>
                        <SelectContent>
                          {EMIRATES.map((e) => (
                            <SelectItem key={e.value} value={e.value}>
                              {ar ? e.ar : e.en}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-slate-500">{ar ? "المدينة" : "City"}</Label>
                      <Input
                        value={formAddress.city || ""}
                        onChange={(e) => setFormAddress((p) => ({ ...p, city: e.target.value }))}
                        placeholder={ar ? "المدينة" : "City"}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-slate-500">{ar ? "المنطقة" : "Area"}</Label>
                      <Input
                        value={formAddress.area || ""}
                        onChange={(e) => setFormAddress((p) => ({ ...p, area: e.target.value }))}
                        placeholder={ar ? "المنطقة" : "Area"}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-2">
                      <Label className="text-xs text-slate-500">{ar ? "الشارع" : "Street"}</Label>
                      <Input
                        value={formAddress.street || ""}
                        onChange={(e) => setFormAddress((p) => ({ ...p, street: e.target.value }))}
                        placeholder={ar ? "الشارع" : "Street"}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-slate-500">{ar ? "المبنى" : "Building"}</Label>
                      <Input
                        value={formAddress.building || ""}
                        onChange={(e) => setFormAddress((p) => ({ ...p, BUILDING: e.target.value }))}
                        placeholder={ar ? "رقم المبنى" : "Building No."}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-slate-500">{ar ? "الوحدة / الشقة" : "Unit / Apt"}</Label>
                      <Input
                        value={formAddress.unit || ""}
                        onChange={(e) => setFormAddress((p) => ({ ...p, unit: e.target.value }))}
                        placeholder={ar ? "رقم الوحدة" : "Unit No."}
                      />
                    </div>
                  </div>
                </div>

                {/* Simple address (legacy) */}
                <div className="space-y-2">
                  <Label className="text-xs text-slate-400">{ar ? "عنوان مبسط (اختياري)" : "Simple address (optional)"}</Label>
                  <Input {...register("address")} placeholder={ar ? "عنوان العميل" : "Client address"} />
                </div>
              </TabsContent>

              {/* ===== Section 3: Services ===== */}
              <TabsContent value="SERVICES" className="space-y-4 px-1">
                {/* Services Wanted as Checkboxes */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">{ar ? "الخدمات المطلوبة" : "Services Wanted"}</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {SERVICES.map((service) => (
                      <div
                        key={service.value}
                        className={cn(
                          "flex items-center gap-2 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors",
                          formServices.includes(service.value)
                            ? "border-teal-300 bg-teal-50 dark:border-teal-700 dark:bg-teal-950/30"
                            : "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                        )}
                        onClick={() => toggleService(service.value)}
                      >
                        <Checkbox
                          checked={formServices.includes(service.value)}
                          onCheckedChange={() => toggleService(service.value)}
                        />
                        <Label className="text-sm cursor-pointer flex-1 select-none">
                          {ar ? service.ar : service.en}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Project Type */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">{ar ? "نوع المشروع" : "Project Type"}</Label>
                  <RadioGroup
                    value={formProjectType}
                    onValueChange={setFormProjectType}
                    className="grid grid-cols-4 gap-2"
                    dir={ar ? "rtl" : "ltr"}
                  >
                    {PROJECT_TYPES.map((pt) => (
                      <div
                        key={pt.value}
                        className={cn(
                          "flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors",
                          formProjectType === pt.value
                            ? "border-teal-300 bg-teal-50 dark:border-teal-700 dark:bg-teal-950/30"
                            : "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                        )}
                      >
                        <RadioGroupItem value={pt.value} id={`pt-${pt.value}`} />
                        <Label htmlFor={`pt-${pt.value}`} className="text-xs cursor-pointer select-none">
                          {ar ? pt.ar : pt.en}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>

                <Separator />

                {/* Notes */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">{ar ? "ملاحظات / تفاصيل" : "Notes / Details"}</Label>
                  <textarea
                    {...registerExtra("notes")}
                    placeholder={ar ? "وصف تفصيلي لما يريد العميل..." : "Describe what the client needs..."}
                    rows={4}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 resize-none"
                  />
                </div>

                {/* Legacy fields: Service Type + Notes */}
                <Separator />
                <div className="space-y-2">
                  <Label className="text-xs text-slate-400">{ar ? "الغرض من التواصل (قديم)" : "Purpose of Visit (legacy)"}</Label>
                  <Select
                    value={watch("serviceType") || ""}
                    onValueChange={(v) => setValue("serviceType", v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={ar ? "اختر الغرض..." : "Select purpose..."} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="consultation">{ar ? "استشارة هندسية" : "Engineering Consultation"}</SelectItem>
                      <SelectItem value="design">{ar ? "تصميم (معماري/إنشائي/MEP)" : "Design (Arch/Struct/MEP)"}</SelectItem>
                      <SelectItem value="license">{ar ? "استخراج ترخيص بلدي" : "Municipality License"}</SelectItem>
                      <SelectItem value="supervision">{ar ? "إشراف على التنفيذ" : "Construction Supervision"}</SelectItem>
                      <SelectItem value="inspection">{ar ? "فحص هندسي" : "Engineering Inspection"}</SelectItem>
                      <SelectItem value="other">{ar ? "أخرى" : "Other"}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-slate-400">{ar ? "تفاصيل إضافية (قديم)" : "Additional Details (legacy)"}</Label>
                  <textarea
                    {...register("serviceNotes")}
                    placeholder={ar ? "وصف تفصيلي..." : "Describe in detail..."}
                    rows={2}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 resize-none"
                  />
                </div>
              </TabsContent>

              {/* ===== Section 4: Land Details ===== */}
              <TabsContent value="land" className="space-y-4 px-1">
                {showLandSection ? (
                  <>
                    <div className="px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs text-amber-700 dark:text-amber-300">
                      {ar
                        ? "تفاصيل الأرض مطلوبة لنوع المشروع المحدد (فيلا / تجاري / صناعي / عمارة سكنية)"
                        : "Land details are needed for the selected project type (Villa / Commercial / Industrial / Residential Building)"}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label className="text-sm">{ar ? "موقع الأرض" : "Land Location"}</Label>
                        <Input {...registerExtra("landLocation")} placeholder={ar ? "وصف موقع الأرض" : "Land location description"} />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm">{ar ? "مساحة الأرض" : "Land Area"}</Label>
                        <div className="flex gap-2">
                          <Input {...registerExtra("landArea")} placeholder={ar ? "المساحة" : "Area"} className="flex-1" />
                          <Select defaultValue="sqm">
                            <SelectTrigger className="w-24">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="sqm">m²</SelectItem>
                              <SelectItem value="sqft">ft²</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label className="text-sm">{ar ? "رقم القطعة" : "Plot Number"}</Label>
                        <Input {...registerExtra("plotNumber")} placeholder={ar ? "رقم القطعة" : "Plot number"} />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm">{ar ? "رقم المخطط" : "Plan Number"}</Label>
                        <Input {...registerExtra("planNumber")} placeholder={ar ? "رقم المخطط" : "Plan number"} />
                      </div>
                    </div>

                    <Separator />

                    {/* Land Documents Upload Area */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">{ar ? "مستندات الأرض" : "Land Documents"}</Label>
                      <p className="text-xs text-slate-400">
                        {ar
                          ? "المسح، خريطة الموقع، صك الملكية، صور الموقع"
                          : "Survey, site map, ownership deed, site photos"}
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { key: "survey", ar: "مسح الأرض", en: "Land Survey" },
                          { key: "map", ar: "خريطة الموقع", en: "Site Map" },
                          { key: "deed", ar: "صك الملكية", en: "Ownership Deed" },
                          { key: "photos", ar: "صور الموقع", en: "Site Photos" },
                        ].map((doc) => (
                          <div
                            key={doc.key}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-slate-300 dark:border-slate-600 hover:border-teal-400 dark:hover:border-teal-600 transition-colors cursor-pointer"
                            onClick={() => {
                              const input = document.createElement("input");
                              input.type = "file";
                              input.onchange = () => {
                                if (input.files && input.files[0]) {
                                  // File selected — upload logic to be implemented
                                }
                              };
                              input.click();
                            }}
                          >
                            <Upload className="h-3.5 w-3.5 text-slate-400" />
                            <span className="text-xs text-slate-500">{ar ? doc.ar : doc.en}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                      <Home className="h-7 w-7 text-slate-400" />
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">
                      {ar ? "تفاصيل الأرض غير مطلوبة" : "Land details not required"}
                    </p>
                    <p className="text-xs text-slate-400">
                      {ar
                        ? "تفاصيل الأرض تظهر فقط لمشاريع الفلل، التجارية، الصناعية، والعمائر السكنية"
                        : "Land details are shown only for Villa, Commercial, Industrial, and Residential Building projects"}
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-4"
                      onClick={() => {
                        const servicesTab = document.querySelector('[value="SERVICES"]');
                        if (servicesTab) (servicesTab as HTMLElement).click();
                      }}
                    >
                      {ar ? "اختر نوع مشروع" : "Select a project type"}
                    </Button>
                  </div>
                )}
              </TabsContent>

              {/* ===== Section 5: Referral ===== */}
              <TabsContent value="REFERRAL" className="space-y-4 px-1">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">{ar ? "مصدر العميل" : "Referral Source"}</Label>
                  <RadioGroup
                    value={formReferralSource}
                    onValueChange={setFormReferralSource}
                    className="grid grid-cols-2 gap-2"
                    dir={ar ? "rtl" : "ltr"}
                  >
                    {REFERRAL_SOURCES.map((source) => {
                      const IconComp = source.icon;
                      return (
                        <div
                          key={source.value}
                          className={cn(
                            "flex items-center gap-3 px-3 py-3 rounded-lg border cursor-pointer transition-colors",
                            formReferralSource === source.value
                              ? "border-teal-300 bg-teal-50 dark:border-teal-700 dark:bg-teal-950/30"
                              : "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                          )}
                        >
                          <RadioGroupItem value={source.value} id={`ref-${source.value}`} />
                          <IconComp className="h-4 w-4 text-slate-400" />
                          <Label htmlFor={`ref-${source.value}`} className="text-sm cursor-pointer select-none">
                            {ar ? source.ar : source.en}
                          </Label>
                        </div>
                      );
                    })}
                  </RadioGroup>
                </div>

                {(formReferralSource === "other" || formReferralSource === "REFERRAL") && (
                  <div className="space-y-2">
                    <Label className="text-sm">
                      {formReferralSource === "other"
                        ? (ar ? "تفاصيل أخرى" : "Other Details")
                        : (ar ? "اسم العميل المُحيل" : "Referring Client Name")}
                    </Label>
                    <Input
                      {...registerExtra("referralDetail")}
                      placeholder={
                        formReferralSource === "other"
                          ? (ar ? "اذكر المصدر..." : "Specify source...")
                          : (ar ? "اسم العميل المحيل..." : "Referring client name...")
                      }
                    />
                  </div>
                )}
              </TabsContent>
            </ScrollArea>
          </Tabs>

          {/* Footer */}
          <DialogFooter className="shrink-0 pt-3 border-t border-slate-200 dark:border-slate-700 mt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
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
