/**
 * Dashboard API hooks
 */

'use client';

import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api/fetch-client';
import { useAuthStore } from '@/store/auth-store';

export interface DashboardStats {
  totalProjects?: number;
  activeProjects?: number;
  totalTasks?: number;
  pendingTasks?: number;
  totalClients?: number;
  totalRevenue?: number;
  pendingInvoices?: number;
  totalEmployees?: number;
  overdueTasks?: number;
  openDefects?: number;
}

export function useDashboard() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: () => apiGet<DashboardStats>('/api/dashboard'),
    enabled: isAuthenticated,
  });
}
