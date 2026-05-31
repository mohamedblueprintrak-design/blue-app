import type { LucideIcon } from "lucide-react";

// ===== Dashboard Types =====

export interface DashboardStats {
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  delayedProjects: number;
}

export interface DashboardInvoices {
  outstandingTotal: number;
  outstandingCount: number;
  overdueCount: number;
}

export interface DashboardRevenue {
  monthly: Array<{
    month: string;
    labelAr: string;
    labelEn: string;
    revenue: number;
  }>;
  thisMonth: number;
  lastMonth: number;
  change: number;
}

export interface RecentProject {
  id: string;
  number: string;
  name: string;
  nameEn: string;
  clientName: string;
  clientCompany: string;
  status: string;
  progress: number;
  updatedAt: string;
}

export interface UpcomingTask {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate: string | null;
  isOverdue: boolean;
  projectName: string;
  projectNumber: string;
  assigneeName: string;
}

export interface DepartmentProgressItem {
  key: string;
  labelAr: string;
  labelEn: string;
  total: number;
  completed: number;
  progress: number;
  color: string;
}

export interface DashboardAlert {
  id: string;
  type: string;
  titleAr: string;
  titleEn: string;
  descriptionAr: string;
  descriptionEn: string;
  timestamp: string;
  severity: "HIGH" | "MEDIUM" | "LOW";
}

export interface DashboardData {
  stats: DashboardStats;
  invoices: DashboardInvoices;
  revenue: DashboardRevenue;
  recentProjects: RecentProject[];
  upcomingTasks: UpcomingTask[];
  activeTasksCount: number;
  overdueTasksCount: number;
  departmentProgress: DepartmentProgressItem[];
  alerts: DashboardAlert[];
  taskTrend: Array<{ month: string; labelAr: string; labelEn: string; created: number; completed: number }>;
  budgetOverview: Array<{ name: string; nameEn: string; budget: number }>;
  activities: Array<{ id: string; userName: string; action: string; entityType: string; entityId: string; timestamp: string }>;
}

export interface ActivityItem {
  id: string;
  userName: string;
  actionAr: string;
  actionEn: string;
  timestamp: string;
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
  borderColor: string;
}

export interface TeamMember {
  name: string;
  completion: number;
  tasksTotal: number;
  tasksDone: number;
  avatarColor: string;
}

export interface MyTaskItem {
  id: string;
  title: string;
  titleEn: string;
  priority: string;
  status: string;
  dueDate: string | null;
  projectName: string;
  projectNameEn: string;
}

export interface StatCardConfig {
  label: string;
  value: string;
  icon: LucideIcon;
  gradientFrom: string;
  gradientTo: string;
  borderAccent: string;
  bgColor: string;
  iconColor: string;
  trend: {
    value: number;
    label: string;
    isPositive: boolean;
    showArrow?: boolean;
  } | null;
  secondaryBadge: {
    value: number;
    label: string;
    type: "danger";
  } | null;
  valueSuffix?: string;
  valueSub?: string;
}
