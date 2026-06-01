/**
 * API Validation Utilities — أدوات التحقق من صحة البيانات في API Routes
 *
 * Provides Zod-based server-side validation for all API endpoints.
 * Ensures incoming data is properly validated before processing,
 * preventing injection attacks and data corruption.
 */

import { z, ZodSchema, ZodError } from 'zod';\nexport * from './validations/auth.schema';\nexport * from './validations/project.schema';\nexport * from './validations/user.schema';\n\n
import { NextRequest, NextResponse } from 'next/server';

// ===== Validation Result Types =====

export interface ValidationSuccess<T> {
  success: true;
  data: T;
}

export interface ValidationFailure {
  success: false;
  error: string;
  errors?: Record<string, string[]>;
}

export type ValidationResult<T> = ValidationSuccess<T> | ValidationFailure;

// ===== Core Validation Function =====

/**
 * Validate request data against a Zod schema — يتحقق من صحة البيانات باستخدام مخطط Zod
 */
export function validateRequest<T>(schema: ZodSchema<T>, data: unknown): ValidationResult<T> {
  try {
    const validated = schema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof ZodError) {
      const fieldErrors: Record<string, string[]> = {};
      for (const issue of error.issues) {
        const path = issue.path.join('.') || '_root';
        if (!fieldErrors[path]) {
          fieldErrors[path] = [];
        }
        fieldErrors[path].push(issue.message);
      }

      const firstError = error.issues[0];
      const mainMessage = firstError?.message || 'بيانات غير صالحة';

      return {
        success: false,
        error: mainMessage,
        errors: fieldErrors,
      };
    }
    return {
      success: false,
      error: 'بيانات غير صالحة',
    };
  }
}

/**
 * Validate a NextRequest body against a Zod schema — يتحقق من صحة جسم الطلب باستخدام مخطط Zod
 *
 * Returns parsed data or a 400 NextResponse automatically.
 * Usage:
 *   const result = await validateBody(req, mySchema);
 *   if (result instanceof NextResponse) return result; // validation failed
 *   const data = result; // validated data
 */
export async function validateBody<T>(
  req: NextRequest,
  schema: ZodSchema<T>
): Promise<T | NextResponse> {
  try {
    const body = await req.json();
    const result = validateRequest(schema, body);
    if (result.success) return result.data;
    return NextResponse.json(
      { error: result.error, errors: result.errors },
      { status: 400 }
    );
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400 }
    );
  }
}

/**
 * Validate URL search params against a Zod schema — يتحقق من صحة معاملات البحث باستخدام مخطط Zod
 */
export function validateSearchParams<T>(
  req: NextRequest,
  schema: ZodSchema<T>
): T | NextResponse {
  try {
    const params = Object.fromEntries(req.nextUrl.searchParams.entries());
    const result = validateRequest(schema, params);
    if (result.success) return result.data;
    return NextResponse.json(
      { error: result.error, errors: result.errors },
      { status: 400 }
    );
  } catch {
    return NextResponse.json(
      { error: 'Invalid search parameters' },
      { status: 400 }
    );
  }
}

// ===== Auth Schemas =====

































// ===== Entity Schemas =====

const safeNumber = z.coerce.number().optional().default(0);





export const clientCreateSchema = z.object({
  name: z.string().min(1, 'اسم العميل مطلوب').max(200),
  company: z.string().max(200).optional().default(''),
  email: z.string().email('بريد إلكتروني غير صحيح').or(z.literal('')).optional().default(''),
  phone: z.string().max(50).optional().default(''),
  address: z.string().max(500).optional().default(''),
  taxNumber: z.string().max(100).optional().default(''),
  creditLimit: safeNumber,
  paymentTerms: z.string().max(100).optional().default(''),
  serviceType: z.string().max(100).optional().default(''),
  serviceNotes: z.string().max(1000).optional().default(''),
});

export type ClientCreateData = z.infer<typeof clientCreateSchema>;





export const invoiceCreateSchema = z.object({
  number: z.string().min(1, 'رقم الفاتورة مطلوب').max(50),
  clientId: z.string().min(1, 'العميل مطلوب'),
  projectId: z.string().min(1, 'المشروع مطلوب'),
  issueDate: z.string().min(1, 'تاريخ الإصدار مطلوب'),
  dueDate: z.string().min(1, 'تاريخ الاستحقاق مطلوب'),
  status: z.string().max(50).default('DRAFT'),
  subtotal: safeNumber,
  tax: safeNumber,
  total: safeNumber,
  paidAmount: safeNumber,
  remaining: safeNumber,
});

export type InvoiceCreateData = z.infer<typeof invoiceCreateSchema>;

