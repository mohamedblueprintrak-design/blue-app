/**
 * API Hooks Barrel Export
 *
 * Single entry-point for all CRUD hooks and shared types.
 * Import from '@/hooks/api' to access any entity hook.
 */

// ── Common types & helpers ───────────────────────────────────────────────────
export type {
  ApiResult,
  PaginatedResponse,
  CreateDocumentData,
  UploadResult,
  ExportType,
  ReportType,
  ExportParams,
  Budget,
  Defect,
  PurchaseOrder,
  PurchaseOrderItem,
  KnowledgeArticle,
  VoucherFilters,
  CreateVoucherData,
  ProfileUpdate,
  PasswordChange,
  AdminUser,
  CreateUserData,
  UpdateUserData,
} from './common';

// ── CRUD factory ─────────────────────────────────────────────────────────────
export { createCrudHooks } from './create-crud-hooks';
export type { CrudHooksConfig, ApiResult as FactoryApiResult } from './create-crud-hooks';

// ── Tasks ────────────────────────────────────────────────────────────────────
export {
  useTasks,
  useTask,
  useCreateTask,
  useUpdateTask,
  useDeleteTask,
} from './tasks';
export type { Task } from './tasks';

// ── Projects ─────────────────────────────────────────────────────────────────
export {
  useProjects,
  useProject,
  useCreateProject,
  useUpdateProject,
  useDeleteProject,
} from './projects';
export type { Project } from './projects';

// ── Clients ──────────────────────────────────────────────────────────────────
export {
  useClients,
  useClient,
  useCreateClient,
  useUpdateClient,
  useDeleteClient,
} from './clients';
export type { Client } from './clients';

// ── Invoices ─────────────────────────────────────────────────────────────────
export {
  useInvoices,
  useInvoice,
  useCreateInvoice,
  useUpdateInvoice,
  useDeleteInvoice,
} from './invoices';
export type { Invoice } from './invoices';

// ── Meetings ─────────────────────────────────────────────────────────────────
export {
  useMeetings,
  useMeeting,
  useCreateMeeting,
  useUpdateMeeting,
  useDeleteMeeting,
} from './meetings';
export type { Meeting } from './meetings';

// ── Documents ────────────────────────────────────────────────────────────────
export {
  useDocuments,
  useDocument,
  useCreateDocument,
  useUpdateDocument,
  useDeleteDocument,
} from './documents';
export type { Document } from './documents';

// ── Employees ────────────────────────────────────────────────────────────────
export {
  useEmployees,
  useEmployee,
  useCreateEmployee,
  useUpdateEmployee,
  useDeleteEmployee,
} from './employees';
export type { Employee } from './employees';

// ── Risks ────────────────────────────────────────────────────────────────────
export {
  useRisks,
  useRisk,
  useCreateRisk,
  useUpdateRisk,
  useDeleteRisk,
} from './risks';
export type { Risk } from './risks';

// ── Defects ──────────────────────────────────────────────────────────────────
export {
  useDefects,
  useDefect,
  useCreateDefect,
  useUpdateDefect,
  useDeleteDefect,
} from './defects';
export type { Defect as DefectEntity } from './defects';

// ── Suppliers ────────────────────────────────────────────────────────────────
export {
  useSuppliers,
  useSupplier,
  useCreateSupplier,
  useUpdateSupplier,
  useDeleteSupplier,
} from './suppliers';
export type { Supplier } from './suppliers';

// ── AI Chat ──────────────────────────────────────────────────────────────────
export { useAIChat } from './ai-chat';

// ── Attendance ───────────────────────────────────────────────────────────────
export {
  useAttendances,
  useAttendance,
  useCreateAttendance,
  useUpdateAttendance,
  useDeleteAttendance,
} from './attendance';
export type { AttendanceRecord } from './attendance';

// ── BOQ ──────────────────────────────────────────────────────────────────────
export {
  useBOQItems,
  useBOQItem,
  useCreateBOQItem,
  useUpdateBOQItem,
  useDeleteBOQItem,
} from './boq';
export type { BOQItem } from './boq';

// ── Budgets ──────────────────────────────────────────────────────────────────
export {
  useBudgets,
  useBudget,
  useCreateBudget,
  useUpdateBudget,
  useDeleteBudget,
} from './budgets';
export type { BudgetItem } from './budgets';

// ── Contracts ────────────────────────────────────────────────────────────────
export {
  useContracts,
  useContract,
  useCreateContract,
  useUpdateContract,
  useDeleteContract,
} from './contracts';
export type { Contract } from './contracts';

// ── Correspondence ───────────────────────────────────────────────────────────
export {
  useCorrespondence,
  useCreateCorrespondence,
  useDeleteCorrespondence,
} from './correspondence';
export type { CorrespondenceRecord } from './correspondence';

// ── Dashboard ────────────────────────────────────────────────────────────────
export { useDashboard } from './dashboard';
export type { DashboardStats } from './dashboard';

// ── Knowledge ────────────────────────────────────────────────────────────────
export {
  useKnowledgeArticles,
  useKnowledgeArticle,
  useCreateKnowledgeArticle,
  useUpdateKnowledgeArticle,
  useDeleteKnowledgeArticle,
  useMarkArticleHelpful,
} from './knowledge';
export type { KnowledgeArticleItem } from './knowledge';

// ── Leave Requests ───────────────────────────────────────────────────────────
export {
  useLeaveRequests,
  useCreateLeaveRequest,
  useApproveLeaveRequest,
  useDeleteLeaveRequest,
} from './leave-requests';
export type { LeaveRequest } from './leave-requests';

// ── Materials / Equipment ────────────────────────────────────────────────────
export {
  useMaterials,
  useMaterial,
  useCreateMaterial,
  useUpdateMaterial,
  useDeleteMaterial,
} from './materials';
export type { Material } from './materials';

// ── Notifications ────────────────────────────────────────────────────────────
export {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from './notifications';

// ── Profile ──────────────────────────────────────────────────────────────────
export {
  useProfile,
  useUpdateProfile,
  useChangePassword,
  useUploadAvatar,
  useDeleteAvatar,
} from './profile';
export type { UserProfile } from './profile';

// ── Proposals ────────────────────────────────────────────────────────────────
export {
  useProposals,
  useProposal,
  useCreateProposal,
  useUpdateProposal,
  useDeleteProposal,
} from './proposals';
export type { Proposal } from './proposals';

// ── Purchase Orders ──────────────────────────────────────────────────────────
export {
  usePurchaseOrders,
  usePurchaseOrder,
  useCreatePurchaseOrder,
  useUpdatePurchaseOrder,
  useDeletePurchaseOrder,
} from './purchase-orders';

// ── Reports ──────────────────────────────────────────────────────────────────
export { useExportReport } from './reports';

// ── Site Reports / Diary ─────────────────────────────────────────────────────
export {
  useSiteReports,
  useSiteReport,
  useCreateSiteReport,
  useUpdateSiteReport,
  useDeleteSiteReport,
} from './site-reports';
export type { SiteDiaryEntry } from './site-reports';

// ── Users ────────────────────────────────────────────────────────────────────
export {
  useUsers,
  useUser,
  useCreateUser,
  useUpdateUser,
  useDeleteUser,
} from './users';

// ── Payments / Vouchers ──────────────────────────────────────────────────────
export {
  usePayments,
  usePayment,
  useCreatePayment,
  useUpdatePayment,
  useDeletePayment,
} from './vouchers';
