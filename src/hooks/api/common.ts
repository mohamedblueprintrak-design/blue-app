/**
 * Common types and interfaces shared across API hook modules.
 * Adapted from BluePrint's common.ts for Blue's entity shapes.
 */

// ── Generic helpers ──────────────────────────────────────────────────────────

/** Standard paginated list response returned by Blue API routes */
export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/** Simple success/error wrapper */
export interface ApiResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string };
}

// ── Document types ───────────────────────────────────────────────────────────

/** Data required to create a document record */
export interface CreateDocumentData {
  filename: string;
  originalName: string;
  filePath: string;
  fileType: string;
  mimeType: string;
  fileSize: number;
  category: string;
  description?: string;
  tags?: string[];
}

/** Result of a file upload operation */
export interface UploadResult {
  url: string;
  name: string;
  filename: string;
  type: string;
  category: string;
  size: number;
  uploadedBy: string;
  uploadedAt: string;
}

// ── Export / Report types ────────────────────────────────────────────────────

/** Export format types */
export type ExportType = 'pdf' | 'excel';

/** Report types available for export */
export type ReportType = 'financial' | 'projects' | 'tasks' | 'clients' | 'invoices';

/** Parameters for report export */
export interface ExportParams {
  type: ExportType;
  report: ReportType;
  startDate?: string;
  endDate?: string;
  language?: 'ar' | 'en';
}

// ── Budget ───────────────────────────────────────────────────────────────────

export interface Budget {
  id: string;
  projectId: string;
  projectName?: string;
  category: string;
  description?: string;
  budgetAmount: number;
  actualAmount: number;
  variance: number;
  createdAt: Date | string;
}

// ── Defect ───────────────────────────────────────────────────────────────────

export interface Defect {
  id: string;
  projectId: string;
  projectName?: string;
  title: string;
  description?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'Open' | 'In_Progress' | 'Resolved' | 'Closed';
  location?: string;
  imageId?: string;
  assignedTo?: string;
  resolvedAt?: Date | string;
  resolutionNotes?: string;
  createdAt: Date | string;
}

// ── Purchase Order ───────────────────────────────────────────────────────────

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplierId?: string;
  supplierName?: string;
  projectId?: string;
  projectName?: string;
  orderDate?: Date | string;
  expectedDate?: Date | string;
  subtotal?: number;
  taxRate?: number;
  taxAmount?: number;
  totalAmount?: number;
  status?: string;
  notes?: string;
  terms?: string;
  items?: PurchaseOrderItem[];
  createdAt?: Date | string;
}

export interface PurchaseOrderItem {
  id?: string;
  purchaseOrderId?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  unit?: string;
  total?: number;
  sortOrder?: number;
}

// ── Knowledge Article ────────────────────────────────────────────────────────

export interface KnowledgeArticle {
  id: string;
  title: string;
  content: string;
  category?: 'guide' | 'faq' | 'policy' | 'template';
  tags?: string[];
  authorId?: string;
  isPublished?: boolean;
  viewCount?: number;
  helpfulCount?: number;
  createdAt: Date | string;
  updatedAt?: Date | string;
}

// ── Voucher ─────────────────────────────────────────────────────────────────

export interface VoucherFilters {
  supplierId?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface CreateVoucherData {
  supplierId: string;
  amount: number;
  description?: string;
  date?: string;
  reference?: string;
}

// ── Profile ─────────────────────────────────────────────────────────────────

export interface ProfileUpdate {
  name?: string;
  email?: string;
  phone?: string;
  position?: string;
  department?: string;
  avatar?: string;
}

export interface PasswordChange {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

// ── User Management ─────────────────────────────────────────────────────────

export interface AdminUser {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  role?: string;
  department?: string;
  position?: string;
  avatar?: string;
  isActive?: boolean;
  emailVerified?: boolean;
  twoFactorEnabled?: boolean;
  createdAt?: Date | string;
}

export interface CreateUserData {
  name: string;
  email: string;
  password: string;
  role?: string;
  department?: string;
  position?: string;
  phone?: string;
}

export interface UpdateUserData {
  name?: string;
  email?: string;
  role?: string;
  department?: string;
  position?: string;
  phone?: string;
  isActive?: boolean;
}