export const contractCreateSchema = z.object({
  number: z.string().min(1, 'رقم العقد مطلوب').max(50),
  title: z.string().min(1, 'عنوان العقد مطلوب').max(300),
  clientId: z.string().min(1, 'العميل مطلوب'),
  projectId: z.string().optional().default(''),
  value: safeNumber,
  type: z.string().max(50).optional().default('engineering_services'),
  status: z.string().max(50).default('PENDING'),
  signedByName: z.string().max(200).optional().default(''),
  signedByTitle: z.string().max(200).optional().default(''),
  startDate: z.string().optional().default(''),
  endDate: z.string().optional().default(''),
});

export type ContractCreateData = z.infer<typeof contractCreateSchema>;

export const meetingCreateSchema = z.object({
  title: z.string().min(1, 'عنوان الاجتماع مطلوب').max(300),
  date: z.string().min(1, 'التاريخ مطلوب'),
  time: z.string().min(1, 'الوقت مطلوب'),
  duration: z.coerce.number().min(15).default(60),
  projectId: z.string().optional().default(''),
  location: z.string().max(300).optional().default(''),
  type: z.string().max(50).default('ONSITE'),
  notes: z.string().max(5000).optional().default(''),
});

export type MeetingCreateData = z.infer<typeof meetingCreateSchema>;

export const supplierCreateSchema = z.object({
  name: z.string().min(1, 'اسم المورد مطلوب').max(200),
  category: z.string().max(100).optional().default(''),
  email: z.string().email().or(z.literal('')).optional().default(''),
  phone: z.string().max(50).optional().default(''),
  address: z.string().max(500).optional().default(''),
  rating: z.coerce.number().min(0).max(5).optional().default(0),
  creditLimit: safeNumber,
});

export type SupplierCreateData = z.infer<typeof supplierCreateSchema>;

export const bidCreateSchema = z.object({
  projectId: z.string().min(1, 'المشروع مطلوب'),
  contractorId: z.string().min(1, 'المقاول مطلوب'),
  contractorName: z.string().max(200).optional().default(''),
  amount: safeNumber,
  technicalScore: z.coerce.number().min(0).max(100).optional().default(0),
  financialScore: z.coerce.number().min(0).max(100).optional().default(0),
  totalScore: z.coerce.number().min(0).max(100).optional().default(0),
  status: z.string().max(50).default('SUBMITTED'),
  deadline: z.string().optional().default(''),
});

export type BidCreateData = z.infer<typeof bidCreateSchema>;





export const notificationCreateSchema = z.object({
  userId: z.string().min(1, 'المستخدم مطلوب'),
  type: z.string().max(100),
  title: z.string().min(1, 'العنوان مطلوب').max(300),
  message: z.string().min(1, 'الرسالة مطلوبة').max(2000),
  relatedEntityType: z.string().max(50).optional().default(''),
  relatedEntityId: z.string().optional().default(''),
});

export type NotificationCreateData = z.infer<typeof notificationCreateSchema>;





export const companySettingsSchema = z.object({
  name: z.string().min(1).max(300).optional(),
  nameEn: z.string().max(300).optional(),
  email: z.string().email().or(z.literal('')).optional(),
  phone: z.string().max(50).optional(),
  address: z.string().max(500).optional(),
  taxNumber: z.string().max(100).optional(),
  currency: z.string().max(10).optional(),
  timezone: z.string().max(100).optional(),
  workingDays: z.string().max(100).optional(),
  workingHours: z.string().max(100).optional(),
});

export type CompanySettingsData = z.infer<typeof companySettingsSchema>;

export const aiChatSchema = z.object({
  message: z.string().min(1, 'الرسالة مطلوبة').max(10000),
  conversationId: z.string().max(100).optional().default(''),
  // SECURITY: userId is intentionally excluded — always derived from authenticated context.
  // Allowing client-supplied userId would enable impersonation.
  language: z.enum(['ar', 'en']).optional().default('ar'),
  projectId: z.string().optional().default(''),
  model: z.string().max(50).optional().default('zai-default'),
  modelId: z.string().max(50).optional().default('zai-default'),
  history: z.array(z.object({ role: z.string(), content: z.string() })).optional().default([]),
});

export type AiChatData = z.infer<typeof aiChatSchema>;

export const approvalCreateSchema = z.object({
  entityType: z.string().min(1).max(50),
  entityId: z.string().min(1).max(100),
  title: z.string().min(1, 'العنوان مطلوب').max(300),
  description: z.string().max(2000).optional().default(''),
  requestedBy: z.string().max(200).optional().default(''),
  assignedTo: z.string().max(200).optional().default(''),
  step: z.coerce.number().min(1).default(1),
  totalSteps: z.coerce.number().min(1).default(1),
  amount: safeNumber,
});

export type ApprovalCreateData = z.infer<typeof approvalCreateSchema>;









