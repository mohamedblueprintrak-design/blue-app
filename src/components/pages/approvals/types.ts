// ===== Entity item interface for picker =====
export interface EntityItem {
  id: string;
  title: string;
  amount?: number;
  status?: string;
}

// ===== Types =====
export interface Approval {
  id: string;
  entityType: string;
  entityId: string;
  title: string;
  description: string;
  status: string;
  requestedBy: string;
  assignedTo: string;
  step: number;
  totalSteps: number;
  amount: number;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

// ===== Filter Types =====
export const statusFilterTabs = ["all", "PENDING", "APPROVED", "REJECTED", "CANCELLED"] as const;
export type StatusFilterTab = (typeof statusFilterTabs)[number];

export const entityFilters = ["all", "invoice", "payment", "purchase_order", "change_order", "LEAVE"] as const;
export type EntityFilter = (typeof entityFilters)[number];

export const dateFilters = ["all", "week", "month", "quarter"] as const;
export type DateFilter = (typeof dateFilters)[number];

// ===== Create form type =====
export interface CreateFormState {
  entityType: string;
  entityId: string;
  title: string;
  description: string;
  assignedTo: string;
  totalSteps: string;
  amount: string;
  priority: string;
}
