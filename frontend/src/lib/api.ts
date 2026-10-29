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

export interface QuestionRequest {
  question: string;
  finding_id?: string | null;
}

export interface QuestionResponse {
  review_id: string;
  finding_id?: string | null;
  question: string;
  answer: string;
  related_rule_ids: string[];
  related_finding_ids: string[];
  suggested_next_steps: string[];
  source: "gemini_ai" | "deterministic_fallback";
  model_name?: string | null;
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
    diagnostic =
      "Unable to connect to the compliance review service. " +
      "Please check your network connection or try again in a few moments.";
  } else {
    diagnostic = `Service request failed: ${rawMsg}`;
  }

  // Developer diagnostics logged to console only, not presented in user-facing UI strings
  if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
    console.warn(`[BrandProof API] ${endpoint} request failed:`, err);
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

// ─── Feature 1: Claim Intelligence Graph ──────────────────────────────────────

export interface GraphNode {
  id: string;
  type: "claim" | "finding" | "rule" | "evidence" | string;
  label: string;
  category?: string;
  status: string;
  details: Record<string, unknown>;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  label: string;
  relationship: string;
}

export interface ClaimCandidate {
  id: string;
  category: string;
  matched_text: string;
  sentence: string;
  reason: string;
  confidence: string;
  status: string;
}

export interface ClaimGraphResponse {
  review_id?: string | null;
  total_claims: number;
  total_findings: number;
  total_evidence_links: number;
  claims: ClaimCandidate[];
  nodes: GraphNode[];
  edges: GraphEdge[];
  verification_legend?: Record<string, string>;
}

export async function getClaimGraph(params: {
  content?: string;
  review_id?: string;
}): Promise<ClaimGraphResponse> {
  const endpoint = "/api/graph";
  const url = `${API_BASE_URL}${endpoint}`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      throw new ApiError(`Failed to build claim graph (${res.status})`, res.status, false, endpoint);
    }
    return (await res.json()) as ClaimGraphResponse;
  } catch (err: unknown) {
    handleNetworkError(err, endpoint);
  }
}

// ─── Feature 2: Adversarial Red Team ──────────────────────────────────────────

export interface RedTestCase {
  case_id: string;
  category: string;
  input_text: string;
  expected_rule_ids: string[];
  description: string;
  case_version: string;
  is_positive: boolean;
}

export interface CaseExecutionResult {
  case_id: string;
  category: string;
  input_text: string;
  expected_rule_ids: string[];
  actual_rule_ids: string[];
  passed: boolean;
  description: string;
  failure_explanation?: string | null;
  findings_count: number;
}

export interface RedTeamSummaryMetrics {
  total_cases: number;
  executed_cases: number;
  passed_cases: number;
  failed_cases: number;
  expected_outcome_pass_rate: number;
  true_positives: number;
  false_positives: number;
  true_negatives: number;
  false_negatives: number;
  recall?: number | null;
  precision?: number | null;
  f1_score?: number | null;
  execution_duration_ms: number;
}

export interface RedTeamSuiteResponse {
  suite_version: string;
  executed_at: string;
  evaluator_version: string;
  metrics: RedTeamSummaryMetrics;
  results: CaseExecutionResult[];
  metric_definitions?: Record<string, string>;
}

export async function runRedTeamSuite(): Promise<RedTeamSuiteResponse> {
  const endpoint = "/api/red-team/run";
  const url = `${API_BASE_URL}${endpoint}`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { Accept: "application/json" },
    });
    if (!res.ok) {
      throw new ApiError(`Failed to run Red Team suite (${res.status})`, res.status, false, endpoint);
    }
    return (await res.json()) as RedTeamSuiteResponse;
  } catch (err: unknown) {
    handleNetworkError(err, endpoint);
  }
}

export async function getRedTeamCases(): Promise<{ cases: RedTestCase[]; total: number }> {
  const endpoint = "/api/red-team/cases";
  const url = `${API_BASE_URL}${endpoint}`;
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
    });
    if (!res.ok) {
      throw new ApiError(`Failed to fetch Red Team cases (${res.status})`, res.status, false, endpoint);
    }
    return (await res.json()) as { cases: RedTestCase[]; total: number };
  } catch (err: unknown) {
    handleNetworkError(err, endpoint);
  }
}

// ─── Feature 3: Campaign Risk Digital Twin ────────────────────────────────────

export interface ChannelEvaluation {
  channel_id: string;
  display_name: string;
  content_fingerprint: string;
  risk_score: number;
  risk_band: "Low" | "Guarded" | "Moderate" | "High" | "Critical" | string;
  status: string;
  score_explanation: string;
  findings_count: number;
  severity_breakdown: Record<string, number>;
  triggered_rule_ids: string[];
  shared_rule_findings: number;
  channel_specific_findings: number;
  missing_disclaimer_warnings: string[];
  findings: Finding[];
}