export const contractorCreateSchema = z.object({
  name: z.string().min(1, 'الاسم مطلوب').max(200),
  nameEn: z.string().max(200).optional().default(''),
  companyName: z.string().max(300).optional().default(''),
  companyEn: z.string().max(300).optional().default(''),
  contactPerson: z.string().max(200).optional().default(''),
  phone: z.string().max(50).optional().default(''),
  email: z.string().email().or(z.literal('')).optional().default(''),
  address: z.string().max(500).optional().default(''),
  category: z.string().max(50).optional().default(''),
  rating: z.coerce.number().min(0).max(5).optional().default(0),
  specialties: z.string().max(1000).optional().default(''),
  experience: z.string().max(1000).optional().default(''),
  crNumber: z.string().max(100).optional().default(''),
  licenseNumber: z.string().max(100).optional().default(''),
  bankName: z.string().max(200).optional().default(''),
  bankAccount: z.string().max(100).optional().default(''),
  iban: z.string().max(100).optional().default(''),
  isActive: z.boolean().optional().default(true),
});

export type ContractorCreateData = z.infer<typeof contractorCreateSchema>;

export const knowledgeArticleSchema = z.object({
  title: z.string().min(1, 'العنوان مطلوب').max(300),
  content: z.string().min(1, 'المحتوى مطلوب').max(50000),
  category: z.string().max(50).optional().default('guide'),
  tags: z.string().max(500).optional().default(''),
  projectId: z.string().optional().default(''),
  authorId: z.string().optional().default(''),
});

export type KnowledgeArticleData = z.infer<typeof knowledgeArticleSchema>;









export const proposalSchema = z.object({
  number: z.string().min(1).max(50),
  clientId: z.string().min(1, 'العميل مطلوب'),
  projectId: z.string().optional().default(''),
  subtotal: safeNumber,
  tax: safeNumber,
  total: safeNumber,
  status: z.string().max(50).default('DRAFT'),
});

export type ProposalData = z.infer<typeof proposalSchema>;

// ===== Quote Request Schema =====

export const quoteRequestSchema = z.object({
  name: z.string()
    .min(2, 'الاسم يجب أن يكون حرفين على الأقل')
    .max(200, 'الاسم طويل جداً'),
  phone: z.string()
    .min(7, 'رقم الهاتف قصير جداً')
    .max(50, 'رقم الهاتف طويل جداً')
    .regex(/^[+]?[0-9\s\-().]{7,50}$/, 'صيغة رقم الهاتف غير صحيحة'),
  email: z.string()
    .email('صيغة البريد الإلكتروني غير صحيحة')
    .or(z.literal(''))
    .optional()
    .default(''),
  serviceType: z.string().max(100).optional().default(''),
  buildingType: z.string().max(100).optional().default(''),
  area: z.string().max(200).optional().default(''),
  floors: z.coerce.number().min(1).max(200).optional().default(1),
  location: z.string().max(300).optional().default(''),
  message: z.string().max(2000, 'الرسالة طويلة جداً').optional().default(''),
});

export type QuoteRequestData = z.infer<typeof quoteRequestSchema>;

// ===== Common Schemas =====

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional().default(''),
  sortField: z.string().optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type PaginationData = z.infer<typeof paginationSchema>;

export const idParamSchema = z.object({
  id: z.string().min(1, 'ID is required'),
});

export type IdParamData = z.infer<typeof idParamSchema>;

/**
 * Validate an ID parameter from a route handler.
 * Returns the validated ID string, or a 400 NextResponse if invalid.
 *
 * Usage:
 *   const rawId = (await params).id;
 *   const idResult = validateIdParam(rawId);
 *   if (!idResult.success) return idResult.response;
 *   const id = idResult.id;
 */
export function validateIdParam(
  rawId: string
): { success: true; id: string } | { success: false; response: NextResponse } {
  const result = validateRequest(idParamSchema, { id: rawId });
  if (result.success) return { success: true, id: result.data.id };
  return {
    success: false,
    response: NextResponse.json(
      { error: result.error, errors: result.errors },
      { status: 400 }
    ),
  };
}

// ===== Payment Schemas =====

export const paymentCreateSchema = z.object({
  voucherNumber: z.string().max(50).optional().default(''),
  projectId: z.string().optional().default(''),
  amount: z.coerce.number().positive('المبلغ مطلوب ويجب أن يكون أكبر من صفر').max(999999999),
  payMethod: z.string().min(1, 'طريقة الدفع مطلوبة').max(50),
  beneficiary: z.string().max(300).optional().default(''),
  referenceNumber: z.string().max(100).optional().default(''),
  description: z.string().max(2000).optional().default(''),
});

export type PaymentCreateData = z.infer<typeof paymentCreateSchema>;

export const paymentUpdateSchema = z.object({
  status: z.string().max(50).optional(),
  // SECURITY: approvedById is intentionally excluded — auto-set server-side
  // when status transitions to 'APPROVED'. Allowing client-supplied approvedById
  // would enable self-approval or impersonation.
  amount: z.coerce.number().positive().max(999999999).optional(),
  payMethod: z.string().max(50).optional(),
  beneficiary: z.string().max(300).optional(),
  referenceNumber: z.string().max(100).optional(),
  description: z.string().max(2000).optional(),
});

