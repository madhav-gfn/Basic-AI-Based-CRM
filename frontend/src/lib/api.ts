const rawApiUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
const API_ROOT = rawApiUrl
  ? rawApiUrl.replace(/\/api\/?$/, "").replace(/\/+$/, "")
  : 'http://localhost:3001';
const API_URL = `${API_ROOT}/api`;

function buildApiUrl(path: string) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_URL}${normalizedPath}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Generic fetcher
// ─────────────────────────────────────────────────────────────────────────────

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(buildApiUrl(path), {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || body.message || `API error: ${res.status}`);
  }

  return res.json();
}

// ─────────────────────────────────────────────────────────────────────────────
// Dashboard
// ─────────────────────────────────────────────────────────────────────────────

export interface DashboardStats {
  success: boolean;
  data: {
    totalCustomers: number;
    totalOrders: number;
    totalCampaigns: number;
    totalSegments: number;
    totalRevenue: number;
    recentCampaigns: Campaign[];
  };
}

export async function getDashboardStats(): Promise<DashboardStats> {
  return apiFetch('/customers/dashboard');
}

// ─────────────────────────────────────────────────────────────────────────────
// Customers
// ─────────────────────────────────────────────────────────────────────────────

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  gender: string | null;
  city: string | null;
  signupDate: string;
  _count?: { orders: number };
}

export interface CustomersResponse {
  success: boolean;
  data: {
    customers: Customer[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  };
}

export async function getCustomers(page = 1, limit = 20): Promise<CustomersResponse> {
  return apiFetch(`/customers?page=${page}&limit=${limit}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Segments
// ─────────────────────────────────────────────────────────────────────────────

export interface Segment {
  id: string;
  name: string;
  definition: Record<string, any>;
  createdBy: string;
  createdAt: string;
}

export interface SegmentsResponse {
  success: boolean;
  data: Segment[];
}

export async function getSegments(): Promise<SegmentsResponse> {
  return apiFetch('/segments');
}

export interface CreateSegmentPayload {
  name: string;
  filters: Record<string, any>;
  createdBy?: string;
}

export interface CreateSegmentResponse {
  success: boolean;
  data: {
    segment: Segment;
    audienceCount: number;
  };
}

export async function createSegment(payload: CreateSegmentPayload): Promise<CreateSegmentResponse> {
  return apiFetch('/segments', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// AI
// ─────────────────────────────────────────────────────────────────────────────

export interface AISegmentResponse {
  success: boolean;
  data: {
    filters: Record<string, any>;
    explanation: string;
    audienceCount: number;
  };
}

export async function suggestSegment(prompt: string): Promise<AISegmentResponse> {
  return apiFetch('/ai/segment-suggest', {
    method: 'POST',
    body: JSON.stringify({ prompt }),
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Campaigns
// ─────────────────────────────────────────────────────────────────────────────

export interface Campaign {
  id: string;
  name: string;
  audienceId: string;
  channel: string;
  objective: string | null;
  status: string;
  message: string | null;
  createdAt: string;
  launchedAt: string | null;
  scheduledAt: string | null;
  audience?: { name: string };
}

export interface CampaignsResponse {
  success: boolean;
  data: Campaign[];
}

export async function getCampaigns(): Promise<CampaignsResponse> {
  return apiFetch('/campaigns');
}

export interface DraftCampaignPayload {
  name: string;
  objective: string;
  audienceId: string;
}

export interface DraftCampaignResponse {
  success: boolean;
  data: {
    campaign: Campaign;
    audienceMetrics: {
      audienceSize: number;
      totalRevenue: number;
      averageOrderValue: number;
    };
    aiExplanation: string;
  };
}

export async function draftCampaign(payload: DraftCampaignPayload): Promise<DraftCampaignResponse> {
  return apiFetch('/campaigns/draft', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export interface UpdateStatusResponse {
  success: boolean;
  data: Campaign;
}

export async function updateCampaignStatus(
  campaignId: string,
  status: string,
  scheduledAt?: string | null
): Promise<UpdateStatusResponse> {
  return apiFetch(`/campaigns/${campaignId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status, scheduledAt }),
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Analytics
// ─────────────────────────────────────────────────────────────────────────────

export interface CampaignMetrics {
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
}

export interface CampaignInsights {
  executiveSummary: string;
  topPerformingMetric: string;
  bottleneck: string;
  recommendedAction: string;
}

export interface AnalyticsResponse {
  success: boolean;
  data: {
    metrics: CampaignMetrics;
    insights: CampaignInsights | null;
  };
}

export async function getCampaignAnalytics(campaignId: string): Promise<AnalyticsResponse> {
  return apiFetch(`/campaigns/${campaignId}/analytics`);
}
