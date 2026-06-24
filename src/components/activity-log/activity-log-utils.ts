import { Plus, Pencil, Trash2, Eye, MessageSquare, Upload, ArrowUpDown, FolderKanban, CheckSquare, FileSignature, Receipt, FileText, Video, Users, UserPlus } from 'lucide-react';

export type ActionType = "CREATE" | "UPDATE" | "DELETE" | "view" | "status_change" | "comment" | "upload";
export type EntityType = "project" | "task" | "contract" | "invoice" | "document" | "MEETING" | "client" | "employee";

export interface ActivityItem {
  id: string;
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  details: string;
  metadata?: string | null;
  createdAt: string;
  user?: {
    id: string;
    name: string;
    email: string;
    avatar: string;
    role: string;
  };
}



// ===== Action Type Config =====
export const actionConfig: Record<string, {
  icon: typeof Plus;
  color: string;
  bg: string;
  border: string;
  dot: string;
  dotGradient: string;
  ar: string;
  en: string;
}> = {
  CREATE: {
    icon: Plus,
    color: "text-brand-navy-600 dark:text-brand-navy-400",
    bg: "bg-brand-navy-50 dark:bg-brand-navy-900/30",
    border: "border-s-brand-navy-500",
    dot: "bg-brand-navy-500",
    dotGradient: "from-brand-navy-400 to-cyan-500",
    ar: "إنشاء",
    en: "Created",
  },
  UPDATE: {
    icon: Pencil,
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-900/30",
    border: "border-s-amber-500",
    dot: "bg-amber-500",
    dotGradient: "from-amber-400 to-orange-500",
    ar: "تحديث",
    en: "Updated",
  },
  DELETE: {
    icon: Trash2,
    color: "text-red-600 dark:text-red-400",
    bg: "bg-red-50 dark:bg-red-900/30",
    border: "border-s-red-500",
    dot: "bg-red-500",
    dotGradient: "from-red-400 to-rose-500",
    ar: "حذف",
    en: "Deleted",
  },
  view: {
    icon: Eye,
    color: "text-slate-500 dark:text-slate-400",
    bg: "bg-slate-50 dark:bg-slate-800",
    border: "border-s-slate-400",
    dot: "bg-slate-400",
    dotGradient: "from-slate-300 to-slate-500",
    ar: "عرض",
    en: "Viewed",
  },
  status_change: {
    icon: ArrowUpDown,
    color: "text-violet-600 dark:text-violet-400",
    bg: "bg-violet-50 dark:bg-violet-900/30",
    border: "border-s-violet-500",
    dot: "bg-violet-500",
    dotGradient: "from-violet-400 to-purple-500",
    ar: "تغيير حالة",
    en: "Status Change",
  },
  comment: {
    icon: MessageSquare,
    color: "text-sky-600 dark:text-sky-400",
    bg: "bg-sky-50 dark:bg-sky-900/30",
    border: "border-s-sky-500",
    dot: "bg-sky-500",
    dotGradient: "from-sky-400 to-blue-500",
    ar: "تعليق",
    en: "Commented",
  },
  upload: {
    icon: Upload,
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-900/30",
    border: "border-s-emerald-500",
    dot: "bg-emerald-500",
    dotGradient: "from-emerald-400 to-brand-navy-500",
    ar: "رفع ملف",
    en: "Uploaded",
  },
};

// ===== Entity Type Config =====
export const entityConfig: Record<string, {
  icon: typeof FolderKanban;
  ar: string;
  en: string;
}> = {
  project: { icon: FolderKanban, ar: "مشروع", en: "Project" },
  task: { icon: CheckSquare, ar: "مهمة", en: "Task" },
  contract: { icon: FileSignature, ar: "عقد", en: "Contract" },
  invoice: { icon: Receipt, ar: "فاتورة", en: "Invoice" },
  document: { icon: FileText, ar: "مستند", en: "Document" },
  MEETING: { icon: Video, ar: "اجتماع", en: "Meeting" },
  client: { icon: Users, ar: "عميل", en: "Client" },
  employee: { icon: UserPlus, ar: "موظف", en: "Employee" },
};