export type PaymentUpdateData = z.infer<typeof paymentUpdateSchema>;

// ===== Update Schemas (Partial) =====

export const clientUpdateSchema = z.object({
  name: z.string().min(1, 'اسم العميل مطلوب').max(200).optional(),
  company: z.string().max(200).optional(),
  email: z.string().email('بريد إلكتروني غير صحيح').or(z.literal('')).optional(),
  phone: z.string().max(50).optional(),
  address: z.string().max(500).optional(),
  taxNumber: z.string().max(100).optional(),
  creditLimit: z.coerce.number().optional(),
  paymentTerms: z.string().max(100).optional(),
  serviceType: z.string().max(100).optional(),
  serviceNotes: z.string().max(1000).optional(),
});

export type ClientUpdateData = z.infer<typeof clientUpdateSchema>;









export const invoiceUpdateSchema = z.object({
  number: z.string().min(1, 'رقم الفاتورة مطلوب').max(50).optional(),
  clientId: z.string().min(1, 'العميل مطلوب').optional(),
  projectId: z.string().min(1, 'المشروع مطلوب').optional(),
  issueDate: z.string().min(1, 'تاريخ الإصدار مطلوب').optional(),
  dueDate: z.string().min(1, 'تاريخ الاستحقاق مطلوب').optional(),
  status: z.string().max(50).optional(),
  paidAmount: z.coerce.number().optional(),
});

export type InvoiceUpdateData = z.infer<typeof invoiceUpdateSchema>;

export const invoiceItemUpdateSchema = z.object({
  description: z.string().min(1).max(500),
  quantity: z.number().positive().max(999999),
  unitPrice: z.number().nonnegative().max(999999999),
  total: z.number().nonnegative().optional(),
});

export const contractUpdateSchema = z.object({
  number: z.string().min(1, 'رقم العقد مطلوب').max(50).optional(),
  title: z.string().min(1, 'عنوان العقد مطلوب').max(300).optional(),
  clientId: z.string().min(1, 'العميل مطلوب').optional(),
  projectId: z.string().optional(),
  value: z.coerce.number().optional(),
  type: z.string().max(50).optional(),
  status: z.string().max(50).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export type ContractUpdateData = z.infer<typeof contractUpdateSchema>;

export const supplierUpdateSchema = z.object({
  name: z.string().min(1, 'اسم المورد مطلوب').max(200).optional(),
  category: z.string().max(100).optional(),
  email: z.string().email().or(z.literal('')).optional(),
  phone: z.string().max(50).optional(),
  address: z.string().max(500).optional(),
  rating: z.coerce.number().min(0).max(5).optional(),
  creditLimit: z.coerce.number().optional(),
});

export type SupplierUpdateData = z.infer<typeof supplierUpdateSchema>;





export const meetingUpdateSchema = z.object({
  title: z.string().min(1, 'عنوان الاجتماع مطلوب').max(300).optional(),
  date: z.string().min(1, 'التاريخ مطلوب').optional(),
  time: z.string().min(1, 'الوقت مطلوب').optional(),
  duration: z.coerce.number().min(15).optional(),
  projectId: z.string().optional(),
  location: z.string().max(300).optional(),
  type: z.string().max(50).optional(),
  notes: z.string().max(5000).optional(),
  attendeeIds: z.array(z.string()).optional(),
  agendaItems: z.array(z.object({ topic: z.string().max(300), duration: z.coerce.number().min(1) })).optional(),
});

export type MeetingUpdateData = z.infer<typeof meetingUpdateSchema>;

export const bidUpdateSchema = z.object({
  contractorName: z.string().max(200).optional(),
  contractorContact: z.string().max(200).optional(),
  amount: z.coerce.number().optional(),
  technicalScore: z.coerce.number().min(0).max(100).optional(),
  financialScore: z.coerce.number().min(0).max(100).optional(),
  totalScore: z.coerce.number().min(0).max(100).optional(),
  deadline: z.string().optional(),
  notes: z.string().max(5000).optional(),
  evaluationNotes: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
});

export type BidUpdateData = z.infer<typeof bidUpdateSchema>;





/**
 * Generic update schema — allows partial updates with string values — مخطط تحديث عام — يسمح بالتحديث الجزئي
 */
export function createUpdateSchema<T extends z.ZodRawShape>(shape: T) {
  return z.object(shape).partial();
}

// ===== Additional Update Schemas for previously unvalidated routes =====

export const documentUpdateSchema = z.object({
  name: z.string().max(500).optional(),
  fileType: z.string().max(50).optional(),
  fileSize: z.number().nonnegative().optional(),
  category: z.string().max(100).optional(),
  version: z.coerce.number().nonnegative().optional(),
  projectId: z.string().max(100).optional(),
  contractId: z.string().max(100).optional(),
  // SECURITY: uploadedById is intentionally excluded — set server-side only.
  // Allowing client-supplied uploadedById would enable impersonation.
});

export type DocumentUpdateData = z.infer<typeof documentUpdateSchema>;

export const inspectionUpdateSchema = z.object({
  buildingName: z.string().max(300).optional(),
  buildingAddress: z.string().max(500).optional(),
  inspectionType: z.string().max(100).optional(),
  riskLevel: z.enum(['GREEN', 'YELLOW', 'ORANGE', 'RED']).optional(),
  inspectionDate: z.string().optional(),
  nextInspectionDate: z.string().optional(),
  inspectorName: z.string().max(200).optional(),
  summary: z.string().max(5000).optional(),
  recommendations: z.string().max(5000).optional(),
  repairEstimate: z.coerce.number().nonnegative().optional(),
  status: z.string().max(50).optional(),
});

export type InspectionUpdateData = z.infer<typeof inspectionUpdateSchema>;

export const contractorUpdateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  nameEn: z.string().max(200).optional(),
  companyName: z.string().max(300).optional(),
  companyEn: z.string().max(300).optional(),
  contactPerson: z.string().max(200).optional(),
  phone: z.string().max(50).optional(),
  email: z.string().email().or(z.literal('')).optional(),
  address: z.string().max(500).optional(),
  crNumber: z.string().max(100).optional(),
  licenseNumber: z.string().max(100).optional(),
  licenseExpiry: z.string().optional(),
  category: z.string().max(50).optional(),
  rating: z.coerce.number().min(0).max(5).optional(),
  specialties: z.string().max(1000).optional(),
  experience: z.string().max(1000).optional(),
  bankName: z.string().max(200).optional(),
  bankAccount: z.string().max(100).optional(),
  iban: z.string().max(100).optional(),
  isActive: z.boolean().optional(),
  notes: z.string().max(5000).optional(),
});

