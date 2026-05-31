import { z } from "zod";

// ===== Common helpers =====
const optionalString = z.string().optional().default("");
const positiveNumberStr = z.string().optional().default("0");

// ===== Project =====
export const projectSchema = z.object({
  number: z.string().optional().default(""),
  name: z.string().min(1, "Name is required"),
  nameEn: optionalString,
  clientId: z.string().min(1, "Client is required"),
  contractorId: z.string().optional().default(""),
  location: optionalString,
  plotNumber: z.string().optional().default(""),
  type: z.string().min(1, "Type is required"),
  budget: positiveNumberStr,
  startDate: optionalString,
  endDate: optionalString,
  description: optionalString,
});

export type ProjectFormData = z.infer<typeof projectSchema>;

// ===== Client =====
export const clientSchema = z.object({
  name: z.string().min(1, "Name is required"),
  company: z.string().optional(),
  email: z.string().email("Invalid email address").or(z.literal("")).optional().nullable().default(""),
  phone: z.string().optional().default(""),
  address: optionalString,
  taxNumber: optionalString,
  creditLimit: z.string().optional().default("0"),
  paymentTerms: optionalString,
  serviceType: z.string().optional().default(""),
  serviceNotes: optionalString,
});

export type ClientFormData = z.infer<typeof clientSchema>;

// ===== Task =====
export const taskSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional().default(""),
  projectId: z.string().optional().default(""),
  assigneeId: z.string().optional().default(""),
  priority: z.string().min(1, "Priority is required").default("NORMAL"),
  status: z.string().min(1, "Status is required").default("TODO"),
  startDate: z.string().optional().default(""),
  dueDate: z.string().optional().default(""),
  taskType: z.enum(['STANDARD', 'GOVERNMENTAL', 'MANDATORY', 'CLIENT', 'INTERNAL']).optional().default('STANDARD'),
  isGovernmental: z.boolean().optional().default(false), // kept for backward compatibility with frontend checkbox
  slaDays: z.string().optional().default(""),
});

export type TaskFormData = z.infer<typeof taskSchema>;

// ===== Invoice =====
export const invoiceSchema = z.object({
  number: z.string().min(1, "Invoice number is required"),
  clientId: z.string().min(1, "Client is required"),
  projectId: z.string().min(1, "Project is required"),
  issueDate: z.string().min(1, "Issue date is required"),
  dueDate: z.string().min(1, "Due date is required"),
  status: z.string().min(1, "Status is required").default("DRAFT"),
});

export type InvoiceFormData = z.infer<typeof invoiceSchema>;

// ===== Meeting =====
export const meetingSchema = z.object({
  title: z.string().min(1, "Title is required"),
  date: z.string().min(1, "Date is required"),
  time: z.string().min(1, "Time is required"),
  duration: z.number().min(15, "Duration must be at least 15 minutes").default(60),
  projectId: z.string().optional().default(""),
  location: z.string().optional().default(""),
  type: z.string().min(1, "Type is required").default("ONSITE"),
  notes: z.string().optional().default(""),
});

export type MeetingFormData = z.infer<typeof meetingSchema>;

// ===== Contract =====
export const contractSchema = z.object({
  number: z.string().min(1, "Contract number is required"),
  title: z.string().min(1, "Title is required"),
  clientId: z.string().min(1, "Client is required"),
  projectId: z.string().min(1, "Project is required"),
  value: z.string().min(1, "Value is required").default("0"),
  type: z.string().min(1, "Type is required").default("ENGINEERING_SERVICES"),
  status: z.string().optional().default("DRAFT"),
  startDate: z.string().optional().default(""),
  endDate: z.string().optional().default(""),
});

export type ContractFormData = z.infer<typeof contractSchema>;

// ===== Employee =====
export const employeeSchema = z.object({
  userId: z.string().optional().default(""),
  department: z.string().min(1, "Department is required"),
  position: z.string().min(1, "Position is required"),
  salary: z.string().optional().default("0"),
  employmentStatus: z.string().optional().default("ACTIVE"),
  hireDate: z.string().optional().default(""),
});

export type EmployeeFormData = z.infer<typeof employeeSchema>;

// ===== Supplier =====
export const supplierSchema = z.object({
  name: z.string().min(1, "Name is required"),
  category: z.string().min(1, "Category is required").default("MATERIALS"),
  email: z.string().email("Invalid email address").or(z.literal("")).optional().default(""),
  phone: z.string().optional().default(""),
  address: optionalString,
  rating: z.string().optional().default("0"),
  creditLimit: z.string().optional().default("0"),
});

export type SupplierFormData = z.infer<typeof supplierSchema>;

// ===== Site Visit =====
export const siteVisitSchema = z.object({
  projectId: z.string().min(1, "Project is required"),
  date: z.string().min(1, "Date is required"),
  plotNumber: z.string().optional().default(""),
  municipality: z.string().optional().default(""),
  gateDescription: z.string().optional().default(""),
  neighborDesc: z.string().optional().default(""),
  buildingDesc: z.string().optional().default(""),
  status: z.string().optional().default("DRAFT"),
  notes: z.string().optional().default(""),
});

