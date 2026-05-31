export interface RiskItem {
  id: string;
  projectId: string;
  title: string;
  category: string;
  probability: number;
  impact: number;
  score: number;
  mitigationPlan: string;
  strategy: string;
  status: string;
  createdAt: string;
  project: { id: string; name: string; nameEn: string; number: string } | null;
  actions: RiskAction[];
}

export interface RiskAction {
  id: string;
  description: string;
  assigneeId: string | null;
  dueDate: string | null;
  completed: boolean;
  assignee: { id: string; name: string } | null;
}

export interface ProjectOption {
  id: string;
  name: string;
  nameEn: string;
  number: string;
}

export interface UserOption {
  id: string;
  name: string;
}

export interface RiskFormData {
  projectId: string;
  title: string;
  category: string;
  probability: number;
  impact: number;
  mitigationPlan: string;
  strategy: string;
  assigneeId: string;
}

export interface NewAction {
  description: string;
  assigneeId: string;
  dueDate: string;
}