export type ContractorUpdateData = z.infer<typeof contractorUpdateSchema>;

export const budgetUpdateSchema = z.object({
  name: z.string().max(200).optional(),
  category: z.string().max(100).optional(),
  planned: z.coerce.number().optional(),
  actual: z.coerce.number().optional(),
  committed: z.coerce.number().optional(),
  remaining: z.coerce.number().optional(),
  deviation: z.coerce.number().optional(),
});

export type BudgetUpdateData = z.infer<typeof budgetUpdateSchema>;

export const changeOrderUpdateSchema = z.object({
  number: z.string().max(50).optional(),
  type: z.string().max(50).optional(),
  costImpact: z.coerce.number().optional(),
  timeImpact: z.string().max(200).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
});

export type ChangeOrderUpdateData = z.infer<typeof changeOrderUpdateSchema>;

export const inventoryUpdateSchema = z.object({
  name: z.string().max(300).optional(),
  projectId: z.string().optional(),
  quantity: z.coerce.number().optional(),
  unit: z.string().max(50).optional(),
  price: z.coerce.number().optional(),
  location: z.string().max(300).optional(),
  minimumLevel: z.coerce.number().optional(),
});

export type InventoryUpdateData = z.infer<typeof inventoryUpdateSchema>;

export const automationUpdateSchema = z.object({
  status: z.enum(['ACTIVE', 'INACTIVE', 'PAUSED']).optional(),
});

export type AutomationUpdateData = z.infer<typeof automationUpdateSchema>;

export const violationUpdateSchema = z.object({
  type: z.string().max(100).optional(),
  severity: z.string().max(50).optional(),
  description: z.string().max(5000).optional(),
  contractorName: z.string().max(200).optional(),
  deadline: z.string().optional(),
  status: z.string().max(50).optional(),
  photoBefore: z.string().optional(),
  photoAfter: z.string().optional(),
  resolutionNotes: z.string().max(5000).optional(),
});

export type ViolationUpdateData = z.infer<typeof violationUpdateSchema>;

export const siteVisitUpdateSchema = z.object({
  date: z.string().optional(),
  plotNumber: z.string().max(100).optional(),
  municipality: z.string().max(100).optional(),
  gateDescription: z.string().max(500).optional(),
  neighborDesc: z.string().max(500).optional(),
  buildingDesc: z.string().max(500).optional(),
  status: z.string().max(50).optional(),
  photos: z.string().optional(),
  notes: z.string().max(5000).optional(),
});

export type SiteVisitUpdateData = z.infer<typeof siteVisitUpdateSchema>;

export const riskUpdateSchema = z.object({
  title: z.string().max(300).optional(),
  category: z.string().max(50).optional(),
  probability: z.coerce.number().min(1).max(5).optional(),
  impact: z.coerce.number().min(1).max(5).optional(),
  mitigationPlan: z.string().max(5000).optional(),
  strategy: z.string().max(50).optional(),
  status: z.string().max(50).optional(),
});

export type RiskUpdateData = z.infer<typeof riskUpdateSchema>;

export const riskActionUpdateSchema = z.object({
  description: z.string().max(2000).optional(),
  assigneeId: z.string().optional(),
  dueDate: z.string().optional(),
  completed: z.boolean().optional(),
});

