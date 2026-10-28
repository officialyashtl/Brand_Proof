/**
 * BrandProof API Client
 *
 * Connects the Next.js frontend to the FastAPI backend.
 * Uses strict contracts matching backend/app/models.py.
 */

// Normalize API base URL: remove trailing slashes to prevent double slashes in paths
const rawBaseUrl =
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
export const API_BASE_URL = rawBaseUrl.replace(/\/+$/, "");

export type Channel = "social" | "website" | "email" | "advertisement";
export type Severity = "high" | "medium" | "low";
export type EvidenceStatus = "found" | "partial" | "not_found";
export type FindingType =
  | "absolute_guarantee"
  | "clinical_claim"
  | "superlative_ranking"
  | "customer_count"
  | "vague_superlative"
  | "comparative_claim"
  | "prohibited_term"
  | string;

export type DecisionAction = "accepted" | "rejected";

export interface Finding {
  id: string;
  type: FindingType;
  severity: Severity;
  text: string;
  reason: string;
  evidence_status: EvidenceStatus;
  source_ids: string[];
  suggestion: string;
}

export interface HumanDecision {
  finding_id: string;
  action: DecisionAction;
  note?: string | null;
  decided_at: string;
}

export interface ReviewRequest {
  content: string;
  channel: Channel;
  brand_id?: string;
}

export interface DecisionRequest {
  finding_id: string;
  action: DecisionAction;
  note?: string | null;
}

export interface ReviewResponse {
  review_id: string;
  brand_id: string;
  channel: Channel;
  status: "completed" | "pending";
  analysis_mode: "rule_based_demo";
  findings: Finding[];
  human_decisions: HumanDecision[];
  created_at?: string | null;
  content?: string | null;
}

export interface GuidelineItem {
  id: string;
  name: string;
  severity: Severity;
  category: string;
  description: string;
}

export interface GuidelinesResponse {
  guidelines: GuidelineItem[];
  total: number;
}

export interface MetricsResponse {
  total_reviews: number;
  total_findings: number;
  total_decisions: number;
  accepted_decisions: number;
  rejected_decisions: number;
  compliance_score?: number;
}

/**
 * Human-readable labels for finding types.
 */
export const FINDING_TYPE_LABELS: Record<string, string> = {
  absolute_guarantee: "Absolute Guarantee Claim",
  clinical_claim: "Unsubstantiated Clinical Claim",
  superlative_ranking: "Superlative / Ranking Claim",
  customer_count: "Unverified Customer Count",
  vague_superlative: "Vague Superlative Language",
  comparative_claim: "Comparative Superiority Claim",
  prohibited_term: "Prohibited Terminology",
};

export class ApiError extends Error {
  status?: number;
  isNetworkError?: boolean;
  endpoint?: string;

  constructor(
    message: string,
    status?: number,
    isNetworkError = false,
    endpoint?: string
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.isNetworkError = isNetworkError;
    this.endpoint = endpoint;
  }
}

/**
 * Build a helpful, diagnostic error message for network/CORS failures.
 */
function handleNetworkError(err: unknown, endpoint: string): never {
  if (err instanceof ApiError) {
    throw err;
  }

  const rawMsg = err instanceof Error ? err.message : String(err);
  const isCORSOrNetwork =
    rawMsg.includes("Failed to fetch") ||
    rawMsg.includes("NetworkError") ||
    rawMsg.includes("fetch failed") ||
    rawMsg.includes("Load failed");

  let diagnostic: string;
  if (isCORSOrNetwork) {
    const isLocalhost =
      API_BASE_URL.includes("localhost") || API_BASE_URL.includes("127.0.0.1");

    if (isLocalhost) {
      diagnostic =
        `Failed to reach local backend at ${API_BASE_URL}${endpoint}. ` +
        `Please ensure the FastAPI service is running locally on port 8000 (e.g., uvicorn app.main:app --port 8000).`;
    } else {
      diagnostic =
        `Failed to reach BrandProof API at ${API_BASE_URL}${endpoint} (${rawMsg}). ` +
        `This typically indicates: 1) A CORS origin restriction blocking requests from this domain; ` +
        `or 2) The Render backend is currently waking up from an idle spin-down (which can take 30–60s on free tiers). ` +
        `Please verify that the backend is active at ${API_BASE_URL}/health.`;
    }
  } else {
    diagnostic = `Network request to ${API_BASE_URL}${endpoint} failed: ${rawMsg}`;
  }

  throw new ApiError(diagnostic, undefined, true, endpoint);
}

/**
 * Submit marketing content for deterministic brand compliance review.
 */
