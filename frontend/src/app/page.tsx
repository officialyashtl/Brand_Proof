"use client";

import { useState } from "react";
import {
  createReview,
  submitDecision,
  Channel,
  Severity,
  EvidenceStatus,
  ReviewResponse,
  FINDING_TYPE_LABELS,
  ApiError,
} from "@/lib/api";

// ─── Demo data ─────────────────────────────────────────────────────────────────

const SAMPLE_TEXT = `🚀 Introducing our revolutionary marketing platform!

Our software guarantees 2x revenue growth in just 7 days — no exceptions. Join the thousands of businesses that have already achieved massive success with our AI-powered solutions.

✅ Clinically proven results
✅ The #1 most trusted brand in the industry
✅ Used by 500,000+ happy customers worldwide
✅ Risk-free, 100% satisfaction guaranteed

Start your free trial today and experience unprecedented growth. Our exclusive, industry-leading technology is unparalleled — nothing else comes close. Don't miss this limited-time offer!`;

const CHANNEL_LABELS: Record<Channel, string> = {
  social: "Social Media",
  website: "Website",
  email: "Email Campaign",
  advertisement: "Advertisement",
};

// ─── Sub-components ────────────────────────────────────────────────────────────

function SeverityBadge({ severity }: { severity: Severity }) {
  const styles: Record<Severity, string> = {
    high: "bg-red-100 text-red-700 border border-red-200",
    medium: "bg-amber-100 text-amber-700 border border-amber-200",
    low: "bg-blue-100 text-blue-600 border border-blue-200",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wide ${styles[severity]}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          severity === "high"
            ? "bg-red-500"
            : severity === "medium"
            ? "bg-amber-500"
            : "bg-blue-500"
        }`}
      />
      {severity}
    </span>
  );
}

function EvidenceBadge({ status }: { status: EvidenceStatus }) {
  const map: Record<EvidenceStatus, { label: string; cls: string }> = {
    not_found: {
      label: "Evidence not found",
      cls: "bg-red-50 text-red-600 border border-red-200",
    },
    partial: {
      label: "Partial evidence",
      cls: "bg-amber-50 text-amber-600 border border-amber-200",
    },
    found: {
      label: "Evidence found",
      cls: "bg-emerald-50 text-emerald-600 border border-emerald-200",
    },
  };
  const { label, cls } = map[status];
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}
    >
      {status === "not_found" ? "✕" : status === "partial" ? "◑" : "✓"}&nbsp;{label}
    </span>
  );
}

function NavItem({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 cursor-pointer ${
        active
          ? "bg-teal-500/15 text-teal-300 border border-teal-500/25"
          : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
      }`}
    >
      <span className="w-4 h-4 flex-shrink-0">{icon}</span>
      {label}
    </button>
  );
}