export type RiskActionUpdateData = z.infer<typeof riskActionUpdateSchema>;

export const designDrawingUpdateSchema = z.object({
  title: z.string().max(300).optional(),
  drawingNumber: z.string().max(100).optional(),
  discipline: z.string().max(100).optional(),
  version: z.coerce.number().nonnegative().optional(),
  filePath: z.string().max(500).optional(),
  fileSize: z.number().nonnegative().optional(),
  status: z.string().max(50).optional(),
  reviewedBy: z.string().optional(),
  reviewNotes: z.string().max(2000).optional(),
  reviewedAt: z.string().optional(),
  clashDetected: z.boolean().optional(),
  clashNotes: z.string().max(2000).optional(),
});

export type DesignDrawingUpdateData = z.infer<typeof designDrawingUpdateSchema>;

export const transmittalUpdateSchema = z.object({
  subject: z.string().max(300).optional(),
  toName: z.string().max(200).optional(),
  toEmail: z.string().email().or(z.literal('')).optional(),
  toCompany: z.string().max(200).optional(),
  toPhone: z.string().max(50).optional(),
  deliveryMethod: z.string().max(50).optional(),
  status: z.string().max(50).optional(),
});

export type TransmittalUpdateData = z.infer<typeof transmittalUpdateSchema>;

export const transmittalItemUpdateSchema = z.object({
  documentNumber: z.string().max(100).optional(),
  title: z.string().max(300).optional(),
  revision: z.string().max(50).optional(),
  copies: z.coerce.number().nonnegative().optional(),
  purpose: z.string().max(100).optional(),
  received: z.boolean().optional(),
  approved: z.boolean().optional(),
  rejected: z.boolean().optional(),
  needsRevision: z.boolean().optional(),
  replyNotes: z.string().max(2000).optional(),
});

export type TransmittalItemUpdateData = z.infer<typeof transmittalItemUpdateSchema>;

export const leaveUpdateSchema = z.object({
  type: z.string().max(50).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  days: z.coerce.number().positive().optional(),
  reason: z.string().max(2000).optional(),
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED']).optional(),
});

export type LeaveUpdateData = z.infer<typeof leaveUpdateSchema>;

export const proposalUpdateSchema = z.object({
  number: z.string().max(50).optional(),
  clientId: z.string().min(1).optional(),
  projectId: z.string().optional(),
  status: z.string().max(50).optional(),
  notes: z.string().max(5000).optional(),
});

export type ProposalUpdateData = z.infer<typeof proposalUpdateSchema>;

export const siteDiaryUpdateSchema = z.object({
  date: z.string().optional(),
  weather: z.string().max(200).optional(),
  workerCount: z.coerce.number().nonnegative().optional(),
  workDescription: z.string().max(5000).optional(),
  issues: z.string().max(5000).optional(),
  safetyNotes: z.string().max(5000).optional(),
  equipment: z.string().max(5000).optional(),
  materials: z.string().max(5000).optional(),
  photos: z.string().optional(),
});

export type SiteDiaryUpdateData = z.infer<typeof siteDiaryUpdateSchema>;

export const knowledgeArticleUpdateSchema = z.object({
  title: z.string().max(300).optional(),
  content: z.string().max(50000).optional(),
  category: z.string().max(50).optional(),
  tags: z.string().max(500).optional(),
  authorId: z.string().optional(),
});

export type KnowledgeArticleUpdateData = z.infer<typeof knowledgeArticleUpdateSchema>;

export const equipmentUpdateSchema = z.object({
  name: z.string().max(200).optional(),
  type: z.string().max(100).optional(),
  model: z.string().max(200).optional(),
  serialNumber: z.string().max(100).optional(),
  status: z.string().max(50).optional(),
  location: z.string().max(300).optional(),
  dailyRate: z.coerce.number().optional(),
  lastMaintenance: z.string().optional(),
  nextMaintenance: z.string().optional(),
});

export type EquipmentUpdateData = z.infer<typeof equipmentUpdateSchema>;

export const defectUpdateSchema = z.object({
  title: z.string().max(300).optional(),
  severity: z.string().max(50).optional(),
  location: z.string().max(300).optional(),
  assigneeId: z.string().optional(),
  photos: z.string().optional(),
  resolutionNotes: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
});

export type DefectUpdateData = z.infer<typeof defectUpdateSchema>;

export const rfiUpdateSchema = z.object({
  number: z.string().max(50).optional(),
  subject: z.string().max(300).optional(),
  description: z.string().max(5000).optional(),
  priority: z.string().max(50).optional(),
  dueDate: z.string().optional(),
  response: z.string().max(10000).optional(),
  status: z.string().max(50).optional(),
});

export type RfiUpdateData = z.infer<typeof rfiUpdateSchema>;

