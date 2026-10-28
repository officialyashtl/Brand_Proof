/**
 * BrandProof API Client
 *
 * Connects the Next.js frontend to the FastAPI backend.
 * Uses strict contracts matching backend/app/models.py.
 */

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

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
  constructor(message: string, status?: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

/**
 * Submit marketing content for deterministic brand compliance review.
 */
export async function createReview(
  payload: ReviewRequest
): Promise<ReviewResponse> {
  const url = `${API_BASE_URL}/api/reviews`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
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
      throw new ApiError(errorMsg, res.status);
    }

    return (await res.json()) as ReviewResponse;
  } catch (err: unknown) {
    if (err instanceof ApiError) {
      throw err;
    }
    const message =
      err instanceof Error && err.message
        ? err.message
        : "Failed to connect to backend server";
    throw new ApiError(
      `Unable to connect to BrandProof API at ${API_BASE_URL}. Ensure the backend service is running on http://127.0.0.1:8000. (${message})`
    );
  }
}

/**
 * Record a human decision (accept/reject) on a specific finding within a review.
 */
export async function submitDecision(
  reviewId: string,
  payload: DecisionRequest
): Promise<ReviewResponse> {
  const url = `${API_BASE_URL}/api/reviews/${encodeURIComponent(
    reviewId
  )}/decision`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
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
      throw new ApiError(errorMsg, res.status);
    }

    return (await res.json()) as ReviewResponse;
  } catch (err: unknown) {
    if (err instanceof ApiError) {
      throw err;
    }
    const message =
      err instanceof Error && err.message
        ? err.message
        : "Failed to connect to backend server";
    throw new ApiError(
      `Unable to connect to BrandProof API at ${API_BASE_URL}. (${message})`
    );
  }
}

/**
 * Fetch an existing review with its recorded decisions.
 */
export async function getReview(reviewId: string): Promise<ReviewResponse> {
  const url = `${API_BASE_URL}/api/reviews/${encodeURIComponent(reviewId)}`;
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      throw new ApiError(`Review not found or server error (${res.status})`, res.status);
    }

    return (await res.json()) as ReviewResponse;
  } catch (err: unknown) {
    if (err instanceof ApiError) {
      throw err;
    }
    throw new ApiError(
      `Unable to connect to BrandProof API at ${API_BASE_URL}.`
    );
  }
}

/**
 * Fetch all saved reviews from the backend review history.
 */
export async function getReviews(
  limit = 50,
  offset = 0
): Promise<ReviewResponse[]> {
  const url = `${API_BASE_URL}/api/reviews?limit=${limit}&offset=${offset}`;
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
        res.status
      );
    }

    return (await res.json()) as ReviewResponse[];
  } catch (err: unknown) {
    if (err instanceof ApiError) {
      throw err;
    }
    const message =
      err instanceof Error && err.message
        ? err.message
        : "Failed to connect to backend server";
    throw new ApiError(
      `Unable to connect to BrandProof API at ${API_BASE_URL}. (${message})`
    );
  }
}

