// ===== WORKFLOW TYPES =====
export interface WorkflowStageData {
  id: string;
  workflowId: string;
  templateStageId: string | null;
  name: string;
  nameEn: string;
  order: number;
  status: string;
  startDate: string | null;
  dueDate: string | null;
  completedDate: string | null;
  assigneeId: string | null;
  notes: string;
  steps: WorkflowStepData[];
}

export interface WorkflowStepData {
  id: string;
  stageId: string;
  templateStepId: string | null;
  name: string;
  nameEn: string;
  order: number;
  status: string;
  assigneeId: string | null;
  assignedRole: string;
  startDate: string | null;
  dueDate: string | null;
  completedDate: string | null;
  action: string;
  notes: string;
  returnReason: string;
  severity: string;
  assignee?: { id: string; name: string; avatar: string; role: string } | null;
}

export interface WorkflowData {
  id: string;
  projectId: string;
  templateId: string | null;
  currentStageId: string | null;
  status: string;
  progress: number;
  startedAt: string;
  completedAt: string | null;
  stages: WorkflowStageData[];
  template?: { id: string; name: string; nameEn: string } | null;
  progressData?: {
    totalStages: number;
    completedStages: number;
    totalSteps: number;
    completedSteps: number;
    progress: number;
    currentStageIndex: number;
  };
}

// ===== CONTRACTOR RFQ TYPES =====
export interface ContractorRFQBid {
  id: string;
  projectId: string;
  contractorId: string | null;
  contractorName: string;
  contractorContact: string;
  amount: number;
  technicalScore: number;
  financialScore: number;
  totalScore: number;
  status: string;
  deadline: string | null;
  quoteFile: string;
  quoteUploadedAt: string | null;
  rfqSentAt: string | null;
  rfqStatus: string;
  aiAnalysis: string;
  contractFile: string;
  contractSignedAt: string | null;
  isAwarded: boolean;
  contractor?: {
    id: string;
    name: string;
    companyName: string;
    rating: number;
    category: string;
    phone: string;
    email: string;
    experience: string;
    specialties: string;
  } | null;
}

// ===== PROJECT TYPES =====
export interface ProjectDetailProps {
  language: "ar" | "en";
}

export interface ProjectStage {
  id: string;
  department: string;
  stageName: string;
  stageOrder: number;
  status: string;
  engineerId: string | null;
  notes: string;
}

export interface GovApproval {
  id: string;
  authority: string;
  status: string;
  submissionDate: string | null;
  approvalDate: string | null;
  rejectionCount: number;
  notes: string;
}

export interface BOQItem {
  id: string;
  code: string;
  description: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  total: number;
  category: string;
}

export interface SchedulePhase {
  id: string;
  section: string;
  phaseOrder: number;
  phaseName: string;
  duration: number;
  maxDuration: number;
  status: string;
  startDate: string | null;
  endDate: string | null;
}

export interface Assignment {
  id: string;
  role: string;
  user: { id: string; name: string; avatar: string; department: string; position: string };
}

export interface ProjectData {
  id: string;
  number: string;
  name: string;
  nameEn: string;
  clientId: string;
  location: string;
  plotNumber: string;
  type: string;
  status: string;
  progress: number;
  budget: number;
  startDate: string | null;
  endDate: string | null;
  description: string;
  client: { id: string; name: string; company: string; email: string; phone: string };
  contractor: { id: string; name: string; nameEn: string; companyName: string; companyEn: string; contactPerson: string; phone: string; email: string; category: string; rating: number; crNumber: string; licenseNumber: string } | null;
  createdBy: { id: string; name: string };
  assignments: Assignment[];
  stages: ProjectStage[];
  govApprovals: GovApproval[];
  boqItems: BOQItem[];
  schedulePhases: SchedulePhase[];
  invoices: Array<{ id: string; number: string; total: number; paidAmount: number; status: string }>;
  contracts: Array<{ id: string; value: number; status: string }>;
  budgets: Array<{ planned: number; actual: number; category: string }>;
  siteVisits: Array<{ id: string; date: string; status: string }>;
  defects: Array<{ id: string; title: string; severity: string; status: string }>;
  siteDiaries: Array<{ id: string; date: string; workerCount: number }>;
  taskStats: { total: number; todo: number; inProgress: number; review: number; done: number };
}

// ===== DESIGN STAGE TYPES =====
export interface DesignStep {
  id: string;
  nameAr: string;
  nameEn: string;
  assignee: string;
  status: "NOT_STARTED" | "IN_PROGRESS" | "SUBMITTED" | "APPROVED";
  date: string | null;
}

export interface DesignDiscipline {
  id: string;
  nameAr: string;
  nameEn: string;
  icon: React.ElementType;
  color: string;
  steps: DesignStep[];
  supervisor: string;
}