export const submittalUpdateSchema = z.object({
  number: z.string().max(50).optional(),
  title: z.string().max(300).optional(),
  type: z.string().max(100).optional(),
  contractor: z.string().max(200).optional(),
  revisionNumber: z.coerce.number().nonnegative().optional(),
  status: z.string().max(50).optional(),
});

export type SubmittalUpdateData = z.infer<typeof submittalUpdateSchema>;

export const commissionUpdateSchema = z.object({
  status: z.string().max(50).optional(),
  approvedById: z.string().optional(),
  paidDate: z.string().optional(),
});

export type CommissionUpdateData = z.infer<typeof commissionUpdateSchema>;

export const attendanceUpdateSchema = z.object({
  checkIn: z.string().optional(),
  checkOut: z.string().optional(),
  status: z.string().max(50).optional(),
  workHours: z.coerce.number().nonnegative().optional(),
  overtimeHours: z.coerce.number().nonnegative().optional(),
});

export type AttendanceUpdateData = z.infer<typeof attendanceUpdateSchema>;

export const referralUpdateSchema = z.object({
  status: z.string().max(50).optional(),
  discountGiven: z.coerce.number().optional(),
  rewardAmount: z.coerce.number().optional(),
  notes: z.string().max(2000).optional(),
});

export type ReferralUpdateData = z.infer<typeof referralUpdateSchema>;

export const marketingCampaignUpdateSchema = z.object({
  name: z.string().max(300).optional(),
  type: z.string().max(100).optional(),
  budget: z.coerce.number().optional(),
  spent: z.coerce.number().optional(),
  leads: z.coerce.number().optional(),
  conversions: z.coerce.number().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  status: z.string().max(50).optional(),
  notes: z.string().max(5000).optional(),
});

export type MarketingCampaignUpdateData = z.infer<typeof marketingCampaignUpdateSchema>;

export const tenderUpdateSchema = z.object({
  tenderNumber: z.string().max(50).optional(),
  title: z.string().max(300).optional(),
  authority: z.string().max(200).optional(),
  projectType: z.string().max(100).optional(),
  description: z.string().max(5000).optional(),
  estimatedBudget: z.coerce.number().optional(),
  currency: z.string().max(10).optional(),
  closingDate: z.string().optional(),
  submissionDate: z.string().optional(),
  qualifications: z.string().max(5000).optional(),
  requiredDocs: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  winnerName: z.string().max(200).optional(),
  lostReason: z.string().max(2000).optional(),
  competitorAnalysis: z.string().max(5000).optional(),
  notes: z.string().max(5000).optional(),
  source: z.string().max(100).optional(),
  sourceUrl: z.string().max(500).optional(),
  assignedTo: z.string().optional(),
});

export type TenderUpdateData = z.infer<typeof tenderUpdateSchema>;

export const supervisionChecklistUpdateSchema = z.object({
  stage: z.string().max(100).optional(),
  title: z.string().max(300).optional(),
  visitDate: z.string().optional(),
  engineerId: z.string().optional(),
  weather: z.string().max(200).optional(),
  temperature: z.string().max(50).optional(),
  workerCount: z.coerce.number().nonnegative().optional(),
  contractorName: z.string().max(200).optional(),
  progressOverall: z.coerce.number().min(0).max(100).optional(),
  notes: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  approvedById: z.string().optional(),
});

export type SupervisionChecklistUpdateData = z.infer<typeof supervisionChecklistUpdateSchema>;

export const designPhaseUpdateSchema = z.object({
  phase: z.string().max(50).optional(),
  phaseNameAr: z.string().max(200).optional(),
  phaseNameEn: z.string().max(200).optional(),
  status: z.string().max(50).optional(),
  designerId: z.string().optional(),
  startDate: z.string().optional(),
  dueDate: z.string().optional(),
  completedDate: z.string().optional(),
  revisionCount: z.coerce.number().nonnegative().optional(),
  notes: z.string().max(5000).optional(),
  clientApproval: z.boolean().optional(),
});

export type DesignPhaseUpdateData = z.infer<typeof designPhaseUpdateSchema>;

export const workflowTemplateUpdateSchema = z.object({
  name: z.string().max(200).optional(),
  nameEn: z.string().max(200).optional(),
  projectType: z.string().max(50).optional(),
  description: z.string().max(2000).optional(),
  isActive: z.boolean().optional(),
});

export type WorkflowTemplateUpdateData = z.infer<typeof workflowTemplateUpdateSchema>;

export const approvalUpdateSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']).optional(),
  notes: z.string().max(2000).optional(),
});

export type ApprovalUpdateData = z.infer<typeof approvalUpdateSchema>;

export const purchaseOrderUpdateSchema = z.object({
  number: z.string().max(50).optional(),
  supplierId: z.string().optional(),
  projectId: z.string().optional(),
  amount: z.coerce.number().optional(),
  status: z.string().max(50).optional(),
});

export type PurchaseOrderUpdateData = z.infer<typeof purchaseOrderUpdateSchema>;

