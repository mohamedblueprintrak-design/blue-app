/**
 * Entity Create Schemas — مخططات إنشاء الكيانات
 *
 * Zod schemas for validating the creation (POST) of every entity type.
 */

import { z } from 'zod';
import { safeNumber } from './common.schema';

// ===== Client =====

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

// ===== Invoice =====

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

// ===== Contract =====

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

// ===== Meeting =====

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

// ===== Supplier =====

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

// ===== Bid =====

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

// ===== Notification =====

export const notificationCreateSchema = z.object({
  userId: z.string().min(1, 'المستخدم مطلوب'),
  type: z.string().max(100),
  title: z.string().min(1, 'العنوان مطلوب').max(300),
  message: z.string().min(1, 'الرسالة مطلوبة').max(2000),
  relatedEntityType: z.string().max(50).optional().default(''),
  relatedEntityId: z.string().optional().default(''),
});

export type NotificationCreateData = z.infer<typeof notificationCreateSchema>;

// ===== Company Settings =====

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

// ===== AI Chat =====

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

// ===== Approval =====

export const approvalCreateSchema = z.object({
  entityType: z.string().min(1).max(50),
  entityId: z.string().cuid(),
  title: z.string().min(1, 'العنوان مطلوب').max(300),
  description: z.string().max(2000).optional().default(''),
  requestedBy: z.string().max(200).optional().default(''),
  assignedTo: z.string().max(200).optional().default(''),
  step: z.coerce.number().min(1).default(1),
  totalSteps: z.coerce.number().min(1).default(1),
  amount: safeNumber,
});

export type ApprovalCreateData = z.infer<typeof approvalCreateSchema>;

// ===== Contractor =====

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

// ===== Knowledge Article =====

export const knowledgeArticleSchema = z.object({
  title: z.string().min(1, 'العنوان مطلوب').max(300),
  content: z.string().min(1, 'المحتوى مطلوب').max(50000),
  category: z.string().max(50).optional().default('guide'),
  tags: z.string().max(500).optional().default(''),
  projectId: z.string().optional().default(''),
  authorId: z.string().optional().default(''),
});

export type KnowledgeArticleData = z.infer<typeof knowledgeArticleSchema>;

// ===== Proposal =====

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

// ===== Quote Request =====

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

// ===== Comment =====

export const commentCreateSchema = z.object({
  content: z.string().min(1, 'Comment content is required').max(5000),
});

export type CommentCreateData = z.infer<typeof commentCreateSchema>;

// ===== Subtask =====

export const subtaskCreateSchema = z.object({
  title: z.string().min(1, 'Subtask title is required').max(300),
  description: z.string().max(5000).optional().default(''),
  assigneeId: z.string().optional().default(''),
  priority: z.enum(['URGENT', 'HIGH', 'MEDIUM', 'LOW', 'NORMAL']).optional().default('NORMAL'),
});

export type SubtaskCreateData = z.infer<typeof subtaskCreateSchema>;

// ===== Inspection =====

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

// ===== Budget =====

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

// ===== Purchase Order =====

export const purchaseOrderCreateSchema = z.object({
  number: z.string().min(1, 'PO number is required').max(50),
  supplierId: z.string().min(1, 'Supplier is required'),
  projectId: z.string().optional().default(''),
  amount: z.coerce.number().nonnegative().optional().default(0),
  status: z.string().max(50).optional().default('DRAFT'),
});

export type PurchaseOrderCreateData = z.infer<typeof purchaseOrderCreateSchema>;

// ===== Inventory =====

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

// ===== Automation =====

export const automationCreateSchema = z.object({
  name: z.string().min(1, 'Automation name is required').max(200),
  description: z.string().max(2000).optional().default(''),
  triggerType: z.string().min(1, 'Trigger type is required').max(100),
  triggerConfig: z.unknown().optional(),
  actionType: z.string().min(1, 'Action type is required').max(100),
  actionConfig: z.unknown().optional(),
});

export type AutomationCreateData = z.infer<typeof automationCreateSchema>;

// ===== Design Phase =====

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

// ===== Marketing Campaign =====

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