export async function createReview(
  payload: ReviewRequest
): Promise<ReviewResponse> {
  const endpoint = "/api/reviews";
  const url = `${API_BASE_URL}${endpoint}`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        content: payload.content,
        channel: payload.channel,
        brand_id: payload.brand_id || "demo-brand",
      }),
    });

    if (!res.ok) {
      let errorMsg = `Server error (${res.status})`;
      try {
        const errorJson = await res.json();
        if (errorJson.detail) {
          if (typeof errorJson.detail === "string") {
            errorMsg = errorJson.detail;
          } else if (Array.isArray(errorJson.detail)) {
            errorMsg = errorJson.detail
              .map((d: { msg?: string }) => d.msg || JSON.stringify(d))
              .join(", ");
          }
        }
      } catch {
        // use fallback errorMsg
      }
      throw new ApiError(errorMsg, res.status, false, endpoint);
    }

    return (await res.json()) as ReviewResponse;
  } catch (err: unknown) {
    handleNetworkError(err, endpoint);
  }
}

/**
 * Record a human decision (accept/reject) on a specific finding within a review.
 */
export async function submitDecision(
  reviewId: string,
  payload: DecisionRequest
): Promise<ReviewResponse> {
  const endpoint = `/api/reviews/${encodeURIComponent(reviewId)}/decision`;
  const url = `${API_BASE_URL}${endpoint}`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        finding_id: payload.finding_id,
        action: payload.action,
        note: payload.note ?? null,
      }),
    });

    if (!res.ok) {
      let errorMsg = `Server error (${res.status})`;
      try {
        const errorJson = await res.json();
        if (errorJson.detail) {
          errorMsg =
            typeof errorJson.detail === "string"
              ? errorJson.detail
              : JSON.stringify(errorJson.detail);
        }
      } catch {
        // fallback
      }
      throw new ApiError(errorMsg, res.status, false, endpoint);
    }

    return (await res.json()) as ReviewResponse;
  } catch (err: unknown) {
    handleNetworkError(err, endpoint);
  }
}

/**
 * Fetch an existing review with its recorded decisions.
 */
export async function getReview(reviewId: string): Promise<ReviewResponse> {
  const endpoint = `/api/reviews/${encodeURIComponent(reviewId)}`;
  const url = `${API_BASE_URL}${endpoint}`;
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      throw new ApiError(
        `Review not found or server error (${res.status})`,
        res.status,
        false,
        endpoint
      );
    }

    return (await res.json()) as ReviewResponse;
  } catch (err: unknown) {
    handleNetworkError(err, endpoint);
  }
}

/**
 * Fetch all saved reviews from the backend review history.
 */
export async function getReviews(
  limit = 50,
  offset = 0
): Promise<ReviewResponse[]> {
  const endpoint = `/api/reviews?limit=${limit}&offset=${offset}`;
  const url = `${API_BASE_URL}${endpoint}`;
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      throw new ApiError(
        `Failed to fetch review history (${res.status})`,
        res.status,
        false,
        endpoint
      );
    }

    return (await res.json()) as ReviewResponse[];
  } catch (err: unknown) {
    handleNetworkError(err, endpoint);
  }
}

/**
 * Fetch active brand guidelines and compliance rules.
 */
export async function getGuidelines(): Promise<GuidelinesResponse> {
  const endpoint = "/api/guidelines";
  const url = `${API_BASE_URL}${endpoint}`;
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      throw new ApiError(
        `Failed to fetch guidelines (${res.status})`,
        res.status,
        false,
        endpoint
      );
    }

    return (await res.json()) as GuidelinesResponse;
  } catch (err: unknown) {
    handleNetworkError(err, endpoint);
  }
}

/**
 * Fetch workspace compliance metrics calculated from review history.
 */
export async function getMetrics(): Promise<MetricsResponse> {
  const endpoint = "/api/metrics";
  const url = `${API_BASE_URL}${endpoint}`;
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      throw new ApiError(
        `Failed to fetch metrics (${res.status})`,
        res.status,
        false,
        endpoint
      );
    }

    return (await res.json()) as MetricsResponse;
  } catch (err: unknown) {
    handleNetworkError(err, endpoint);
  }
}

/**
 * Health check endpoint for service status verification.
 */
export async function checkHealth(): Promise<{ status: string; service: string }> {
  const endpoint = "/health";
  const url = `${API_BASE_URL}${endpoint}`;
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      throw new ApiError(
        `Health check failed (${res.status})`,
        res.status,
        false,
        endpoint
      );
    }

    return (await res.json()) as { status: string; service: string };
  } catch (err: unknown) {
    handleNetworkError(err, endpoint);
  }
}
