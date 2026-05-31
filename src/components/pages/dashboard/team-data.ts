import type { DepartmentProgressItem, TeamMember } from "./types";

// ===== Team Performance Data (derived from departmentProgress API data) =====

export function getTeamPerformance(departmentProgress: DepartmentProgressItem[], isAr: boolean): TeamMember[] {
  if (departmentProgress && departmentProgress.length > 0) {
    return departmentProgress.map((dept) => ({
      name: isAr ? dept.labelAr : dept.labelEn,
      completion: dept.progress,
      tasksTotal: dept.total,
      tasksDone: dept.completed,
      avatarColor: "",
    }));
  }
  // No department data available from the API
  return [];
}