export type SiteVisitFormData = z.infer<typeof siteVisitSchema>;

// ===== Defect =====
export const defectSchema = z.object({
  title: z.string().min(1, "Title is required"),
  projectId: z.string().min(1, "Project is required"),
  severity: z.string().min(1, "Severity is required").default("NORMAL"),
  location: z.string().optional().default(""),
  assigneeId: z.string().optional().default(""),
  photos: z.string().optional().default(""),
  notes: z.string().optional().default(""),
});

export type DefectFormData = z.infer<typeof defectSchema>;

// ===== Submittal =====
export const submittalSchema = z.object({
  projectId: z.string().min(1, "Project is required"),
  number: z.string().optional().default(""),
  title: z.string().min(1, "Title is required"),
  type: z.string().optional().default(""),
  contractor: z.string().optional().default(""),
  revisionNumber: z.string().optional().default("1"),
  status: z.string().min(1, "Status is required").default("UNDER_REVIEW"),
});

export type SubmittalFormData = z.infer<typeof submittalSchema>;

// ===== Change Order =====
export const changeOrderSchema = z.object({
  projectId: z.string().min(1, "Project is required"),
  number: z.string().min(1, "Number is required"),
  type: z.string().optional().default("ADDITION"),
  status: z.string().optional().default("PENDING"),
  costImpact: z.string().optional().default("0"),
  timeImpact: z.string().optional().default(""),
  description: z.string().optional().default(""),
});

export type ChangeOrderFormData = z.infer<typeof changeOrderSchema>;

// ===== RFI (Request for Information) =====
export const rfiSchema = z.object({
  projectId: z.string().min(1, "Project is required"),
  number: z.string().optional().default(""),
  subject: z.string().min(1, "Subject is required"),
  description: z.string().optional().default(""),
  fromId: z.string().min(1, "From is required"),
  toId: z.string().min(1, "To is required"),
  priority: z.string().optional().default("NORMAL"),
  dueDate: z.string().optional().default(""),
});

export type RfiFormData = z.infer<typeof rfiSchema>;

// ===== Bilingual error message helper =====
export const errorMessages: Record<string, { ar: string; en: string }> = {
  "Name is required": { ar: "الاسم مطلوب", en: "Name is required" },
  "Name must be at least 3 characters": { ar: "الاسم لازم 3 حروف على الأقل", en: "Name must be at least 3 characters" },
  "Client is required": { ar: "العميل مطلوب", en: "Client is required" },
  "Location is required": { ar: "الموقع مطلوب", en: "Location is required" },
  "Type is required": { ar: "النوع مطلوب", en: "Type is required" },
  "required": { ar: "هذا الحقل مطلوب", en: "This field is required" },
  "Company is required": { ar: "الشركة مطلوبة", en: "Company is required" },
  "Invalid email address": { ar: "بريد إلكتروني غير صالح", en: "Invalid email address" },
  "Phone must be at least 8 characters": { ar: "رقم الهاتف لازم 8 أرقام على الأقل", en: "Phone must be at least 8 characters" },
  "Title is required": { ar: "العنوان مطلوب", en: "Title is required" },
  "Title must be at least 3 characters": { ar: "العنوان لازم 3 حروف على الأقل", en: "Title must be at least 3 characters" },
  "Priority is required": { ar: "الأولوية مطلوبة", en: "Priority is required" },
  "Status is required": { ar: "الحالة مطلوبة", en: "Status is required" },
  "Date is required": { ar: "التاريخ مطلوب", en: "Date is required" },
  "Time is required": { ar: "الوقت مطلوب", en: "Time is required" },
  "Duration must be at least 15 minutes": { ar: "المدة لازم 15 دقيقة على الأقل", en: "Duration must be at least 15 minutes" },
  "Invoice number is required": { ar: "رقم الفاتورة مطلوب", en: "Invoice number is required" },
  "Project is required": { ar: "المشروع مطلوب", en: "Project is required" },
  "Issue date is required": { ar: "تاريخ الإصدار مطلوب", en: "Issue date is required" },
  "Due date is required": { ar: "تاريخ الاستحقاق مطلوب", en: "Due date is required" },
  "Contract number is required": { ar: "رقم العقد مطلوب", en: "Contract number is required" },
  "Value is required": { ar: "القيمة مطلوبة", en: "Value is required" },
  "Department is required": { ar: "القسم مطلوب", en: "Department is required" },
  "Position is required": { ar: "المنصب مطلوب", en: "Position is required" },
  "Category is required": { ar: "التصنيف مطلوب", en: "Category is required" },
  "Subject is required": { ar: "الموضوع مطلوب", en: "Subject is required" },
  "From is required": { ar: "المرسل مطلوب", en: "From is required" },
  "To is required": { ar: "المستقبل مطلوب", en: "To is required" },
  "Number is required": { ar: "الرقم مطلوب", en: "Number is required" },
  "Severity is required": { ar: "الخطورة مطلوبة", en: "Severity is required" },
};

export function getErrorMessage(message: string, isAr: boolean): string {
  const mapped = errorMessages[message];
  if (mapped) return isAr ? mapped.ar : mapped.en;
  return message;
}
