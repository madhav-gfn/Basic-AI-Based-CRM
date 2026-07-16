const rawApiUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
const browserOrigin =
  typeof window !== 'undefined' ? window.location.origin : undefined;
const localBackendHost = 'http://localhost:3004';

const API_URL = rawApiUrl
  ? rawApiUrl.replace(/\/api\/?$/, "").replace(/\/+$/, "") + '/api'
  : browserOrigin
  ? browserOrigin.includes('localhost:3000')
    ? `${localBackendHost}/api`
    : `${browserOrigin}/api`
  : `${localBackendHost}/api`;

if (typeof window !== 'undefined' && !rawApiUrl) {
  console.warn(
    '[frontend] NEXT_PUBLIC_API_URL is not configured. Using local backend fallback:',
    API_URL
  );
}

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

// ─────────────────────────────────────────────────────────────────────────────
// Ingestion
// ─────────────────────────────────────────────────────────────────────────────

export interface IngestionResponse {
  success: boolean;
  data: {
    total_rows: number;
    ingested: number;
    skipped_invalid: number;
    skipped_duplicates: number;
  };
  message: string;
}

export async function uploadCustomersCsv(file: File): Promise<IngestionResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(buildApiUrl('/ingestion/upload/customers'), {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || body.message || `API error: ${res.status}`);
  }

  return res.json();
}

export async function uploadOrdersCsv(file: File): Promise<IngestionResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(buildApiUrl('/ingestion/upload/orders'), {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || body.message || `API error: ${res.status}`);
  }

  return res.json();
}

// ─────────────────────────────────────────────────────────────────────────────
// AI CSV Import
// ─────────────────────────────────────────────────────────────────────────────

export interface CRMRecord {
  name: string;
  email: string;
  phone: string;
  gender: string;
  city: string;
  signup_date: string;
}

export interface SkippedRecord {
  row_index: number;
  reason: string;
  original_data: Record<string, string>;
}

export interface ImportResult {
  total_rows: number;
  total_imported: number;
  total_skipped: number;
  imported_records: CRMRecord[];
  skipped_records: SkippedRecord[];
  processing_time_ms: number;
  batches_processed: number;
}

export interface ImportResponse {
  success: boolean;
  data: ImportResult;
  message: string;
}

export async function importCSV(file: File): Promise<ImportResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(buildApiUrl('/import/csv'), {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || body.message || `API error: ${res.status}`);
  }

  return res.json();
}

export interface ChunkPayload {
  headers: string[];
  rows: Record<string, string>[];
  startIndex: number;
}

export async function importCSVChunk(payload: ChunkPayload): Promise<ImportResponse> {
  const res = await fetch(buildApiUrl('/import/chunk'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || body.message || `API error: ${res.status}`);
  }

  return res.json();
}
