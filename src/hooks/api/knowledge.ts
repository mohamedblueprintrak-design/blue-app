/**
 * Knowledge Base API hooks
 */

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api/fetch-client';
import { useAuthStore } from '@/store/auth-store';

export interface KnowledgeArticleItem {
  id: string;
  title?: string;
  content?: string;
  category?: 'guide' | 'faq' | 'policy' | 'template';
  tags?: string[];
  authorId?: string;
  isPublished?: boolean;
  viewCount?: number;
  helpfulCount?: number;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export function useKnowledgeArticles(filters?: Record<string, unknown>) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: ['knowledge', filters],
    queryFn: () => apiGet<KnowledgeArticleItem[]>('/api/knowledge', filters as Record<string, string | number | boolean | undefined>),
    enabled: isAuthenticated,
  });
}

export function useKnowledgeArticle(id: string | null) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: ['knowledge', id],
    queryFn: () => apiGet<KnowledgeArticleItem>(`/api/knowledge/${id}`),
    enabled: isAuthenticated && !!id,
  });
}

export function useCreateKnowledgeArticle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<KnowledgeArticleItem>) =>
      apiPost<KnowledgeArticleItem>('/api/knowledge', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge'] });
    },
  });
}

export function useUpdateKnowledgeArticle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { id: string } & Partial<KnowledgeArticleItem>) =>
      apiPut<KnowledgeArticleItem>(`/api/knowledge/${data.id}`, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['knowledge'] });
      queryClient.invalidateQueries({ queryKey: ['knowledge', variables.id] });
    },
  });
}

export function useDeleteKnowledgeArticle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiDelete(`/api/knowledge/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge'] });
    },
  });
}

export function useMarkArticleHelpful() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/knowledge/${id}/helpful`, { method: 'POST', credentials: 'include' }).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge'] });
    },
  });
}
