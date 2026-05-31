/**
 * Municipality Correspondence API hooks
 * Maps to /api/municipality-correspondence endpoint
 */

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, apiDelete } from '@/lib/api/fetch-client';
import { useAuthStore } from '@/store/auth-store';

export interface CorrespondenceRecord {
  id: string;
  projectId?: string;
  projectName?: string;
  referenceNumber?: string;
  type?: string;
  status?: string;
  subject?: string;
  sentDate?: Date | string;
  receivedDate?: Date | string;
  description?: string;
  createdAt?: Date | string;
}

export function useCorrespondence(filters?: Record<string, unknown>) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: ['correspondence', filters],
    queryFn: () => apiGet<CorrespondenceRecord[]>('/api/municipality-correspondence', filters as Record<string, string | number | boolean | undefined>),
    enabled: isAuthenticated,
  });
}

export function useCreateCorrespondence() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<CorrespondenceRecord>) =>
      apiPost<CorrespondenceRecord>('/api/municipality-correspondence', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['correspondence'] });
    },
  });
}

export function useDeleteCorrespondence() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiDelete(`/api/municipality-correspondence/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['correspondence'] });
    },
  });
}