// Inline SVG icons (zero external dependencies)
const Icons = {
  dashboard: (
    <svg viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4">
      <path d="M2 2h5v5H2V2zm0 7h5v5H2V9zm7-7h5v5H9V2zm0 7h5v5H9V9z" />
    </svg>
  ),
  review: (
    <svg viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4">
      <path d="M14 1H2a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h4l2 3 2-3h4a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1zM5 7h6v1H5V7zm0-2h6v1H5V5zm0 4h4v1H5v-1z" />
    </svg>
  ),
  brand: (
    <svg viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4">
      <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm0 2a5 5 0 1 1 0 10A5 5 0 0 1 8 3zm-1 3v5l4-2.5L7 6z" />
    </svg>
  ),
  history: (
    <svg viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4">
      <path d="M8 1a7 7 0 1 1-7 7H0a8 8 0 1 0 1.354-4.5L0 2.5V6h3.5L2.146 4.646A6 6 0 1 1 2 8H1a7 7 0 0 1 7-7zm-.5 3v4.25l2.625 2.625-.707.707L6.5 8.5V4h1z" />
    </svg>
  ),
  settings: (
    <svg viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4">
      <path d="M8 5a3 3 0 1 0 0 6 3 3 0 0 0 0-6zm-1 3a1 1 0 1 1 2 0 1 1 0 0 1-2 0z" />
      <path d="M6.5 0l-.5 1.5L4.5 2l-1-.5L2 2.5 2.5 4 2 5.5l-1.5.5v2l1.5.5.5 1.5-.5 1 1.5 1.5 1-.5 1.5.5.5 1.5h2l.5-1.5 1.5-.5 1 .5 1.5-1.5-.5-1 .5-1.5 1.5-.5v-2L14 6.5l-.5-1.5.5-1-1.5-1.5-1 .5L10 2.5 9.5 1h-3zm.5 1h2l.4 1.2 1.2.4.9-.4 1.4 1.4-.4.9.4 1.2-1.2.4-.4 1.2v.4l.4 1.2.4.9-1.4 1.4-.9-.4-1.2.4L8.5 15h-2l-.4-1.2-1.2-.4-.9.4L2.6 12.4l.4-.9-.4-1.2 1.2-.4.4-1.2v-.4L3.8 7l-.4-.9 1.4-1.4.9.4 1.2-.4L7 1z" />
    </svg>
  ),
  check: (
    <svg viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4">
      <path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.75.75 0 0 1 1.06-1.06L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0z" />
    </svg>
  ),
  x: (
    <svg viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4">
      <path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.75.75 0 1 1 1.06 1.06L9.06 8l3.22 3.22a.75.75 0 1 1-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 0 1-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06z" />
    </svg>
  ),
  sparkle: (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
      <path d="M10 2l1.5 4.5L16 8l-4.5 1.5L10 14l-1.5-4.5L4 8l4.5-1.5L10 2z" />
    </svg>
  ),
  warning: (
    <svg viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4">
      <path d="M8.22 1.754a.25.25 0 0 0-.44 0L1.698 13.132a.25.25 0 0 0 .22.368h12.164a.25.25 0 0 0 .22-.368L8.22 1.754zm-1.763-.707c.659-1.234 2.427-1.234 3.086 0l6.082 11.378A1.75 1.75 0 0 1 14.082 15H1.918a1.75 1.75 0 0 1-1.543-2.575L6.457 1.047zM9 11a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm-.25-5.25a.75.75 0 0 0-1.5 0v2.5a.75.75 0 0 0 1.5 0v-2.5z" />
    </svg>
  ),
  info: (
    <svg viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4">
      <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0-1A6 6 0 1 0 8 2a6 6 0 0 0 0 12zm-.75-7a.75.75 0 0 1 1.5 0v4a.75.75 0 0 1-1.5 0V7zm.75-2.5a.875.875 0 1 1 0 1.75.875.875 0 0 1 0-1.75z" />
    </svg>
  ),
};

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function BrandProofDashboard() {
  const [activeNav, setActiveNav] = useState<string>("review");
  const [content, setContent] = useState<string>("");
  const [channel, setChannel] = useState<Channel>("social");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [review, setReview] = useState<ReviewResponse | null>(null);

  // Per-finding decision loading/error states
  const [actionInProgress, setActionInProgress] = useState<
    Record<string, "accepted" | "rejected" | null>
  >({});
  const [actionError, setActionError] = useState<Record<string, string | null>>(
    {}
  );

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
    action: "accepted" | "rejected"
  ) {
    if (!review) return;

    setActionInProgress((prev) => ({ ...prev, [findingId]: action }));
    setActionError((prev) => ({ ...prev, [findingId]: null }));

    try {
      const updated = await submitDecision(review.review_id, {
        finding_id: findingId,
        action,
      });
      setReview(updated);
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

  function useSample() {
    setContent(SAMPLE_TEXT);
    setError(null);
  }

  // Create a quick lookup map for recorded decisions
  const decisionMap = new Map<string, "accepted" | "rejected">(
    review?.human_decisions.map((d) => [d.finding_id, d.action])
  );

  const findings = review?.findings ?? null;

  const counts = findings
    ? {
        total: findings.length,
        high: findings.filter((f) => f.severity === "high").length,
        noEvidence: findings.filter((f) => f.evidence_status === "not_found")
          .length,
      }
    : null;

  return (
    <div className="flex h-screen overflow-hidden bg-slate-100 font-[var(--font-geist-sans)]">
      {/* ── Sidebar ──────────────────────────────────────────────────────── */}
      <aside className="w-60 flex-shrink-0 bg-[#0f1623] flex flex-col border-r border-white/5 shadow-xl">
        {/* Logo */}
        <div className="px-5 pt-6 pb-5 border-b border-white/8">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center shadow-lg shadow-teal-500/20">
              <span className="text-white font-bold text-sm leading-none">B</span>
            </div>
            <div>
              <p className="text-white font-semibold text-sm leading-tight">
                BrandProof
              </p>
              <p className="text-slate-500 text-[10px] leading-tight">
                by Inkloom AI
              </p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
          <p className="text-slate-600 text-[10px] font-semibold uppercase tracking-widest px-3 mb-2">
            Main
          </p>
          <NavItem
            icon={Icons.dashboard}
            label="Dashboard"
            active={activeNav === "dashboard"}
            onClick={() => setActiveNav("dashboard")}
          />
          <NavItem
            icon={Icons.review}
            label="Content Review"
            active={activeNav === "review"}
            onClick={() => setActiveNav("review")}
          />
          <NavItem
            icon={Icons.brand}
            label="Brand Guidelines"
            active={activeNav === "brand"}
            onClick={() => setActiveNav("brand")}
          />
          <NavItem
            icon={Icons.history}
            label="Review History"
            active={activeNav === "history"}
            onClick={() => setActiveNav("history")}
          />

          <p className="text-slate-600 text-[10px] font-semibold uppercase tracking-widest px-3 mt-5 mb-2">
            Account
          </p>
          <NavItem
            icon={Icons.settings}
            label="Settings"
            active={activeNav === "settings"}
            onClick={() => setActiveNav("settings")}
          />
        </nav>

        {/* Footer */}
        <div className="px-4 py-4 border-t border-white/8">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white text-xs font-semibold">
              Y
            </div>
            <div>
              <p className="text-slate-300 text-xs font-medium">Yash</p>
              <p className="text-slate-600 text-[10px]">Workspace Admin</p>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-slate-200 px-8 py-5 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-[#0f1623] text-xl font-bold tracking-tight">
                Brand Content Review
              </h1>
              <p className="text-slate-500 text-sm mt-0.5">
                Check your content against brand guidelines and approved
                evidence.
              </p>
            </div>

            {/* Clearly labeled rule-based engine indicator */}
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-full px-4 py-1.5 shadow-xs">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <span className="text-amber-800 text-xs font-semibold">
                Rule-Based Analysis — No AI Provider Active
              </span>
            </div>
          </div>
        </header>

        {/* Scrollable workspace */}
        <main className="flex-1 overflow-y-auto px-8 py-6">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* ── Error Banner (Backend Unavailable or Failed) ─────────── */}
            {error && (
              <div
                role="alert"
                className="bg-red-50 border border-red-200 rounded-2xl p-5 flex items-start gap-3 shadow-xs"
              >
                <div className="text-red-500 mt-0.5 flex-shrink-0">
                  {Icons.warning}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-red-900 mb-1">
                    API Request Failed
                  </h3>
                  <p className="text-xs text-red-700 leading-relaxed font-mono">
                    {error}
                  </p>
                  <div className="mt-3 flex items-center gap-3">
                    <button
                      onClick={handleReview}
                      disabled={loading || !content.trim()}
                      className="px-3 py-1.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                    >
                      Retry Review
                    </button>
                    <button
                      onClick={() => setError(null)}
                      className="text-xs text-red-600 hover:text-red-800 font-medium cursor-pointer"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── Editor card ──────────────────────────────────────────── */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 pt-5 pb-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-teal-600 font-semibold uppercase tracking-widest mb-0.5">
                    Marketing Content
                  </p>
                  <p className="text-slate-700 text-sm">
                    Paste or type the content you want reviewed.
                  </p>
                </div>
                <button
                  id="use-sample-btn"
                  type="button"
                  onClick={useSample}
                  className="text-xs text-teal-600 border border-teal-200 bg-teal-50 hover:bg-teal-100 rounded-lg px-3 py-1.5 font-medium transition-colors cursor-pointer"
                >
                  Use sample text
                </button>
              </div>

              <div className="p-6 space-y-4">
                <textarea
                  id="content-textarea"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={9}
                  placeholder={`Paste your marketing copy here…\n\nExample: "Our platform guarantees 2x revenue growth in just 7 days — used by 500,000+ happy customers."\n\nBrandProof will check it against your brand guidelines and look for unsupported guarantees, clinical claims, customer counts, and superlatives.`}
                  className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 leading-relaxed placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-400/40 focus:border-teal-400 transition-all"
                />

                <div className="flex items-center gap-4">
                  <div className="flex flex-col gap-1">
                    <label
                      htmlFor="channel-select"
                      className="text-xs text-slate-500 font-medium"
                    >
                      Channel
                    </label>
                    <select
                      id="channel-select"
                      value={channel}
                      onChange={(e) => setChannel(e.target.value as Channel)}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-400/40 focus:border-teal-400 cursor-pointer"
                    >
                      {(Object.keys(CHANNEL_LABELS) as Channel[]).map((c) => (
                        <option key={c} value={c}>
                          {CHANNEL_LABELS[c]}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex-1" />

                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <span
                      className={content.length > 3000 ? "text-red-500" : ""}
                    >
                      {content.length} chars
                    </span>
                  </div>

                  <button
                    id="review-content-btn"
                    onClick={handleReview}
                    disabled={loading || !content.trim()}
                    className="flex items-center gap-2 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-sm px-6 py-2.5 rounded-xl shadow-lg shadow-teal-500/20 transition-all duration-200 cursor-pointer"
                  >
                    {loading ? (
                      <>
                        <svg
                          className="animate-spin w-4 h-4"
                          viewBox="0 0 24 24"
                          fill="none"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z"
                          />
                        </svg>
                        Analysing with rule engine…
                      </>
                    ) : (
                      <>
                        {Icons.sparkle}
                        Review Content
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* ── Empty state ───────────────────────────────────────────── */}
            {review === null && !loading && !error && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-8 py-14 flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-50 to-cyan-100 flex items-center justify-center mb-4 shadow-inner">
                  <svg
                    viewBox="0 0 32 32"
                    fill="none"
                    className="w-8 h-8"
                    strokeWidth="1.5"
                  >
                    <rect
                      x="4"
                      y="4"
                      width="24"
                      height="24"
                      rx="5"
                      stroke="#14b8a6"
                      strokeWidth="1.5"
                    />
                    <path
                      d="M10 12h12M10 17h8M10 22h6"
                      stroke="#14b8a6"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                    <circle cx="24" cy="8" r="4" fill="#f59e0b" />
                    <path
                      d="M23 8h2M24 7v2"
                      stroke="white"
                      strokeWidth="1.2"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
                <h2 className="text-[#0f1623] font-semibold text-base mb-1">
                  Ready to review your content
                </h2>
                <p className="text-slate-500 text-sm max-w-sm">
                  Paste or type your marketing copy above, select the
                  destination channel, and click{" "}
                  <strong className="text-teal-600">Review Content</strong>.
                  BrandProof will check against deterministic brand policies.
                </p>
                <button
                  type="button"
                  onClick={useSample}
                  className="mt-5 text-sm text-teal-600 underline underline-offset-2 hover:text-teal-500 transition-colors cursor-pointer"
                >
                  Or load the sample marketing text →
                </button>
              </div>
            )}

            {/* ── Summary cards ─────────────────────────────────────────── */}
            {review !== null && counts && (
              <div className="grid grid-cols-3 gap-4">
                {/* Total */}
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-2">
                    Total Findings
                  </p>
                  <p className="text-3xl font-bold text-[#0f1623]">
                    {counts.total}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    across {CHANNEL_LABELS[review.channel || channel]}
                  </p>
                </div>
                {/* High severity */}
                <div className="bg-white rounded-xl border border-red-100 p-5 shadow-sm">
                  <p className="text-xs text-red-500 font-medium uppercase tracking-wider mb-2">
                    High Severity
                  </p>
                  <p className="text-3xl font-bold text-red-600">
                    {counts.high}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    require immediate action
                  </p>
                </div>
                {/* No evidence */}
                <div className="bg-white rounded-xl border border-amber-100 p-5 shadow-sm">
                  <p className="text-xs text-amber-500 font-medium uppercase tracking-wider mb-2">
                    Evidence Not Found
                  </p>
                  <p className="text-3xl font-bold text-amber-600">
                    {counts.noEvidence}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    claims without approved support
                  </p>
                </div>
              </div>
            )}

            {/* ── Findings list ─────────────────────────────────────────── */}
            {review !== null && findings && (
              <div className="space-y-4">
                {/* Engine Mode info banner */}
                <div className="bg-white border border-slate-200 rounded-xl px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-teal-500" />
                    <span className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
                      Analysis Engine:
                    </span>
                    <span className="text-xs font-mono font-medium text-teal-800 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded">
                      {review.analysis_mode}
                    </span>
                    <span className="text-xs text-slate-500 hidden md:inline">
                      (Deterministic rule-based analysis — no AI hallucinations)
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 font-mono">
                    Review ID:{" "}
                    <span className="text-slate-600">
                      {review.review_id.slice(0, 8)}…
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <h2 className="text-[#0f1623] font-semibold text-base">
                    Findings ({findings.length})
                  </h2>
                  <span className="text-xs text-slate-400">
                    {
                      findings.filter(
                        (f) => (decisionMap.get(f.id) || "pending") === "pending"
                      ).length
                    }{" "}
                    pending review
                  </span>
                </div>

                {findings.length === 0 ? (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-8 text-center">
                    <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center mb-3">
                      {Icons.check}
                    </div>
                    <h3 className="text-emerald-900 font-semibold text-base mb-1">
                      No Compliance Issues Detected
                    </h3>
                    <p className="text-emerald-700 text-sm max-w-md mx-auto">
                      Your content meets all active deterministic brand policy
                      rules for {CHANNEL_LABELS[review.channel]}.
                    </p>
                  </div>
                ) : (
                  findings.map((finding) => {
                    const status = decisionMap.get(finding.id) || "pending";
                    const isBusy = actionInProgress[finding.id];
                    const err = actionError[finding.id];
                    const issueTitle =
                      FINDING_TYPE_LABELS[finding.type] ||
                      finding.type
                        .replace(/_/g, " ")
                        .replace(/\b\w/g, (c) => c.toUpperCase());

                    return (
                      <div
                        key={finding.id}
                        className={`bg-white rounded-xl border shadow-sm overflow-hidden transition-all duration-300 ${
                          status === "accepted"
                            ? "border-emerald-200 opacity-60"
                            : status === "rejected"
                            ? "border-slate-200 opacity-50"
                            : finding.severity === "high"
                            ? "border-red-200"
                            : finding.severity === "medium"
                            ? "border-amber-200"
                            : "border-blue-200"
                        }`}
                      >
                        {/* Finding header */}
                        <div className="px-5 pt-4 pb-3 flex items-start gap-3 border-b border-slate-100">
                          <div className="mt-0.5">{Icons.warning}</div>
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <SeverityBadge severity={finding.severity} />
                              <span className="text-sm font-semibold text-[#0f1623]">
                                {issueTitle}
                              </span>
                            </div>
                            <blockquote className="text-sm text-slate-600 italic border-l-2 border-teal-400 pl-3 mt-1 leading-relaxed">
                              &ldquo;{finding.text}&rdquo;
                            </blockquote>
                          </div>

                          {status !== "pending" && (
                            <span
                              className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                                status === "accepted"
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-slate-100 text-slate-500 line-through"
                              }`}
                            >
                              {status === "accepted"
                                ? "✓ Accepted"
                                : "✕ Rejected"}
                            </span>
                          )}
                        </div>

                        <div className="px-5 py-4 space-y-3">
                          {/* Explanation */}
                          <p className="text-sm text-slate-600 leading-relaxed">
                            {finding.reason}
                          </p>

                          {/* Evidence & Sources */}
                          <div className="flex flex-wrap items-center gap-3">
                            <EvidenceBadge status={finding.evidence_status} />
                            {finding.source_ids &&
                              finding.source_ids.length > 0 && (
                                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                  <span className="font-medium">Sources:</span>
                                  {finding.source_ids.map((src) => (
                                    <span
                                      key={src}
                                      className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-slate-100 text-slate-700 border border-slate-200"
                                    >
                                      {src}
                                    </span>
                                  ))}
                                </div>
                              )}
                          </div>

                          {/* Suggested rewrite */}
                          <div className="bg-teal-50 border border-teal-100 rounded-lg px-4 py-3">
                            <p className="text-[10px] text-teal-600 font-semibold uppercase tracking-wide mb-1">
                              Suggested Rewrite
                            </p>
                            <p className="text-sm text-slate-700 leading-relaxed">
                              {finding.suggestion}
                            </p>
                          </div>

                          {/* Actions */}
                          {status === "pending" && (
                            <div className="flex flex-col gap-2 pt-1">
                              <div className="flex items-center gap-2">
                                <button
                                  id={`accept-finding-${finding.id}`}
                                  type="button"
                                  disabled={!!isBusy}
                                  onClick={() =>
                                    handleFindingAction(finding.id, "accepted")
                                  }
                                  className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 disabled:opacity-50 border border-emerald-200 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                                >
                                  {isBusy === "accepted" ? (
                                    <span className="w-3.5 h-3.5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                                  ) : (
                                    Icons.check
                                  )}
                                  Accept suggestion
                                </button>
                                <button
                                  id={`reject-finding-${finding.id}`}
                                  type="button"
                                  disabled={!!isBusy}
                                  onClick={() =>
                                    handleFindingAction(finding.id, "rejected")
                                  }
                                  className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 bg-slate-50 hover:bg-slate-100 disabled:opacity-50 border border-slate-200 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                                >
                                  {isBusy === "rejected" ? (
                                    <span className="w-3.5 h-3.5 border-2 border-slate-500 border-t-transparent rounded-full animate-spin" />
                                  ) : (
                                    Icons.x
                                  )}
                                  Reject
                                </button>
                              </div>

                              {err && (
                                <p className="text-xs text-red-600">
                                  Error: {err}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}

                {/* All resolved state */}
                {findings.length > 0 &&
                  findings.every(
                    (f) => (decisionMap.get(f.id) || "pending") !== "pending"
                  ) && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-6 py-5 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                        {Icons.check}
                      </div>
                      <div>
                        <p className="text-emerald-800 font-semibold text-sm">
                          All findings reviewed!
                        </p>
                        <p className="text-emerald-600 text-xs mt-0.5">
                          Every flagged item has received a human decision
                          persisted to the backend.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setReview(null);
                          setContent("");
                          setError(null);
                        }}
                        className="ml-auto text-xs font-semibold text-emerald-700 bg-white border border-emerald-300 hover:bg-emerald-50 px-4 py-2 rounded-lg transition-colors cursor-pointer"
                      >
                        New Review
                      </button>
                    </div>
                  )}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
