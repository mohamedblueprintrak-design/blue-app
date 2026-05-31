/**
 * Leave Requests API hooks
 * Maps to /api/leave endpoint
 */

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api/fetch-client';
import { useAuthStore } from '@/store/auth-store';

export interface LeaveRequest {
  id: string;
  employeeId?: string;
  employeeName?: string;
  type?: string;
  startDate?: Date | string;
  endDate?: Date | string;
  days?: number;
  reason?: string;
  status?: string;
  approvedBy?: string;
  createdAt?: Date | string;
}

export function useLeaveRequests(filters?: Record<string, unknown>) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: ['leave-requests', filters],
    queryFn: () => apiGet<LeaveRequest[]>('/api/leave', filters as Record<string, string | number | boolean | undefined>),
    enabled: isAuthenticated,
  });
}

export function useCreateLeaveRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<LeaveRequest>) =>
      apiPost<LeaveRequest>('/api/leave', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-requests'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useApproveLeaveRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { id: string; action: 'approve' | 'reject'; reason?: string }) =>
      apiPut<LeaveRequest>(`/api/leave/${data.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-requests'] });
    },
  });
}

export function useDeleteLeaveRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiDelete(`/api/leave/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-requests'] });
    },
  });
}
