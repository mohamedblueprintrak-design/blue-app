// ===== Types =====
export interface EmployeeUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar: string;
  role: string;
  isActive: boolean;
  department?: string;
  position?: string;
}

export interface Employee {
  id: string;
  userId: string;
  department: string;
  position: string;
  salary: number;
  employmentStatus: string;
  hireDate: string | null;
  createdAt: string;
  user: EmployeeUser;
}

export interface UserOption {
  id: string;
  name: string;
  email: string;
}

// ===== Helpers =====
export function getStatusConfig(status: string) {
  const configs: Record<string, { ar: string; en: string; color: string }> = {
    ACTIVE: { ar: "نشط", en: "Active", color: "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300" },
    ON_LEAVE: { ar: "إجازة", en: "On Leave", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300" },
    TERMINATED: { ar: "منتهي", en: "Terminated", color: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300" },
  };
  return configs[status] || configs.ACTIVE;
}

export function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n.charAt(0))
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export const departmentColors: Record<string, string> = {
  "الهندسة المعمارية": "bg-violet-500",
  "الهندسة الإنشائية": "bg-blue-500",
  "الهندسة الكهربائية": "bg-amber-500",
  "الهندسة الميكانيكية": "bg-teal-500",
  "الإدارة": "bg-slate-500",
  "المالية": "bg-green-500",
  "الموارد البشرية": "bg-rose-500",
  "Architecture": "bg-violet-500",
  "Structural": "bg-blue-500",
  "Electrical": "bg-amber-500",
  "Mechanical": "bg-teal-500",
  "Management": "bg-slate-500",
  "Finance": "bg-green-500",
  "HR": "bg-rose-500",
};

export const skillTags: Record<string, { color: string }> = {
  "AutoCAD": { color: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300" },
  "Revit": { color: "bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300" },
  "Primavera": { color: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300" },
  "Excel": { color: "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300" },
  "Project Management": { color: "bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-300" },
};