// ===== Sample Mock Data =====
// Use a deterministic reference time to avoid SSR hydration mismatch
const MOCK_REF_TIME = new Date('2025-06-01T12:00:00Z').getTime();
export const mockActivities: ActivityItem[] = [
  {
    id: "mock-1",
    userId: "u1",
    action: "CREATE",
    entityType: "project",
    entityId: "p1",
    details: "مشروع فيلا الشاطئ / Beach Villa Project",
    createdAt: new Date(MOCK_REF_TIME - 5 * 60000).toISOString(),
    user: { id: "u1", name: "أحمد المطيري", email: "ahmed@***", avatar: "", role: "ADMIN" },
  },
  {
    id: "mock-2",
    userId: "u2",
    action: "UPDATE",
    entityType: "task",
    entityId: "t1",
    details: "مهمة تصميم المخطط الأولي - تغيير الأولوية إلى عاجلة",
    createdAt: new Date(MOCK_REF_TIME - 18 * 60000).toISOString(),
    user: { id: "u2", name: "سارة العلي", email: "sara@***", avatar: "", role: "PROJECT_MANAGER" },
  },
  {
    id: "mock-3",
    userId: "u3",
    action: "CREATE",
    entityType: "invoice",
    entityId: "inv1",
    details: "فاتورة رقم INV-2024-0047 بقيمة 45,000 د.إ",
    createdAt: new Date(MOCK_REF_TIME - 45 * 60000).toISOString(),
    user: { id: "u3", name: "خالد العمري", email: "khaled@***", avatar: "", role: "ACCOUNTANT" },
  },
  {
    id: "mock-4",
    userId: "u4",
    action: "upload",
    entityType: "document",
    entityId: "d1",
    details: "مخططات التصميم المعماري - المرحلة الثانية",
    createdAt: new Date(MOCK_REF_TIME - 2 * 3600000).toISOString(),
    user: { id: "u4", name: "محمد الراشد", email: "mohammed@***", avatar: "", role: "ENGINEER" },
  },
  {
    id: "mock-5",
    userId: "u1",
    action: "status_change",
    entityType: "project",
    entityId: "p2",
    details: "مشروع برج النخيل - تغيير الحالة إلى 'مكتمل'",
    createdAt: new Date(MOCK_REF_TIME - 3 * 3600000).toISOString(),
    user: { id: "u1", name: "أحمد المطيري", email: "ahmed@***", avatar: "", role: "ADMIN" },
  },
  {
    id: "mock-6",
    userId: "u5",
    action: "CREATE",
    entityType: "MEETING",
    entityId: "m1",
    details: "اجتماع مراجعة التصاميم الإنشائية - يوم الأحد القادم",
    createdAt: new Date(MOCK_REF_TIME - 5 * 3600000).toISOString(),
    user: { id: "u5", name: "فاطمة الزهراني", email: "fatima@***", avatar: "", role: "SECRETARY" },
  },
  {
    id: "mock-7",
    userId: "u2",
    action: "comment",
    entityType: "task",
    entityId: "t2",
    details: "تعليق على مهمة الحسابات الإنشائية: 'يحتاج مراجعة إضافية'",
    createdAt: new Date(MOCK_REF_TIME - 8 * 3600000).toISOString(),
    user: { id: "u2", name: "سارة العلي", email: "sara@***", avatar: "", role: "PROJECT_MANAGER" },
  },
  {
    id: "mock-8",
    userId: "u6",
    action: "CREATE",
    entityType: "contract",
    entityId: "c1",
    details: "عقد خدمات هندسية مع شركة الأفق العقارية",
    createdAt: new Date(MOCK_REF_TIME - 12 * 3600000).toISOString(),
    user: { id: "u6", name: "عبدالله الحربي", email: "abdullah@***", avatar: "", role: "MANAGER" },
  },
  {
    id: "mock-9",
    userId: "u3",
    action: "UPDATE",
    entityType: "invoice",
    entityId: "inv2",
    details: "فاتورة INV-2024-0042 - تحديث الحالة إلى 'مدفوعة'",
    createdAt: new Date(MOCK_REF_TIME - 1 * 86400000).toISOString(),
    user: { id: "u3", name: "خالد العمري", email: "khaled@***", avatar: "", role: "ACCOUNTANT" },
  },
  {
    id: "mock-10",
    userId: "u4",
    action: "view",
    entityType: "project",
    entityId: "p3",
    details: "عرض تفاصيل مشروع مجمع الرياض السكني",
    createdAt: new Date(MOCK_REF_TIME - 1.5 * 86400000).toISOString(),
    user: { id: "u4", name: "محمد الراشد", email: "mohammed@***", avatar: "", role: "ENGINEER" },
  },
  {
    id: "mock-11",
    userId: "u7",
    action: "CREATE",
    entityType: "client",
    entityId: "cl1",
    details: "إضافة عميل جديد: شركة المستقبل للتطوير العقاري",
    createdAt: new Date(MOCK_REF_TIME - 2 * 86400000).toISOString(),
    user: { id: "u7", name: "نورة القحطاني", email: "noura@***", avatar: "", role: "HR" },
  },
  {
    id: "mock-12",
    userId: "u1",
    action: "DELETE",
    entityType: "document",
    entityId: "d2",
    details: "حذف مستند المخططات القديمة - مشروع فيلا الواحة",
    createdAt: new Date(MOCK_REF_TIME - 3 * 86400000).toISOString(),
    user: { id: "u1", name: "أحمد المطيري", email: "ahmed@***", avatar: "", role: "ADMIN" },
  },
  {
    id: "mock-13",
    userId: "u5",
    action: "UPDATE",
    entityType: "MEETING",
    entityId: "m2",
    details: "تحديث موعد اجتماع لجنة المراجعة إلى يوم الثلاثاء",
    createdAt: new Date(MOCK_REF_TIME - 4 * 86400000).toISOString(),
    user: { id: "u5", name: "فاطمة الزهراني", email: "fatima@***", avatar: "", role: "SECRETARY" },
  },
  {
    id: "mock-14",
    userId: "u6",
    action: "status_change",
    entityType: "contract",
    entityId: "c2",
    details: "عقد pNU-2024-012 - تغيير الحالة إلى 'نشط'",
    createdAt: new Date(MOCK_REF_TIME - 5 * 86400000).toISOString(),
    user: { id: "u6", name: "عبدالله الحربي", email: "abdullah@***", avatar: "", role: "MANAGER" },
  },
  {
    id: "mock-15",
    userId: "u2",
    action: "CREATE",
    entityType: "task",
    entityId: "t3",
    details: "إضافة مهمة جديدة: إعداد تقرير الكميات - مشروع برج النخيل",
    createdAt: new Date(MOCK_REF_TIME - 6 * 86400000).toISOString(),
    user: { id: "u2", name: "سارة العلي", email: "sara@***", avatar: "", role: "PROJECT_MANAGER" },
  },
];

// ===== Animation Variants =====
export const cardVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: {
      delay: i * 0.05,
      duration: 0.35,
      ease: [0.21, 0.47, 0.32, 0.98] as [number, number, number, number],
    },
  }),
  exit: { opacity: 0, x: 20, transition: { duration: 0.2 } },
};

export const loadMoreVariants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};
