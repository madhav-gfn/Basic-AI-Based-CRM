import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getDashboardStats,
  getCampaigns,
  getCampaignById,
  getCampaignAnalytics,
  getSegments,
  getCustomers,
  getCustomerProfile,
  getCustomerMetrics,
  getCustomerActivity,
  getTemplates,
  createSegment,
  draftCampaign,
  updateCampaignStatus,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  searchCustomers,
  updateConsent,
  getCampaignVariants,
  addCampaignVariant,
  deleteCampaignVariant,
  getJourneys,
  getJourney,
  getJourneyEnrollments,
  createJourney,
  updateJourneyStatus,
  type CreateSegmentPayload,
  type DraftCampaignPayload,
  type CreateJourneyPayload,
  type JourneyStatus,
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

export function useCampaign(id: string | undefined) {
  return useQuery({
    queryKey: ['campaign', id],
    queryFn: () => getCampaignById(id!),
    enabled: !!id,
  });
}

export function useCustomerProfile(id: string | undefined) {
  return useQuery({
    queryKey: ['customer-profile', id],
    queryFn: () => getCustomerProfile(id!),
    enabled: !!id,
  });
}

export function useCustomerMetrics(id: string | undefined) {
  return useQuery({
    queryKey: ['customer-metrics', id],
    queryFn: () => getCustomerMetrics(id!),
    enabled: !!id,
  });
}

export function useCustomerActivity(id: string | undefined) {
  return useQuery({
    queryKey: ['customer-activity', id],
    queryFn: () => getCustomerActivity(id!),
    enabled: !!id,
  });
}

export function useCampaignVariants(campaignId: string | undefined) {
  return useQuery({
    queryKey: ['campaign-variants', campaignId],
    queryFn: () => getCampaignVariants(campaignId!),
    enabled: !!campaignId,
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

export function useUpdateConsent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ customerId, consentStatus }: {
      customerId: string;
      consentStatus: 'OPTED_IN' | 'OPTED_OUT' | 'UNKNOWN';
    }) => updateConsent(customerId, consentStatus),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['customers'] });
      qc.invalidateQueries({ queryKey: ['customer-search'] });
      qc.invalidateQueries({ queryKey: ['customer-profile', variables.customerId] });
    },
  });
}

export function useAddCampaignVariant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ campaignId, ...payload }: {
      campaignId: string;
      label: string;
      message: string;
      weight?: number;
    }) => addCampaignVariant(campaignId, payload),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['campaign-variants', variables.campaignId] });
    },
  });
}

export function useDeleteCampaignVariant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ campaignId, variantId }: { campaignId: string; variantId: string }) =>
      deleteCampaignVariant(campaignId, variantId),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['campaign-variants', variables.campaignId] });
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Journeys
// ─────────────────────────────────────────────────────────────────────────────

export function useJourneys() {
  return useQuery({
    queryKey: ['journeys'],
    queryFn: getJourneys,
  });
}

export function useJourney(id: string | undefined) {
  return useQuery({
    queryKey: ['journey', id],
    queryFn: () => getJourney(id!),
    enabled: !!id,
  });
}

export function useJourneyEnrollments(id: string | undefined) {
  return useQuery({
    queryKey: ['journey-enrollments', id],
    queryFn: () => getJourneyEnrollments(id!),
    enabled: !!id,
  });
}

export function useCreateJourney() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateJourneyPayload) => createJourney(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['journeys'] });
    },
  });
}

export function useUpdateJourneyStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: JourneyStatus }) =>
      updateJourneyStatus(id, status),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['journeys'] });
      qc.invalidateQueries({ queryKey: ['journey', variables.id] });
    },
  });
}
