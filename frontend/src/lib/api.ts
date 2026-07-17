const rawApiUrl = process.env.NEXT_PUBLIC_API_URL?.trim();

// In the browser, always use relative "/api" so requests go through the
// Next.js rewrite proxy (see next.config.ts).  The proxy forwards them to
// the backend (localhost:3001 in dev, or the production URL).
// On the server side (SSR), use the explicit env var so Node can reach the
// backend directly.
const API_URL =
  typeof window !== 'undefined'
    ? '/api'                              // browser → Next.js proxy
    : rawApiUrl
      ? rawApiUrl.replace(/\/api\/?$/, "").replace(/\/+$/, "") + '/api'
      : 'http://localhost:3001/api';      // SSR fallback


function buildApiUrl(path: string) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_URL}${normalizedPath}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Auth Token Management
// ─────────────────────────────────────────────────────────────────────────────

const TOKEN_KEY = 'moda_auth_token';

export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setAuthToken(token: string | null): void {
  if (typeof window === 'undefined') return;
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Generic fetcher
// ─────────────────────────────────────────────────────────────────────────────

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };

  const res = await fetch(buildApiUrl(path), {
    headers,
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
  consentStatus?: 'OPTED_IN' | 'OPTED_OUT' | 'UNKNOWN';
  tags?: string[];
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

export interface Order {
  id: string;
  customerId: string;
  orderDate: string;
  orderValue: number;
  category: string;
}

export interface CustomerProfile extends Customer {
  orders: Order[];
}

export async function getCustomerProfile(id: string): Promise<{ success: boolean; data: CustomerProfile }> {
  return apiFetch(`/customers/${id}`);
}

export interface CustomerMetrics {
  customerId: string;
  totalOrders: number;
  lifetimeSpend: number;
  averageOrderValue: number;
  lastPurchaseDate: string | null;
}

export async function getCustomerMetrics(id: string): Promise<{ success: boolean; data: CustomerMetrics }> {
  return apiFetch(`/customers/${id}/metrics`);
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

export async function getCampaignById(id: string): Promise<{ success: boolean; data: Campaign }> {
  return apiFetch(`/campaigns/${id}`);
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
  scheduledAt?: string | null,
  message?: string
): Promise<UpdateStatusResponse> {
  return apiFetch(`/campaigns/${campaignId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status, scheduledAt, message }),
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

export interface VariantMetrics {
  variantId: string;
  label: string;
  audienceSize: number;
  counts: {
    sent: number;
    delivered: number;
    opened: number;
    read: number;
    clicked: number;
    failed: number;
  };
  rates: {
    deliveredRate: number;
    openedRate: number;
    clickedRate: number;
  };
}

export interface AnalyticsResponse {
  success: boolean;
  data: {
    metrics: CampaignMetrics;
    insights: CampaignInsights | null;
    variantBreakdown: VariantMetrics[];
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

// ─────────────────────────────────────────────────────────────────────────────
// Message Templates
// ─────────────────────────────────────────────────────────────────────────────

export interface MessageTemplate {
  id: string;
  name: string;
  channel: string;
  body: string;
  description: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  tokens?: string[];
}

export async function getTemplates(channel?: string): Promise<{ success: boolean; data: MessageTemplate[] }> {
  const qs = channel ? `?channel=${encodeURIComponent(channel)}` : '';
  return apiFetch(`/templates${qs}`);
}

export async function createTemplate(payload: {
  name: string;
  channel: string;
  body: string;
  description?: string;
}): Promise<{ success: boolean; data: MessageTemplate }> {
  return apiFetch('/templates', { method: 'POST', body: JSON.stringify(payload) });
}

export async function updateTemplate(
  id: string,
  payload: Partial<{ name: string; channel: string; body: string; description: string }>
): Promise<{ success: boolean; data: MessageTemplate }> {
  return apiFetch(`/templates/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });
}

export async function deleteTemplate(id: string): Promise<{ success: boolean }> {
  return apiFetch(`/templates/${id}`, { method: 'DELETE' });
}

// ─────────────────────────────────────────────────────────────────────────────
// Customer search & activity
// ─────────────────────────────────────────────────────────────────────────────

export async function searchCustomers(params: {
  q?: string;
  city?: string;
  gender?: string;
  tag?: string;
  page?: number;
  limit?: number;
}): Promise<CustomersResponse> {
  const qs = new URLSearchParams();
  if (params.q) qs.set('q', params.q);
  if (params.city) qs.set('city', params.city);
  if (params.gender) qs.set('gender', params.gender);
  if (params.tag) qs.set('tag', params.tag);
  qs.set('page', String(params.page ?? 1));
  qs.set('limit', String(params.limit ?? 20));
  return apiFetch(`/customers/search?${qs.toString()}`);
}

export interface ActivityEntry {
  type: 'order' | 'communication';
  timestamp: string;
  title: string;
  detail: string;
  status?: string;
}

export async function getCustomerActivity(
  id: string,
  limit = 50
): Promise<{ success: boolean; data: ActivityEntry[] }> {
  return apiFetch(`/customers/${id}/activity?limit=${limit}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Consent
// ─────────────────────────────────────────────────────────────────────────────

export async function updateConsent(
  customerId: string,
  consentStatus: 'OPTED_IN' | 'OPTED_OUT' | 'UNKNOWN'
): Promise<{ success: boolean; data: Customer }> {
  return apiFetch(`/consent/${customerId}`, {
    method: 'PATCH',
    body: JSON.stringify({ consentStatus }),
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Auth
// ─────────────────────────────────────────────────────────────────────────────

export interface AuthResponse {
  success: boolean;
  data: {
    token: string;
    user: {
      id: string;
      email: string;
      name: string;
      role: string;
      organizationId: string;
    };
  };
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  const res = await apiFetch<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  if (res.data?.token) setAuthToken(res.data.token);
  return res;
}

export async function register(data: {
  email: string;
  password: string;
  name: string;
  organizationName: string;
}): Promise<AuthResponse> {
  const res = await apiFetch<AuthResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (res.data?.token) setAuthToken(res.data.token);
  return res;
}

export async function getMe(): Promise<{ success: boolean; data: AuthResponse['data']['user'] }> {
  return apiFetch('/auth/me');
}

/** Clears the stored session token. No server round-trip — JWTs are stateless. */
export function logout(): void {
  setAuthToken(null);
}

// ─────────────────────────────────────────────────────────────────────────────
// Campaign Variants
// ─────────────────────────────────────────────────────────────────────────────

export interface CampaignVariant {
  id: string;
  campaignId: string;
  label: string;
  message: string;
  weight: number;
  createdAt: string;
}

export async function getCampaignVariants(
  campaignId: string
): Promise<{ success: boolean; data: CampaignVariant[] }> {
  return apiFetch(`/campaigns/${campaignId}/variants`);
}

export async function addCampaignVariant(
  campaignId: string,
  payload: { label: string; message: string; weight?: number }
): Promise<{ success: boolean; data: CampaignVariant }> {
  return apiFetch(`/campaigns/${campaignId}/variants`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function deleteCampaignVariant(
  campaignId: string,
  variantId: string
): Promise<{ success: boolean }> {
  return apiFetch(`/campaigns/${campaignId}/variants/${variantId}`, {
    method: 'DELETE',
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Journeys (trigger-based automation)
// ─────────────────────────────────────────────────────────────────────────────

export type JourneyTriggerType = 'CUSTOMER_CREATED' | 'ORDER_PLACED' | 'SEGMENT_ENTRY';
export type JourneyStatus = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'ARCHIVED';
export type EnrollmentStatus = 'ACTIVE' | 'COMPLETED' | 'EXITED';

export interface JourneyStep {
  id: string;
  journeyId: string;
  order: number;
  delayHours: number;
  channel: string;
  message: string;
}

export interface Journey {
  id: string;
  name: string;
  status: JourneyStatus;
  triggerType: JourneyTriggerType;
  triggerSegmentId: string | null;
  triggerSegment?: { id?: string; name: string } | null;
  lastScanAt: string | null;
  createdAt: string;
  updatedAt: string;
  steps?: JourneyStep[];
  _count?: { steps: number; enrollments: number };
  activeEnrollments?: number;
  enrollmentStats?: Record<EnrollmentStatus, number>;
}

export interface JourneyEnrollment {
  id: string;
  journeyId: string;
  customerId: string;
  status: EnrollmentStatus;
  currentStepIndex: number;
  nextStepDueAt: string | null;
  enrolledAt: string;
  completedAt: string | null;
  exitedAt: string | null;
  customer?: { name: string; email: string };
}

export interface CreateJourneyPayload {
  name: string;
  triggerType: JourneyTriggerType;
  triggerSegmentId?: string;
  steps: { delayHours: number; channel: string; message: string }[];
}

export async function getJourneys(): Promise<{ success: boolean; data: Journey[] }> {
  return apiFetch('/journeys');
}

export async function getJourney(id: string): Promise<{ success: boolean; data: Journey }> {
  return apiFetch(`/journeys/${id}`);
}

export async function createJourney(
  payload: CreateJourneyPayload
): Promise<{ success: boolean; data: Journey }> {
  return apiFetch('/journeys', { method: 'POST', body: JSON.stringify(payload) });
}

export async function updateJourneyStatus(
  id: string,
  status: JourneyStatus
): Promise<{ success: boolean; data: Journey }> {
  return apiFetch(`/journeys/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

export async function getJourneyEnrollments(
  id: string
): Promise<{ success: boolean; data: JourneyEnrollment[] }> {
  return apiFetch(`/journeys/${id}/enrollments`);
}
