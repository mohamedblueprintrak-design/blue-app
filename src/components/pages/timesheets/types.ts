export interface TimesheetEntry {
  id: string;
  date: string;
  hours: number;
  taskType: string;
  description: string;
  projectId: string | null;
  project?: { id: string; name: string; nameEn: string } | null;
}

export interface Timesheet {
  id: string;
  employeeId: string;
  projectId: string | null;
  weekStart: string;
  weekEnd: string;
  status: string;
  totalHours: number;
  notes: string | null;
  rejectedReason: string | null;
  approvedById: string | null;
  approvedAt: string | null;
  submittedAt: string | null;
  createdAt: string;
  updatedAt: string;
  employee: {
    id: string;
    userId: string;
    department: string;
    position: string;
    user: { id: string; name: string; email: string; avatar: string };
  };
  project: { id: string; name: string; nameEn: string; number: string } | null;
  approvedBy: { id: string; name: string; avatar: string } | null;
  entries: TimesheetEntry[];
}

export interface Summary {
  thisWeekHours: number;
  pending: number;
  approved: number;
  rejected: number;
}

export interface EmployeeOption {
  id: string;
  user: { id: string; name: string; email: string };
  department: string;
  position: string;
}

export interface ProjectOption {
  id: string;
  name: string;
  nameEn: string;
  number: string;
}

export interface FormEntry {
  date: string;
  hours: number;
  taskType: string;
  description: string;
  projectId: string | null;
}
