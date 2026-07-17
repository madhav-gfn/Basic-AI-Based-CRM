import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getDashboardStats,
  getCampaigns,
  getCampaignAnalytics,
  getSegments,
  getCustomers,
  getTemplates,
  createSegment,
  draftCampaign,
  updateCampaignStatus,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  searchCustomers,
  type CreateSegmentPayload,
  type DraftCampaignPayload,
} from './api';

// ─────────────────────────────────────────────────────────────────────────────
// Query Hooks
// ─────────────────────────────────────────────────────────────────────────────

export function useDashboard() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: getDashboardStats,
  });
}

export function useCampaigns() {
  return useQuery({
    queryKey: ['campaigns'],
    queryFn: getCampaigns,
  });
}

export function useCampaignAnalytics(campaignId: string | undefined) {
  return useQuery({
    queryKey: ['campaign-analytics', campaignId],
    queryFn: () => getCampaignAnalytics(campaignId!),
    enabled: !!campaignId,
  });
}

export function useSegments() {
  return useQuery({
    queryKey: ['segments'],
    queryFn: getSegments,
  });
}

export function useCustomers(page = 1, limit = 20) {
  return useQuery({
    queryKey: ['customers', page, limit],
    queryFn: () => getCustomers(page, limit),
  });
}

export function useCustomerSearch(params: {
  q?: string;
  city?: string;
  gender?: string;
  tag?: string;
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: ['customer-search', params],
    queryFn: () => searchCustomers(params),
    enabled: !!(params.q || params.city || params.gender || params.tag),
  });
}

export function useTemplates(channel?: string) {
  return useQuery({
    queryKey: ['templates', channel],
    queryFn: () => getTemplates(channel),
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Mutation Hooks
// ─────────────────────────────────────────────────────────────────────────────

export function useCreateSegment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateSegmentPayload) => createSegment(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['segments'] });
    },
  });
}

export function useDraftCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: DraftCampaignPayload) => draftCampaign(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['campaigns'] });
    },
  });
}

export function useUpdateCampaignStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ campaignId, status, scheduledAt }: {
      campaignId: string;
      status: string;
      scheduledAt?: string | null;
    }) => updateCampaignStatus(campaignId, status, scheduledAt),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['campaigns'] });
    },
  });
}

export function useCreateTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { name: string; channel: string; body: string; description?: string }) =>
      createTemplate(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['templates'] });
    },
  });
}

export function useUpdateTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }: {
      id: string;
      name?: string;
      channel?: string;
      body?: string;
      description?: string;
    }) => updateTemplate(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['templates'] });
    },
  });
}

export function useDeleteTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteTemplate(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['templates'] });
    },
  });
}