export interface DigitalTwinResponse {
  input_fingerprint: string;
  content_length: number;
  evaluated_at: string;
  channels: Record<string, ChannelEvaluation>;
  summary_comparison: {
    highest_risk_channel: string;
    highest_risk_score: number;
    lowest_risk_channel: string;
    lowest_risk_score: number;
    shared_core_findings: number;
  };
  scoring_methodology?: Record<string, unknown>;
}

export async function evaluateDigitalTwin(params: {
  content?: string;
  review_id?: string;
}): Promise<DigitalTwinResponse> {
  const endpoint = "/api/digital-twin/evaluate";
  const url = `${API_BASE_URL}${endpoint}`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      throw new ApiError(`Failed to evaluate Digital Twin (${res.status})`, res.status, false, endpoint);
    }
    return (await res.json()) as DigitalTwinResponse;
  } catch (err: unknown) {
    handleNetworkError(err, endpoint);
  }
}

// ─── Feature 4: Policy Change Impact Simulator ────────────────────────────────

export interface ClassifiedFinding {
  finding_id: string;
  rule_id: string;
  severity: Severity;
  text: string;
  reason: string;
  suggestion: string;
  classification: "unchanged" | "resolved_in_simulation" | "newly_flagged" | "severity_changed" | string;
  note: string;
}

export interface PolicySimulationSummary {
  baseline_findings_count: number;
  simulated_findings_count: number;
  net_change: number;
  unchanged_count: number;
  resolved_count: number;
  newly_flagged_count: number;
  active_rules_count: number;
  disabled_rules_count: number;
}

export interface PolicySimulationResponse {
  review_id?: string | null;
  is_simulation: boolean;
  notice: string;
  disabled_rule_ids: string[];
  summary: PolicySimulationSummary;
  findings: ClassifiedFinding[];
}

export async function runPolicySimulation(params: {
  content?: string;
  review_id?: string;
  disabled_rule_ids: string[];
}): Promise<PolicySimulationResponse> {
  const endpoint = "/api/simulator/run";
  const url = `${API_BASE_URL}${endpoint}`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      throw new ApiError(`Failed to run policy simulation (${res.status})`, res.status, false, endpoint);
    }
    return (await res.json()) as PolicySimulationResponse;
  } catch (err: unknown) {
    handleNetworkError(err, endpoint);
  }
}

// ─── Feature 5: Trust Ledger & Explainability ─────────────────────────────────

export interface TrustLedgerExport {
  schema_version: string;
  review_id: string;
  review_created_at?: string | null;
  audit_generated_at: string;
  content_fingerprint: string;
  fingerprint_algorithm: string;
  fingerprint_encoding: string;
  content_length: number;
  content_excerpt: string;
  channel: string;
  policy_evaluator_version: string;
  triggered_rule_ids: string[];
  findings: Record<string, unknown>[];
  evidence_references: string[];
  human_decisions: Record<string, unknown>[];
  unavailable_fields: string[];
  verification_status: string;
  disclaimer: string;
}

export interface AuditVerificationResult {
  status: "MATCH" | "MISMATCH" | "CANNOT_VERIFY" | string;
  computed_fingerprint?: string | null;
  expected_fingerprint?: string | null;
  fingerprint_algorithm: string;
  verified_at: string;
  explanation: string;
  limitations: string;
}

export async function getTrustLedger(reviewId: string): Promise<TrustLedgerExport> {
  const endpoint = `/api/reviews/${encodeURIComponent(reviewId)}/ledger`;
  const url = `${API_BASE_URL}${endpoint}`;
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
    });
    if (!res.ok) {
      throw new ApiError(`Failed to retrieve Trust Ledger (${res.status})`, res.status, false, endpoint);
    }
    return (await res.json()) as TrustLedgerExport;
  } catch (err: unknown) {
    handleNetworkError(err, endpoint);
  }
}

export async function verifyTrustLedger(params: {
  content?: string;
  expected_fingerprint?: string;
}): Promise<AuditVerificationResult> {
  const endpoint = "/api/ledger/verify";
  const url = `${API_BASE_URL}${endpoint}`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      throw new ApiError(`Verification request failed (${res.status})`, res.status, false, endpoint);
    }
    return (await res.json()) as AuditVerificationResult;
  } catch (err: unknown) {
    handleNetworkError(err, endpoint);
  }
}

/**
 * Submit a reviewer question regarding this review or an individual finding.
 * Powered by Google Gemini AI with deterministic fallback.
 */
export async function askReviewQuestion(
  reviewId: string,
  payload: QuestionRequest
): Promise<QuestionResponse> {
  const endpoint = `/api/reviews/${reviewId}/questions`;
  const url = `${API_BASE_URL}${endpoint}`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errorBody = await res.json().catch(() => null);
      const detail = errorBody?.detail || `Review question API failed with status ${res.status}`;
      throw new ApiError(detail, res.status, false, endpoint);
    }

    return (await res.json()) as QuestionResponse;
  } catch (err: unknown) {
    handleNetworkError(err, endpoint);
  }
}
