import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface AudienceDataResponse {
  success: boolean;
  message: string;
}

export interface AISegmentResponse {
  success: boolean;
  suggestedName: string;
  definition: Record<string, any>;
  audienceCount: number;
}

export interface DraftCampaignPayload {
  name: string;
  objective: string;
  audienceId: string;
}

export interface DraftCampaignResponse {
  success: boolean;
  campaignId: string;
  draft: {
    channel: string;
    message: string;
  };
}

export interface ExecuteCampaignResponse {
  success: boolean;
  status: string;
}

export interface CampaignAnalyticsResponse {
  success: boolean;
  data: {
    metrics: {
      audienceSize: number;
      counts: {
        sent: number;
        delivered: number;
        opened: number;
        read: number;
        clicked: number;
        failed: number;
      };
      conversions: number;
      rates: {
        sentRate: number;
        deliveredRate: number;
        openedRate: number;
        readRate: number;
        clickedRate: number;
        failedRate: number;
        conversionRate: number;
      };
    };
    insights?: {
      executiveSummary: string;
      topPerformingMetric: string;
      bottleneck: string;
      recommendedAction: string;
    };
  };
}

export const uploadAudienceData = async (file: File): Promise<AudienceDataResponse> => {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await api.post<AudienceDataResponse>('/audience/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const generateAISegment = async (prompt: string): Promise<AISegmentResponse> => {
  const response = await api.post<AISegmentResponse>('/segments/generate', { prompt });
  return response.data;
};

export const draftCampaign = async (data: DraftCampaignPayload): Promise<DraftCampaignResponse> => {
  const response = await api.post<DraftCampaignResponse>('/campaigns/draft', data);
  return response.data;
};

export const executeCampaign = async (campaignId: string): Promise<ExecuteCampaignResponse> => {
  const response = await api.patch<ExecuteCampaignResponse>(`/campaigns/${campaignId}/status`, {
    status: 'RUNNING'
  });
  return response.data;
};

export const getCampaignAnalytics = async (campaignId: string): Promise<CampaignAnalyticsResponse> => {
  const response = await api.get<CampaignAnalyticsResponse>(`/campaigns/${campaignId}/analytics`);
  return response.data;
};
