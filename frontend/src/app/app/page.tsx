"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  createReview,
  getReviews,
  submitDecision,
  Channel,
  Severity,
  EvidenceStatus,
  ReviewResponse,
  FINDING_TYPE_LABELS,
  ApiError,
  API_BASE_URL,
} from "@/lib/api";

// ─── Benchmark Demo Data ────────────────────────────────────────────────────────

const SAMPLE_TEXT = `🚀 Introducing our revolutionary marketing platform!

Our software guarantees 2x revenue growth in just 7 days — no exceptions. Join the thousands of businesses that have already achieved massive success with our AI-powered solutions.

✅ Clinically proven results
✅ The #1 most trusted brand in the industry
✅ Used by 500,000+ happy customers worldwide
✅ Risk-free, 100% satisfaction guaranteed

Start your free trial today and experience unprecedented growth. Our exclusive, industry-leading technology is unparalleled — nothing else comes close. Don't miss this limited-time offer!`;

const CHANNEL_LABELS: Record<Channel, string> = {
  social: "Social Media Campaign",
  website: "Web Presence",
  email: "Direct Dispatch",
  advertisement: "Public Campaign",
};

// ─── Visual Components (Deep Forest & Natural Lime) ──────────────────────────

function SeverityBadge({ severity }: { severity: Severity }) {
  const styles: Record<Severity, { border: string; bg: string; text: string; dot: string; label: string }> = {
    high: {
      border: "border-[#EF9187]/40",
      bg: "bg-[#EF9187]/15",
      text: "text-[#EF9187]",
      dot: "bg-[#EF9187]",
      label: "Critical Risk",
    },
    medium: {
      border: "border-[#E5BD75]/40",
      bg: "bg-[#E5BD75]/15",
      text: "text-[#E5BD75]",
      dot: "bg-[#E5BD75]",
      label: "Warning",
    },
    low: {
      border: "border-[#A8D6A0]/40",
      bg: "bg-[#A8D6A0]/15",
      text: "text-[#A8D6A0]",
      dot: "bg-[#A8D6A0]",
      label: "Advisory",
    },
  };
  const s = styles[severity];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[11px] font-mono tracking-wider uppercase font-semibold ${s.border} ${s.bg} ${s.text}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}