// ===== Batch 2: Additional Create Schemas =====

export const commentCreateSchema = z.object({
  content: z.string().min(1, 'Comment content is required').max(5000),
});

export type CommentCreateData = z.infer<typeof commentCreateSchema>;

export const subtaskCreateSchema = z.object({
  title: z.string().min(1, 'Subtask title is required').max(300),
  description: z.string().max(5000).optional().default(''),
  assigneeId: z.string().optional().default(''),
  priority: z.enum(['URGENT', 'HIGH', 'MEDIUM', 'LOW', 'NORMAL']).optional().default('NORMAL'),
});

export type SubtaskCreateData = z.infer<typeof subtaskCreateSchema>;

export const inspectionCreateSchema = z.object({
  projectId: z.string().optional().default(''),
  clientId: z.string().optional().default(''),
  buildingName: z.string().max(300).optional().default(''),
  buildingAddress: z.string().max(500).optional().default(''),
  inspectionType: z.string().max(100).optional().default(''),
  riskLevel: z.enum(['GREEN', 'YELLOW', 'ORANGE', 'RED']).optional().default('GREEN'),
  inspectionDate: z.string().min(1, 'Inspection date is required'),
  nextInspectionDate: z.string().optional().default(''),
  inspectorName: z.string().max(200).optional().default(''),
  summary: z.string().max(5000).optional().default(''),
  recommendations: z.string().max(5000).optional().default(''),
  repairEstimate: z.coerce.number().nonnegative().optional().default(0),
  status: z.string().max(50).optional().default('DRAFT'),
});

export type InspectionCreateData = z.infer<typeof inspectionCreateSchema>;

export const budgetCreateSchema = z.object({
  projectId: z.string().min(1, 'Project is required'),
  parentId: z.string().optional().default(''),
  name: z.string().min(1, 'Name is required').max(200),
  category: z.string().min(1, 'Category is required').max(100),
  planned: z.coerce.number().nonnegative().optional().default(0),
  actual: z.coerce.number().nonnegative().optional().default(0),
  committed: z.coerce.number().nonnegative().optional().default(0),
});

export type BudgetCreateData = z.infer<typeof budgetCreateSchema>;

export const purchaseOrderCreateSchema = z.object({
  number: z.string().min(1, 'PO number is required').max(50),
  supplierId: z.string().min(1, 'Supplier is required'),
  projectId: z.string().optional().default(''),
  amount: z.coerce.number().nonnegative().optional().default(0),
  status: z.string().max(50).optional().default('DRAFT'),
});

export type PurchaseOrderCreateData = z.infer<typeof purchaseOrderCreateSchema>;

export const inventoryCreateSchema = z.object({
  name: z.string().min(1, 'Item name is required').max(300),
  projectId: z.string().optional().default(''),
  quantity: z.coerce.number().nonnegative().optional().default(0),
  unit: z.string().max(50).optional().default(''),
  price: z.coerce.number().nonnegative().optional().default(0),
  location: z.string().max(300).optional().default(''),
  minimumLevel: z.coerce.number().nonnegative().optional().default(0),
});

export type InventoryCreateData = z.infer<typeof inventoryCreateSchema>;

export const automationCreateSchema = z.object({
  name: z.string().min(1, 'Automation name is required').max(200),
  description: z.string().max(2000).optional().default(''),
  triggerType: z.string().min(1, 'Trigger type is required').max(100),
  triggerConfig: z.unknown().optional(),
  actionType: z.string().min(1, 'Action type is required').max(100),
  actionConfig: z.unknown().optional(),
});

export type AutomationCreateData = z.infer<typeof automationCreateSchema>;

export const designPhaseCreateSchema = z.object({
  projectId: z.string().min(1, 'Project ID is required'),
  phase: z.string().max(100).optional().default('concept'),
  phaseNameAr: z.string().max(300).optional().default(''),
  phaseNameEn: z.string().max(300).optional().default(''),
  status: z.string().max(50).optional().default('not_started'),
  designerId: z.string().optional().default(''),
  startDate: z.string().optional().default(''),
  dueDate: z.string().optional().default(''),
  notes: z.string().max(5000).optional().default(''),
});

export type DesignPhaseCreateData = z.infer<typeof designPhaseCreateSchema>;

export const marketingCampaignCreateSchema = z.object({
  name: z.string().min(1, 'Campaign name is required').max(300),
  type: z.string().max(100).optional().default(''),
  budget: z.coerce.number().nonnegative().optional().default(0),
  leads: z.coerce.number().nonnegative().optional().default(0),
  conversions: z.coerce.number().nonnegative().optional().default(0),
  startDate: z.string().optional().default(''),
  endDate: z.string().optional().default(''),
  notes: z.string().max(5000).optional().default(''),
  status: z.string().max(50).optional().default('DRAFT'),
});

export type MarketingCampaignCreateData = z.infer<typeof marketingCampaignCreateSchema>;
