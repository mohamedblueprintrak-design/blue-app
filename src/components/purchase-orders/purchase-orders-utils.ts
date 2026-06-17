// ===== Types =====
export interface PurchaseOrderItem {
  id?: string;
  itemName: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface PurchaseOrder {
  id: string;
  number: string;
  supplierId: string;
  projectId: string | null;
  amount: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  supplier: { id: string; name: string; category: string };
  project: { id: string; number: string; name: string; nameEn: string } | null;
  items: PurchaseOrderItem[];
  _count: { items: number };
}

export interface PurchaseOrdersResponse {
  orders: PurchaseOrder[];
  summary: {
    totalOrders: number;
    totalAmount: number;
    pendingApproval: number;
  };
}

export interface SimpleSupplier {
  id: string;
  name: string;
  category: string;
}

export interface SimpleProject {
  id: string;
  number: string;
  name: string;
  nameEn: string;
}

// ===== Helpers =====
export const statusConfig: Record<string, { ar: string; en: string; color: string }> = {
  DRAFT: { ar: "مسودة", en: "Draft", color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" },
  SUBMITTED: { ar: "مقدمة", en: "Submitted", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300" },
  APPROVED: { ar: "معتمدة", en: "Approved", color: "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300" },
  RECEIVED: { ar: "مستلمة", en: "Received", color: "bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-300" },
  CANCELLED: { ar: "ملغاة", en: "Cancelled", color: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300" },
};

export function isHighValue(amount: number) {
  return amount >= 50000;
}