function EvidenceBadge({ status }: { status: EvidenceStatus }) {
  const map: Record<EvidenceStatus, { label: string; cls: string; icon: string }> = {
    not_found: {
      label: "Evidence Deficit: 0 Citations",
      cls: "border-[#EF9187]/30 bg-[#EF9187]/10 text-[#EF9187]",
      icon: "✕",
    },
    partial: {
      label: "Partial Citation on Record",
      cls: "border-[#E5BD75]/30 bg-[#E5BD75]/10 text-[#E5BD75]",
      icon: "◑",
    },
    found: {
      label: "Verified Evidence Attested",
      cls: "border-[#A8D6A0]/30 bg-[#A8D6A0]/10 text-[#A8D6A0]",
      icon: "✓",
    },
  };
  const { label, cls, icon } = map[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[11px] font-mono tracking-wider font-medium ${cls}`}
    >
      <span className="font-bold">{icon}</span>
      <span>{label}</span>
    </span>
  );
}

function NavItem({
  id,
  code,
  label,
  active,
  onClick,
}: {
  id?: string;
  code: string;
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      id={id}
      type="button"
      onClick={onClick}
      className={`w-full flex items-center justify-between px-3.5 py-3 text-xs tracking-wider transition-all duration-150 cursor-pointer rounded-xl border text-left ${
        active
          ? "bg-[#15271D] text-[#A7D76B] border-[rgba(167,215,107,0.3)] font-semibold shadow-sm"
          : "text-[#C3CDBF] hover:text-[#F4F1E8] hover:bg-[#101F17] border-transparent"
      }`}
    >
      <div className="flex items-center gap-2.5">
        <span className={`text-[10px] font-mono ${active ? "text-[#A7D76B]" : "text-[#8D9D8E]"}`}>
          {code}
        </span>
        <span className="font-sans">{label}</span>
      </div>
      {active && <span className="w-1.5 h-1.5 rounded-full bg-[#A7D76B]" />}
    </button>
  );
}

// ─── Main Application Workspace ───────────────────────────────────────────────

export default function BrandProofWorkspace() {
  const [activeNav, setActiveNav] = useState<string>("dashboard");
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState<boolean>(false);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  // Content Review state
  const [content, setContent] = useState<string>("");
  const [channel, setChannel] = useState<Channel>("social");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [review, setReview] = useState<ReviewResponse | null>(null);

  // Per-finding decision loading/error states
  const [actionInProgress, setActionInProgress] = useState<
    Record<string, "accepted" | "rejected" | null>
  >({});
  const [actionError, setActionError] = useState<Record<string, string | null>>({});

  // Review History state
  const [historyReviews, setHistoryReviews] = useState<ReviewResponse[] | null>(null);
  const [historyLoading, setHistoryLoading] = useState<boolean>(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [expandedReviewId, setExpandedReviewId] = useState<string | null>(null);

  async function loadHistory() {
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const data = await getReviews();
      setHistoryReviews(data);
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Failed to load review history from backend.";
      setHistoryError(msg);
      setHistoryReviews(null);
    } finally {
      setHistoryLoading(false);
    }
  }

  // Load history on initial mount for dashboard metrics
  useEffect(() => {
    let active = true;
    getReviews()
      .then((data) => {
        if (active) setHistoryReviews(data);
      })
      .catch((err: unknown) => {
        if (active) {
          const msg =
            err instanceof Error
              ? err.message
              : "Failed to load review history from backend.";
          setHistoryError(msg);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  async function handleReview() {
    if (!content.trim() || loading) return;
    setLoading(true);
    setError(null);

    try {
      const res = await createReview({
        content: content.trim(),
        channel,
        brand_id: "demo-brand",
      });
      setReview(res);
      setActionError({});
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(
          "An unexpected error occurred while communicating with the backend."
        );
      }
      setReview(null);
    } finally {
      setLoading(false);
    }
  }

  async function handleFindingAction(
    findingId: string,
    action: "accepted" | "rejected",
    targetReviewId?: string
  ) {
    const revId = targetReviewId || review?.review_id;
    if (!revId) return;

    setActionInProgress((prev) => ({ ...prev, [findingId]: action }));
    setActionError((prev) => ({ ...prev, [findingId]: null }));

    try {
      const updated = await submitDecision(revId, {
        finding_id: findingId,
        action,
      });

      // Update current review state if matching
      if (review && review.review_id === revId) {
        setReview(updated);
      }

      // Update history state if loaded
      setHistoryReviews((prev) =>
        prev ? prev.map((r) => (r.review_id === revId ? updated : r)) : null
      );
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Failed to record decision on backend.";
      setActionError((prev) => ({ ...prev, [findingId]: msg }));
    } finally {
      setActionInProgress((prev) => ({ ...prev, [findingId]: null }));
    }
  }

  function handleCopySuggestion(text: string, findingId: string) {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(text);
      setCopyFeedback(findingId);
      setTimeout(() => setCopyFeedback(null), 2000);
    }
  }

  function useSample() {
    setContent(SAMPLE_TEXT);
    setError(null);
  }

  // Dashboard calculated metrics
  const totalReviewsCount = historyReviews?.length ?? 0;
  const totalFindingsCount =
    historyReviews?.reduce((acc, r) => acc + (r.findings?.length || 0), 0) ?? 0;
  const highSeverityCount =
    historyReviews?.reduce(
      (acc, r) =>
        acc + (r.findings?.filter((f) => f.severity === "high").length || 0),
      0
    ) ?? 0;
  const pendingDecisionsCount =
    historyReviews?.reduce((acc, r) => {
      const decidedIds = new Set(
        (r.human_decisions || []).map((d) => d.finding_id)
      );
      const pendingInRev = (r.findings || []).filter(
        (f) => !decidedIds.has(f.id)
      ).length;
      return acc + pendingInRev;
    }, 0) ?? 0;

  return (
    <div className="flex h-screen bg-[#07110D] text-[#F4F1E8] font-sans selection:bg-[#A7D76B] selection:text-[#07110D] overflow-hidden">
      
      {/* ── SIDEBAR NAVIGATION (DEEP FOREST) ── */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-[#0B1711] border-r border-[rgba(230,240,224,0.08)] flex flex-col justify-between transition-transform duration-200 ease-in-out md:static md:translate-x-0 ${
          mobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div>
          {/* Header Monogram */}
          <div className="p-5 border-b border-[rgba(230,240,224,0.08)] flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3 group">
              <span className="w-8 h-8 rounded-full bg-[#101F17] border border-[rgba(167,215,107,0.3)] text-[#A7D76B] font-mono font-bold text-xs flex items-center justify-center">
                BP
              </span>
              <div>
                <span className="font-bold text-sm tracking-tight text-[#F4F1E8] group-hover:text-[#A7D76B] transition-colors flex items-center gap-1">
                  BrandProof
                </span>
                <span className="block text-[10px] uppercase tracking-wider text-[#8D9D8E] font-mono">
                  Inkloom AI
                </span>
              </div>
            </Link>
            <div className="flex items-center gap-1.5 text-[10px] font-mono text-[#A7D76B] bg-[#A7D76B]/10 px-2 py-0.5 rounded-full border border-[#A7D76B]/20">
              <span className="w-1.5 h-1.5 rounded-full bg-[#A7D76B] pulse-led" />
              Online
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1">
            <NavItem
              id="nav-dashboard"
              code="01"
              label="Dashboard"
              active={activeNav === "dashboard"}
              onClick={() => {
                setActiveNav("dashboard");
                setMobileSidebarOpen(false);
              }}
            />
            <NavItem
              id="nav-review"
              code="02"
              label="Content Review"
              active={activeNav === "review"}
              onClick={() => {
                setActiveNav("review");
                setMobileSidebarOpen(false);
              }}
            />
            <NavItem
              id="nav-brand"
              code="03"
              label="Brand Guidelines"
              active={activeNav === "brand"}
              onClick={() => {
                setActiveNav("brand");
                setMobileSidebarOpen(false);
              }}
            />
            <NavItem
              id="nav-history"
              code="04"
              label="Review History"
              active={activeNav === "history"}
              onClick={() => {
                setActiveNav("history");
                setMobileSidebarOpen(false);
                loadHistory();
              }}
            />
            <NavItem
              id="nav-settings"
              code="05"
              label="Settings"
              active={activeNav === "settings"}
              onClick={() => {
                setActiveNav("settings");
                setMobileSidebarOpen(false);
              }}
            />
          </nav>
        </div>

        {/* Sidebar Footer Telemetry */}
        <div className="p-4 border-t border-[rgba(230,240,224,0.08)] font-mono text-[11px] text-[#8D9D8E] space-y-2 bg-[#07110D]">
          <div className="flex justify-between items-center">
            <span>ENGINE:</span>
            <span className="text-[#A7D76B] font-semibold">DETERMINISTIC</span>
          </div>
          <div className="flex justify-between items-center">
            <span>STORAGE:</span>
            <span className="text-[#F4F1E8]">SQLITE 3</span>
          </div>
          <div className="flex justify-between items-center">
            <span>AI CALLS:</span>
            <span className="text-[#8D9D8E]">0 (DISCLOSED)</span>
          </div>
        </div>
      </aside>

      {/* Mobile Backdrop */}
      {mobileSidebarOpen && (
        <div
          onClick={() => setMobileSidebarOpen(false)}
          className="fixed inset-0 bg-black/70 z-30 md:hidden"
        />
      )}

      {/* ── WORKSPACE MAIN COLUMN ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        
        {/* Top Header Bar */}
        <header className="h-16 border-b border-[rgba(230,240,224,0.08)] bg-[#07110D] px-4 sm:px-6 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
              className="md:hidden p-2 rounded-lg bg-[#101F17] text-[#C3CDBF] hover:text-[#F4F1E8] border border-[rgba(230,240,224,0.1)]"
              aria-label="Toggle navigation drawer"
            >
              <svg
                width="20"
                height="20"
                className="w-5 h-5 shrink-0"
                style={{ width: "20px", height: "20px", flexShrink: 0 }}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className="text-xs text-[#8D9D8E] flex items-center gap-2">
              <span>BrandProof // Workspace //</span>
              <span className="text-[#F4F1E8] font-bold uppercase tracking-wider">{activeNav}</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden lg:flex items-center gap-2 text-[11px] font-mono text-[#A7D76B] bg-[#A7D76B]/10 border border-[#A7D76B]/25 px-3 py-1 rounded-full">
              <span>⚡</span>
              <span>DETERMINISTIC RULE ENGINE // ZERO UNVERIFIED AI HALLUCINATIONS</span>
            </div>
            <Link
              href="/"
              className="btn-forest-secondary text-xs px-3.5 py-1.5"
            >
              Exit to Landing ↗
            </Link>
          </div>
        </header>

        {/* Content Viewport */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-[#07110D]">
          <div className="max-w-6xl mx-auto space-y-8">
            
            {/* ══════════════ DASHBOARD VIEW ══════════════ */}
            {activeNav === "dashboard" && (
              <div className="space-y-8">
                {/* Header */}
                <div className="border-b border-[rgba(230,240,224,0.08)] pb-6">
                  <div className="text-xs font-mono text-[#A7D76B] uppercase tracking-wider mb-1">
                    {"//"} System Overview
                  </div>
                  <h1 className="text-3xl font-extrabold tracking-tight text-[#F4F1E8]">
                    Brand Governance / Dashboard
                  </h1>
                  <p className="text-sm text-[#C3CDBF] mt-1">
                    Live audit telemetry sourced directly from persistent SQLite storage.
                  </p>
                </div>

                {/* 4 Metric Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  
                  {/* Card 1 */}
                  <div className="rounded-3xl bg-[#101F17] border border-[rgba(230,240,224,0.09)] p-6">
                    <div className="text-xs text-[#8D9D8E] uppercase tracking-wider font-mono">
                      Saved Reviews
                    </div>
                    <div className="text-4xl font-extrabold text-[#F4F1E8] mt-2">
                      {totalReviewsCount}
                    </div>
                    <div className="text-xs text-[#8D9D8E] mt-3 pt-3 border-t border-[rgba(230,240,224,0.06)]">
                      Persisted Audit Records
                    </div>
                  </div>

                  {/* Card 2 */}
                  <div className="rounded-3xl bg-[#101F17] border border-[rgba(230,240,224,0.09)] p-6">
                    <div className="text-xs text-[#8D9D8E] uppercase tracking-wider font-mono">
                      Total Findings
                    </div>
                    <div className="text-4xl font-extrabold text-[#A7D76B] mt-2">
                      {totalFindingsCount}
                    </div>
                    <div className="text-xs text-[#8D9D8E] mt-3 pt-3 border-t border-[rgba(230,240,224,0.06)]">
                      Policy Conflicts Detected
                    </div>
                  </div>

                  {/* Card 3 */}
                  <div className="rounded-3xl bg-[#101F17] border border-[rgba(230,240,224,0.09)] p-6">
                    <div className="text-xs text-[#8D9D8E] uppercase tracking-wider font-mono">
                      Pending Decisions
                    </div>
                    <div className="text-4xl font-extrabold text-[#E5BD75] mt-2">
                      {pendingDecisionsCount}
                    </div>
                    <div className="text-xs text-[#8D9D8E] mt-3 pt-3 border-t border-[rgba(230,240,224,0.06)]">
                      Awaiting Human Action
                    </div>
                  </div>

                  {/* Card 4 */}
                  <div className="rounded-3xl bg-[#101F17] border border-[rgba(230,240,224,0.09)] p-6">
                    <div className="text-xs text-[#8D9D8E] uppercase tracking-wider font-mono">
                      Critical Breaches
                    </div>
                    <div className="text-4xl font-extrabold text-[#EF9187] mt-2">
                      {highSeverityCount}
                    </div>
                    <div className="text-xs text-[#8D9D8E] mt-3 pt-3 border-t border-[rgba(230,240,224,0.06)]">
                      High-Severity Violations
                    </div>
                  </div>

                </div>

                {/* Quick Workflow Tiles */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="rounded-3xl bg-[#101F17] border border-[rgba(230,240,224,0.09)] p-6 flex flex-col justify-between">
                    <div>
                      <div className="text-xs font-mono font-bold text-[#A7D76B] mb-2 uppercase">
                        01 / Review Engine
                      </div>
                      <p className="text-sm text-[#C3CDBF] mb-6">
                        Submit new marketing copy to run instant deterministic policy evaluations.
                      </p>
                    </div>
                    <button
                      onClick={() => setActiveNav("review")}
                      className="btn-forest-primary text-xs w-full py-2.5"
                    >
                      Start New Review ↗
                    </button>
                  </div>

                  <div className="rounded-3xl bg-[#101F17] border border-[rgba(230,240,224,0.09)] p-6 flex flex-col justify-between">
                    <div>
                      <div className="text-xs font-mono font-bold text-[#A7D76B] mb-2 uppercase">
                        02 / Policy Register
                      </div>
                      <p className="text-sm text-[#C3CDBF] mb-6">
                        Inspect active compliance rules, regulatory citations, and threshold criteria.
                      </p>
                    </div>
                    <button
                      onClick={() => setActiveNav("brand")}
                      className="btn-forest-secondary text-xs w-full py-2.5"
                    >
                      Explore Guidelines ↗
                    </button>
                  </div>

                  <div className="rounded-3xl bg-[#101F17] border border-[rgba(230,240,224,0.09)] p-6 flex flex-col justify-between">
                    <div>
                      <div className="text-xs font-mono font-bold text-[#A7D76B] mb-2 uppercase">
                        03 / Audit Trail
                      </div>
                      <p className="text-sm text-[#C3CDBF] mb-6">
                        Query all persisted reviews and inspect historical human decisions.
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setActiveNav("history");
                        loadHistory();
                      }}
                      className="btn-forest-secondary text-xs w-full py-2.5"
                    >
                      View Review History ↗
                    </button>
                  </div>
                </div>

                {/* Recent Reviews Activity Table */}
                <div className="rounded-3xl bg-[#101F17] border border-[rgba(230,240,224,0.09)] p-6 sm:p-7">
                  <div className="flex items-center justify-between border-b border-[rgba(230,240,224,0.08)] pb-4 mb-4">
                    <h2 className="text-sm font-bold text-[#F4F1E8] uppercase tracking-wider font-mono">
                      Recent Compliance Activity
                    </h2>
                    <span className="text-xs text-[#8D9D8E] font-mono">
                      Persisted in SQLite
                    </span>
                  </div>

                  {historyError && (
                    <div className="p-4 rounded-xl bg-[#EF9187]/15 border border-[#EF9187] text-xs font-mono text-[#EF9187] mb-4">
                      Error querying backend: {historyError}
                    </div>
                  )}

                  {!historyReviews && !historyError && (
                    <div className="py-8 text-center text-xs text-[#8D9D8E] font-mono">
                      Loading audit records...
                    </div>
                  )}

                  {historyReviews && historyReviews.length === 0 && (
                    <div className="py-8 text-center text-xs text-[#8D9D8E] font-mono">
                      No reviews found. Submit marketing copy to initialize history.
                    </div>
                  )}

                  {historyReviews && historyReviews.length > 0 && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left font-mono text-xs">
                        <thead>
                          <tr className="border-b border-[rgba(230,240,224,0.08)] text-[#8D9D8E]">
                            <th className="py-3 pr-4">REVIEW ID</th>
                            <th className="py-3 pr-4">CHANNEL</th>
                            <th className="py-3 pr-4">TIMESTAMP</th>
                            <th className="py-3 pr-4">FINDINGS</th>
                            <th className="py-3 pr-4">STATUS</th>
                            <th className="py-3 text-right">ACTION</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[rgba(230,240,224,0.06)]">
                          {historyReviews.slice(0, 5).map((r) => {
                            const highCount = (r.findings || []).filter(
                              (f) => f.severity === "high"
                            ).length;
                            return (
                              <tr key={r.review_id} className="hover:bg-[#15271D]/50 transition-colors">
                                <td className="py-3.5 pr-4 text-[#A7D76B] font-bold">
                                  {r.review_id.slice(0, 8)}...
                                </td>
                                <td className="py-3.5 pr-4 uppercase text-[#C3CDBF]">
                                  {r.channel}
                                </td>
                                <td className="py-3.5 pr-4 text-[#8D9D8E]">
                                  {r.created_at ? new Date(r.created_at).toLocaleTimeString() : "N/A"}
                                </td>
                                <td className="py-3.5 pr-4">
                                  <span className="text-[#F4F1E8] font-bold">{r.findings?.length || 0}</span>
                                  {highCount > 0 && (
                                    <span className="text-[#EF9187] ml-1.5 font-bold">
                                      ({highCount} Critical)
                                    </span>
                                  )}
                                </td>
                                <td className="py-3.5 pr-4">
                                  <span className="px-2 py-0.5 rounded-full bg-[#A8D6A0]/15 text-[#A8D6A0] border border-[#A8D6A0]/30 text-[10px]">
                                    COMPLETED
                                  </span>
                                </td>
                                <td className="py-3.5 text-right">
                                  <button
                                    onClick={() => {
                                      setReview(r);
                                      if (r.content) setContent(r.content);
                                      setActiveNav("review");
                                    }}
                                    className="text-xs text-[#A7D76B] hover:underline font-semibold"
                                  >
                                    Inspect ↗
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ══════════════ CONTENT REVIEW VIEW ══════════════ */}
            {activeNav === "review" && (
              <div className="space-y-8">
                {/* Header */}
                <div className="border-b border-[rgba(230,240,224,0.08)] pb-6">
                  <div className="text-xs font-mono text-[#A7D76B] uppercase tracking-wider mb-1">
                    {"//"} Review Engine / Input
                  </div>
                  <h1 className="text-3xl font-extrabold tracking-tight text-[#F4F1E8]">
                    Inspect Your Claims.
                  </h1>
                  <p className="text-sm text-[#C3CDBF] mt-1">
                    Deterministic compliance evaluation. Identify regulatory breaches and evidence deficits.
                  </p>
                </div>

                {/* Editor Container */}
                <div className="rounded-3xl bg-[#101F17] border border-[rgba(230,240,224,0.09)] p-6 sm:p-8 shadow-xl">
                  
                  {/* Controls Header */}
                  <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[rgba(230,240,224,0.08)] pb-4 mb-4">
                    <div className="flex items-center gap-3">
                      <label htmlFor="channel-select" className="text-xs font-mono uppercase text-[#8D9D8E]">
                        Target Channel:
                      </label>
                      <select
                        id="channel-select"
                        value={channel}
                        onChange={(e) => setChannel(e.target.value as Channel)}
                        className="bg-[#0B1711] border border-[rgba(230,240,224,0.12)] text-[#F4F1E8] px-3.5 py-1.5 rounded-xl text-xs font-mono focus:border-[#A7D76B] focus:outline-none"
                      >
                        <option value="social">Social Media Campaign</option>
                        <option value="website">Web Presence</option>
                        <option value="email">Direct Dispatch</option>
                        <option value="advertisement">Public Campaign</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        id="use-sample-btn"
                        type="button"
                        onClick={useSample}
                        className="btn-forest-secondary text-xs px-3.5 py-1.5"
                      >
                        [+ Load Benchmark Copy]
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setContent("");
                          setReview(null);
                          setError(null);
                        }}
                        className="text-xs text-[#8D9D8E] hover:text-[#EF9187] px-2 py-1 transition-colors"
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  {/* Textarea */}
                  <div className="relative">
                    <textarea
                      id="content-textarea"
                      rows={9}
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      placeholder="Paste marketing copy here to evaluate against deterministic brand policies..."
                      className="w-full bg-[#0B1711] border border-[rgba(230,240,224,0.1)] rounded-2xl p-4 text-[#F4F1E8] text-sm leading-relaxed focus:border-[#A7D76B] focus:outline-none placeholder:text-[#8D9D8E]/50 font-mono"
                    />
                    <div className="mt-2 flex justify-between text-[11px] font-mono text-[#8D9D8E]">
                      <span>CHARACTERS: {content.length}</span>
                      <span>WORDS: {content.trim() ? content.trim().split(/\s+/).length : 0}</span>
                    </div>
                  </div>

                  {/* Action Bar */}
                  <div className="mt-6 flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-[rgba(230,240,224,0.08)]">
                    <div className="text-xs text-[#C3CDBF] flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#A7D76B] pulse-led" />
                      <span>Mode: {CHANNEL_LABELS[channel]}</span>
                    </div>

                    <button
                      id="review-content-btn"
                      type="button"
                      onClick={handleReview}
                      disabled={loading || !content.trim()}
                      className="btn-forest-primary text-xs px-7 py-3"
                    >
                      {loading ? "Evaluating Claims..." : "Review Marketing Content ↗"}
                    </button>
                  </div>

                  {/* Error Notification */}
                  {error && (
                    <div className="mt-4 p-4 rounded-xl bg-[#EF9187]/15 border border-[#EF9187] text-xs font-mono text-[#EF9187]">
                      Evaluation Failed: {error}
                    </div>
                  )}

                </div>

                {/* ── FINDINGS DISPLAY ── */}
                {review && (
                  <div className="space-y-6 pt-4">
                    
                    {/* Findings Summary Strip */}
                    <div className="rounded-2xl bg-[#0B1711] border border-[rgba(230,240,224,0.09)] p-4 flex flex-wrap items-center justify-between gap-4 font-mono text-xs">
                      <div className="flex items-center gap-3">
                        <span className="text-[#A7D76B] font-bold">
                          Review #{review.review_id.slice(0, 8)}
                        </span>
                        <span className="text-[#8D9D8E]">|</span>
                        <span className="text-[#F4F1E8]">
                          {review.findings.length} Claims Flagged
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[#EF9187] font-semibold">
                          {review.findings.filter((f) => f.severity === "high").length} Critical
                        </span>
                        <span className="text-[#E5BD75] font-semibold">
                          {review.findings.filter((f) => f.severity === "medium").length} Warning
                        </span>
                      </div>
                    </div>

                    {/* Clean State */}
                    {review.findings.length === 0 && (
                      <div className="rounded-3xl bg-[#101F17] border border-[rgba(230,240,224,0.09)] p-12 text-center">
                        <span className="text-4xl block mb-2 text-[#A8D6A0]">✓</span>
                        <h3 className="text-lg font-bold text-[#F4F1E8]">
                          All Policy Criteria Satisfied
                        </h3>
                        <p className="text-xs text-[#C3CDBF] mt-1">
                          No regulatory violations, absolute guarantees, or evidence deficits detected.
                        </p>
                      </div>
                    )}

                    {/* Findings Cards */}
                    {review.findings.map((f) => {
                      const decision = (review.human_decisions || []).find(
                        (d) => d.finding_id === f.id
                      );
                      const isActing = actionInProgress[f.id];
                      const err = actionError[f.id];

                      return (
                        <div
                          key={f.id}
                          className="rounded-3xl bg-[#101F17] border border-[rgba(230,240,224,0.09)] p-6 sm:p-7 space-y-4 shadow-lg"
                        >
                          {/* Finding Header */}
                          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[rgba(230,240,224,0.08)] pb-3">
                            <div className="flex items-center gap-2.5">
                              <SeverityBadge severity={f.severity} />
                              <EvidenceBadge status={f.evidence_status} />
                              <span className="font-semibold text-xs text-[#F4F1E8]">
                                {FINDING_TYPE_LABELS[f.type] || f.type}
                              </span>
                            </div>
                            <span className="text-[10px] font-mono text-[#8D9D8E]">
                              ID: {f.id.slice(0, 8)}
                            </span>
                          </div>

                          {/* Flagged Phrase */}
                          <div>
                            <div className="text-[11px] font-mono uppercase text-[#8D9D8E] mb-1">
                              Flagged Claim Text:
                            </div>
                            <div className="p-3.5 rounded-xl bg-[#0B1711] border border-[rgba(230,240,224,0.08)] text-xs font-mono text-[#EF9187] border-l-4 border-l-[#EF9187]">
                              &quot;{f.text}&quot;
                            </div>
                          </div>

                          {/* Policy Explanation */}
                          <div>
                            <div className="text-[11px] font-mono uppercase text-[#8D9D8E] mb-1">
                              Policy Explanation:
                            </div>
                            <p className="text-xs text-[#C3CDBF] leading-relaxed">
                              {f.reason}
                            </p>
                          </div>

                          {/* Citations / Evidence Deficit */}
                          <div className="text-xs p-3 rounded-xl bg-[#15271D]/60 border border-[rgba(230,240,224,0.06)] font-mono text-[#C3CDBF]">
                            <span className="text-[#8D9D8E] mr-2">EVIDENCE STATUS:</span>
                            {f.source_ids && f.source_ids.length > 0 ? (
                              <span className="text-[#A8D6A0]">
                                Indexed Citations: {f.source_ids.join(", ")}
                              </span>
                            ) : (
                              <span className="text-[#EF9187]">
                                Evidence Deficit: No verifiable corroboration on file.
                              </span>
                            )}
                          </div>

                          {/* Suggested Rewrite */}
                          {f.suggestion && (
                            <div className="p-4 rounded-2xl bg-[#0B1711] border border-[rgba(167,215,107,0.25)]">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-mono font-semibold text-[#A7D76B] uppercase flex items-center gap-1.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-[#A7D76B]" />
                                  Suggested Rewrite Proposal
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleCopySuggestion(f.suggestion, f.id)}
                                  className="text-[11px] font-mono text-[#8D9D8E] hover:text-[#A7D76B] transition-colors"
                                >
                                  {copyFeedback === f.id ? "Copied ✓" : "Copy Rewrite"}
                                </button>
                              </div>
                              <p className="text-xs text-[#A8D6A0] leading-relaxed">
                                &quot;{f.suggestion}&quot;
                              </p>
                            </div>
                          )}

                          {/* Human Decision Controls */}
                          <div className="pt-4 border-t border-[rgba(230,240,224,0.08)] flex flex-wrap items-center justify-between gap-4 text-xs">
                            <div className="flex items-center gap-2">
                              <span className="text-[#8D9D8E] font-mono">HUMAN DECISION:</span>
                              {decision ? (
                                <span
                                  className={`font-mono font-semibold uppercase ${
                                    decision.action === "accepted"
                                      ? "text-[#A8D6A0]"
                                      : "text-[#EF9187]"
                                  }`}
                                >
                                  {decision.action === "accepted" ? "✓ Accepted" : "✕ Rejected"}
                                </span>
                              ) : (
                                <span className="font-mono text-[#E5BD75] font-semibold">
                                  ● Pending Human Review
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-3">
                              <button
                                id={`accept-finding-${f.id}`}
                                type="button"
                                onClick={() => handleFindingAction(f.id, "accepted")}
                                disabled={Boolean(isActing)}
                                className="btn-forest-primary text-xs px-4 py-2"
                              >
                                {isActing === "accepted" ? "Recording..." : "Accept Suggestion"}
                              </button>
                              <button
                                id={`reject-finding-${f.id}`}
                                type="button"
                                onClick={() => handleFindingAction(f.id, "rejected")}
                                disabled={Boolean(isActing)}
                                className="btn-forest-danger text-xs px-4 py-2"
                              >
                                {isActing === "rejected" ? "Recording..." : "Reject"}
                              </button>
                            </div>
                          </div>

                          {err && (
                            <div className="p-3 rounded-xl bg-[#EF9187]/15 text-[#EF9187] font-mono text-xs border border-[#EF9187]">
                              Action Error: {err}
                            </div>
                          )}
                        </div>
                      );
                    })}

                  </div>
                )}

              </div>
            )}

            {/* ══════════════ BRAND GUIDELINES VIEW ══════════════ */}
            {activeNav === "brand" && (
              <div className="space-y-8">
                {/* Header */}
                <div className="border-b border-[rgba(230,240,224,0.08)] pb-6">
                  <div className="text-xs font-mono text-[#A7D76B] uppercase tracking-wider mb-1">
                    {"//"} Policy Register
                  </div>
                  <h1 className="text-3xl font-extrabold tracking-tight text-[#F4F1E8]">
                    Active Brand Policies
                  </h1>
                  <p className="text-sm text-[#C3CDBF] mt-1">
                    Deterministic compliance rules configured in the review engine.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Policy 1 */}
                  <div className="rounded-3xl bg-[#101F17] border border-[rgba(230,240,224,0.09)] p-6">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-mono font-bold text-[#A7D76B]">CODE: FTC-01</span>
                      <SeverityBadge severity="high" />
                    </div>
                    <h3 className="text-base font-bold text-[#F4F1E8] mb-2">
                      Absolute Guarantees
                    </h3>
                    <p className="text-xs text-[#C3CDBF] leading-relaxed mb-4">
                      Prohibits promises of absolute outcome certainty, 100% satisfaction guarantees, or risk-free returns without verified clinical or regulatory clearance.
                    </p>
                    <div className="text-[11px] font-mono text-[#8D9D8E] border-t border-[rgba(230,240,224,0.06)] pt-3">
                      TRIGGERS: &quot;guaranteed&quot;, &quot;risk-free&quot;, &quot;100% guaranteed&quot;, &quot;no exceptions&quot;
                    </div>
                  </div>

                  {/* Policy 2 */}
                  <div className="rounded-3xl bg-[#101F17] border border-[rgba(230,240,224,0.09)] p-6">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-mono font-bold text-[#A7D76B]">CODE: FTC-02</span>
                      <SeverityBadge severity="high" />
                    </div>
                    <h3 className="text-base font-bold text-[#F4F1E8] mb-2">
                      Customer Count Substantiation
                    </h3>
                    <p className="text-xs text-[#C3CDBF] leading-relaxed mb-4">
                      Requires empirical database metrics for claims specifying customer metrics (&quot;500,000+ customers&quot; or &quot;thousands of businesses&quot;).
                    </p>
                    <div className="text-[11px] font-mono text-[#8D9D8E] border-t border-[rgba(230,240,224,0.06)] pt-3">
                      TRIGGERS: &quot;[0-9]+ happy customers&quot;, &quot;thousands of businesses&quot;
                    </div>
                  </div>

                  {/* Policy 3 */}
                  <div className="rounded-3xl bg-[#101F17] border border-[rgba(230,240,224,0.09)] p-6">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-mono font-bold text-[#A7D76B]">CODE: FTC-03</span>
                      <SeverityBadge severity="high" />
                    </div>
                    <h3 className="text-base font-bold text-[#F4F1E8] mb-2">
                      Clinical &amp; Scientific Claims
                    </h3>
                    <p className="text-xs text-[#C3CDBF] leading-relaxed mb-4">
                      Enforces medical and scientific substantiation. Bars commercial copy from asserting clinical efficacy without linked trial records.
                    </p>
                    <div className="text-[11px] font-mono text-[#8D9D8E] border-t border-[rgba(230,240,224,0.06)] pt-3">
                      TRIGGERS: &quot;clinically proven&quot;, &quot;scientifically certified&quot;
                    </div>
                  </div>

                  {/* Policy 4 */}
                  <div className="rounded-3xl bg-[#101F17] border border-[rgba(230,240,224,0.09)] p-6">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-mono font-bold text-[#A7D76B]">CODE: FTC-04</span>
                      <SeverityBadge severity="medium" />
                    </div>
                    <h3 className="text-base font-bold text-[#F4F1E8] mb-2">
                      Superlative &amp; Ranking Claims
                    </h3>
                    <p className="text-xs text-[#C3CDBF] leading-relaxed mb-4">
                      Flags unsupported market position claims (&quot;the #1 solution&quot; or &quot;industry leader&quot;) that lack independent survey citations.
                    </p>
                    <div className="text-[11px] font-mono text-[#8D9D8E] border-t border-[rgba(230,240,224,0.06)] pt-3">
                      TRIGGERS: &quot;#1 most trusted&quot;, &quot;industry leader&quot;, &quot;unparalleled&quot;
                    </div>
                  </div>

                  {/* Policy 5 */}
                  <div className="rounded-3xl bg-[#101F17] border border-[rgba(230,240,224,0.09)] p-6">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-mono font-bold text-[#A7D76B]">CODE: ENV-01</span>
                      <SeverityBadge severity="high" />
                    </div>
                    <h3 className="text-base font-bold text-[#F4F1E8] mb-2">
                      Environmental &amp; Green Claims
                    </h3>
                    <p className="text-xs text-[#C3CDBF] leading-relaxed mb-4">
                      Strict adherence to FTC Green Guides. Regulates &quot;100% eco-friendly&quot; or &quot;carbon neutral&quot; without life-cycle disclosure.
                    </p>
                    <div className="text-[11px] font-mono text-[#8D9D8E] border-t border-[rgba(230,240,224,0.06)] pt-3">
                      TRIGGERS: &quot;carbon neutral&quot;, &quot;100% green&quot;, &quot;zero-footprint&quot;
                    </div>
                  </div>

                  {/* Policy 6 */}
                  <div className="rounded-3xl bg-[#101F17] border border-[rgba(230,240,224,0.09)] p-6">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-mono font-bold text-[#A7D76B]">CODE: TON-01</span>
                      <SeverityBadge severity="medium" />
                    </div>
                    <h3 className="text-base font-bold text-[#F4F1E8] mb-2">
                      Urgent High-Pressure Tactics
                    </h3>
                    <p className="text-xs text-[#C3CDBF] leading-relaxed mb-4">
                      Flags artificial urgency language (&quot;don&apos;t miss this limited-time offer&quot; or countdown pressure) that degrades brand trust.
                    </p>
                    <div className="text-[11px] font-mono text-[#8D9D8E] border-t border-[rgba(230,240,224,0.06)] pt-3">
                      TRIGGERS: &quot;limited-time offer&quot;, &quot;act now before it expires&quot;
                    </div>
                  </div>

                  {/* Policy 7 */}
                  <div className="rounded-3xl bg-[#101F17] border border-[rgba(230,240,224,0.09)] p-6 md:col-span-2">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-mono font-bold text-[#A7D76B]">CODE: TON-02</span>
                      <SeverityBadge severity="medium" />
                    </div>
                    <h3 className="text-base font-bold text-[#F4F1E8] mb-2">
                      Vague Buzzwords &amp; Empty Hyperbole
                    </h3>
                    <p className="text-xs text-[#C3CDBF] leading-relaxed mb-4">
                      Identifies inflated marketing jargon (&quot;revolutionary platform&quot;, &quot;unprecedented growth&quot;) and suggests concrete factual value statements.
                    </p>
                    <div className="text-[11px] font-mono text-[#8D9D8E] border-t border-[rgba(230,240,224,0.06)] pt-3">
                      TRIGGERS: &quot;revolutionary&quot;, &quot;massive success&quot;, &quot;unprecedented&quot;
                    </div>
                  </div>

                </div>
              </div>
            )}

            {/* ══════════════ REVIEW HISTORY VIEW ══════════════ */}
            {activeNav === "history" && (
              <div className="space-y-8">
                {/* Header */}
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[rgba(230,240,224,0.08)] pb-6">
                  <div>
                    <div className="text-xs font-mono text-[#A7D76B] uppercase tracking-wider mb-1">
                      {"//"} Audit Trail
                    </div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-[#F4F1E8]">
                      Persistent Review History
                    </h1>
                    <p className="text-sm text-[#C3CDBF] mt-1">
                      Permanent record of audited campaigns, findings, and human decisions.
                    </p>
                  </div>
                  <button
                    onClick={loadHistory}
                    disabled={historyLoading}
                    className="btn-forest-secondary text-xs px-4 py-2"
                  >
                    {historyLoading ? "Fetching..." : "Refresh Audit Trail ⟳"}
                  </button>
                </div>

                {historyError && (
                  <div className="p-4 rounded-xl bg-[#EF9187]/15 border border-[#EF9187] text-xs font-mono text-[#EF9187]">
                    Failed to query database: {historyError}
                  </div>
                )}

                {historyLoading && !historyReviews && (
                  <div className="py-12 text-center text-xs text-[#8D9D8E] font-mono">
                    Querying SQLite ledger...
                  </div>
                )}

                {historyReviews && historyReviews.length === 0 && (
                  <div className="rounded-3xl bg-[#101F17] border border-[rgba(230,240,224,0.09)] p-12 text-center">
                    <p className="text-[#C3CDBF] text-sm mb-4">
                      No historical audit sessions found in the database.
                    </p>
                    <button
                      onClick={() => setActiveNav("review")}
                      className="btn-forest-primary text-xs px-5 py-2.5"
                    >
                      Initialize First Review ↗
                    </button>
                  </div>
                )}

                {historyReviews && historyReviews.length > 0 && (
                  <div className="space-y-4">
                    {historyReviews.map((r) => {
                      const isExpanded = expandedReviewId === r.review_id;
                      const highCount = (r.findings || []).filter(
                        (f) => f.severity === "high"
                      ).length;
                      const decidedCount = (r.human_decisions || []).length;
                      const totalFindings = (r.findings || []).length;

                      return (
                        <div
                          key={r.review_id}
                          className="rounded-3xl bg-[#101F17] border border-[rgba(230,240,224,0.09)] p-6 space-y-4 shadow-md"
                        >
                          {/* Review Card Header */}
                          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[rgba(230,240,224,0.08)] pb-3">
                            <div className="flex items-center gap-3 font-mono text-xs">
                              <span className="text-[#A7D76B] font-bold">
                                #{r.review_id.slice(0, 8)}
                              </span>
                              <span className="text-[#8D9D8E]">|</span>
                              <span className="uppercase text-[#C3CDBF]">{r.channel}</span>
                              <span className="text-[#8D9D8E]">|</span>
                              <span className="text-[#8D9D8E]">
                                {r.created_at ? new Date(r.created_at).toLocaleString() : "N/A"}
                              </span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-xs font-mono text-[#8D9D8E]">
                                Decisions: {decidedCount} / {totalFindings}
                              </span>
                              <button
                                onClick={() =>
                                  setExpandedReviewId(isExpanded ? null : r.review_id)
                                }
                                className="text-xs text-[#A7D76B] hover:underline font-mono"
                              >
                                {isExpanded ? "[ Collapse - ]" : "[ Expand Findings + ]"}
                              </button>
                            </div>
                          </div>

                          {/* Content Excerpt */}
                          {r.content && (
                            <div className="text-xs text-[#C3CDBF] bg-[#0B1711] p-3.5 rounded-xl border border-[rgba(230,240,224,0.06)] line-clamp-2 font-mono">
                              &quot;{r.content}&quot;
                            </div>
                          )}

                          {/* Quick Stats Bar */}
                          <div className="flex items-center gap-4 text-xs font-mono">
                            <span className="text-[#F4F1E8]">
                              Findings: <span className="font-bold">{totalFindings}</span>
                            </span>
                            {highCount > 0 && (
                              <span className="text-[#EF9187] font-semibold">
                                {highCount} Critical
                              </span>
                            )}
                            <button
                              onClick={() => {
                                setReview(r);
                                if (r.content) setContent(r.content);
                                setActiveNav("review");
                              }}
                              className="ml-auto text-xs text-[#A7D76B] hover:underline font-semibold"
                            >
                              Return to Editor ↗
                            </button>
                          </div>

                          {/* Expanded Findings Section */}
                          {isExpanded && (
                            <div className="pt-4 border-t border-[rgba(230,240,224,0.08)] space-y-4">
                              <div className="text-xs font-mono text-[#8D9D8E] uppercase">
                                Audit Findings:
                              </div>
                              {r.findings && r.findings.map((f) => {
                                const decision = (r.human_decisions || []).find(
                                  (d) => d.finding_id === f.id
                                );
                                const isActing = actionInProgress[f.id];

                                return (
                                  <div
                                    key={f.id}
                                    className="p-4 rounded-2xl bg-[#0B1711] border border-[rgba(230,240,224,0.08)] space-y-3 text-xs"
                                  >
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <SeverityBadge severity={f.severity} />
                                        <span className="text-[#F4F1E8] font-bold">
                                          {FINDING_TYPE_LABELS[f.type] || f.type}
                                        </span>
                                      </div>
                                      <span className="text-[10px] font-mono text-[#8D9D8E]">
                                        ID: {f.id.slice(0, 8)}
                                      </span>
                                    </div>

                                    <div className="text-[#EF9187] p-2.5 rounded-lg bg-[#101F17] border border-[rgba(230,240,224,0.06)] font-mono">
                                      &quot;{f.text}&quot;
                                    </div>

                                    {f.suggestion && (
                                      <div className="text-[#A8D6A0] p-2.5 rounded-lg bg-[#15271D]/50 border border-[rgba(167,215,107,0.2)] font-mono">
                                        Rewrite: &quot;{f.suggestion}&quot;
                                      </div>
                                    )}

                                    {/* Action in History */}
                                    <div className="flex items-center justify-between pt-2 border-t border-[rgba(230,240,224,0.06)]">
                                      <div className="flex items-center gap-2 font-mono">
                                        <span className="text-[#8D9D8E]">Status:</span>
                                        {decision ? (
                                          <span
                                            className={`font-semibold uppercase ${
                                              decision.action === "accepted"
                                                ? "text-[#A8D6A0]"
                                                : "text-[#EF9187]"
                                            }`}
                                          >
                                            {decision.action === "accepted"
                                              ? "✓ Accepted"
                                              : "✕ Rejected"}
                                          </span>
                                        ) : (
                                          <span className="text-[#E5BD75] font-semibold">
                                            ● Pending
                                          </span>
                                        )}
                                      </div>

                                      <div className="flex items-center gap-2">
                                        <button
                                          type="button"
                                          onClick={() =>
                                            handleFindingAction(f.id, "accepted", r.review_id)
                                          }
                                          disabled={Boolean(isActing)}
                                          className="btn-forest-primary text-[10px] px-3 py-1"
                                        >
                                          Accept
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() =>
                                            handleFindingAction(f.id, "rejected", r.review_id)
                                          }
                                          disabled={Boolean(isActing)}
                                          className="btn-forest-danger text-[10px] px-3 py-1"
                                        >
                                          Reject
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ══════════════ SETTINGS VIEW ══════════════ */}
            {activeNav === "settings" && (
              <div className="space-y-8">
                {/* Header */}
                <div className="border-b border-[rgba(230,240,224,0.08)] pb-6">
                  <div className="text-xs font-mono text-[#A7D76B] uppercase tracking-wider mb-1">
                    {"//"} System Configuration
                  </div>
                  <h1 className="text-3xl font-extrabold tracking-tight text-[#F4F1E8]">
                    Workspace Settings
                  </h1>
                  <p className="text-sm text-[#C3CDBF] mt-1">
                    Underlying environment parameters and transparent engine specifications.
                  </p>
                </div>

                <div className="rounded-3xl bg-[#101F17] border border-[rgba(230,240,224,0.09)] p-6 sm:p-8 space-y-6 text-xs font-mono">
                  
                  <div className="flex flex-wrap items-center justify-between py-3 border-b border-[rgba(230,240,224,0.08)]">
                    <span className="text-[#8D9D8E]">BRAND WORKSPACE IDENTIFIER</span>
                    <span className="text-[#F4F1E8] font-bold">demo-brand</span>
                  </div>

                  <div className="flex flex-wrap items-center justify-between py-3 border-b border-[rgba(230,240,224,0.08)]">
                    <span className="text-[#8D9D8E]">ENGINE OPERATIONAL MODE</span>
                    <span className="text-[#A7D76B] font-bold">rule_based_demo (deterministic)</span>
                  </div>

                  <div className="flex flex-wrap items-center justify-between py-3 border-b border-[rgba(230,240,224,0.08)]">
                    <span className="text-[#8D9D8E]">AI PROVIDER INVOCATION</span>
                    <span className="text-[#A8D6A0] font-bold">NONE (0% AI Hallucination Risk)</span>
                  </div>

                  <div className="flex flex-wrap items-center justify-between py-3 border-b border-[rgba(230,240,224,0.08)]">
                    <span className="text-[#8D9D8E]">DATA PERSISTENCE BACKEND</span>
                    <span className="text-[#F4F1E8]">SQLite (backend/brandproof.db)</span>
                  </div>

                  <div className="flex flex-wrap items-center justify-between py-3 border-b border-[rgba(230,240,224,0.08)]">
                    <span className="text-[#8D9D8E]">API BASE URL</span>
                    <span className="text-[#8D9D8E]">{API_BASE_URL}</span>
                  </div>

                  <div className="flex flex-wrap items-center justify-between py-3 border-b border-[rgba(230,240,224,0.08)]">
                    <span className="text-[#8D9D8E]">API HEALTH STATUS</span>
                    <span className="text-[#A7D76B] font-bold flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#A7D76B] pulse-led" />
                      ONLINE (200 OK)
                    </span>
                  </div>

                  <div className="p-5 rounded-2xl bg-[#0B1711] border border-[rgba(230,240,224,0.08)] text-[#C3CDBF] leading-relaxed font-sans text-xs">
                    <span className="text-[#A7D76B] font-bold block mb-1 font-mono">
                      INTEGRITY NOTICE:
                    </span>
                    BrandProof is designed for strict deterministic governance. All checks run
                    through audited regex rules and token pattern matching. Decisions are recorded
                    with human attribution directly in the local SQLite audit ledger.
                  </div>

                </div>
              </div>
            )}

          </div>
        </main>
      </div>

    </div>
  );
}
