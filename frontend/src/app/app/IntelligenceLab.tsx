"use client";

import { useState } from "react";
import {
  ReviewResponse,
  ClaimGraphResponse,
  GraphNode,
  RedTeamSuiteResponse,
  DigitalTwinResponse,
  PolicySimulationResponse,
  TrustLedgerExport,
  AuditVerificationResult,
  getClaimGraph,
  runRedTeamSuite,
  evaluateDigitalTwin,
  runPolicySimulation,
  getTrustLedger,
  verifyTrustLedger,
} from "@/lib/api";

interface IntelligenceLabProps {
  currentReview: ReviewResponse | null;
  historyReviews: ReviewResponse[] | null;
  loadHistory?: () => Promise<void>;
  onNavigateToReview: () => void;
}

export default function IntelligenceLab({
  currentReview,
  historyReviews,
  onNavigateToReview,
}: IntelligenceLabProps) {
  const [activeTab, setActiveTab] = useState<
    "graph" | "redteam" | "twin" | "simulator" | "ledger"
  >("graph");

  // Selected review ID across lab features
  const defaultReviewId =
    currentReview?.review_id ||
    (historyReviews && historyReviews.length > 0 ? historyReviews[0].review_id : "");
  const [selectedReviewId, setSelectedReviewId] = useState<string>(defaultReviewId);
  const effectiveReviewId = selectedReviewId || defaultReviewId;
  const [copyStatus, setCopyStatus] = useState<string | null>(null);

  // Feature 1: Claim Graph State
  const [graphData, setGraphData] = useState<ClaimGraphResponse | null>(null);
  const [graphLoading, setGraphLoading] = useState<boolean>(false);
  const [graphError, setGraphError] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [graphViewMode, setGraphViewMode] = useState<"visual" | "table">("visual");

  // Feature 2: Red Team State
  const [redTeamData, setRedTeamData] = useState<RedTeamSuiteResponse | null>(null);
  const [redTeamLoading, setRedTeamLoading] = useState<boolean>(false);
  const [redTeamError, setRedTeamError] = useState<string | null>(null);
  const [redTeamFilter, setRedTeamFilter] = useState<"all" | "passed" | "failed">("all");

  // Feature 3: Digital Twin State
  const [twinData, setTwinData] = useState<DigitalTwinResponse | null>(null);
  const [twinLoading, setTwinLoading] = useState<boolean>(false);
  const [twinError, setTwinError] = useState<string | null>(null);

  // Feature 4: Policy Simulator State
  const [disabledRules, setDisabledRules] = useState<string[]>([]);
  const [simData, setSimData] = useState<PolicySimulationResponse | null>(null);
  const [simLoading, setSimLoading] = useState<boolean>(false);
  const [simError, setSimError] = useState<string | null>(null);

  // Feature 5: Trust Ledger State
  const [ledgerData, setLedgerData] = useState<TrustLedgerExport | null>(null);
  const [ledgerLoading, setLedgerLoading] = useState<boolean>(false);
  const [ledgerError, setLedgerError] = useState<string | null>(null);
  const [verifyContentInput, setVerifyContentInput] = useState<string>("");
  const [verifyHashInput, setVerifyHashInput] = useState<string>("");
  const [verifyResult, setVerifyResult] = useState<AuditVerificationResult | null>(null);
  const [verifyLoading, setVerifyLoading] = useState<boolean>(false);

  // Find the currently selected review object
  const activeReviewObj: ReviewResponse | null =
    (currentReview && currentReview.review_id === effectiveReviewId
      ? currentReview
      : historyReviews?.find((r) => r.review_id === effectiveReviewId)) || null;

  // ─── Actions ──────────────────────────────────────────────────────────────

  async function handleBuildGraph() {
    if (!activeReviewObj && !effectiveReviewId) {
      setGraphError("No review selected. Please select a review from history or evaluate new content.");
      return;
    }
    setGraphLoading(true);
    setGraphError(null);
    try {
      const res = await getClaimGraph({
        review_id: effectiveReviewId,
        content: activeReviewObj?.content || undefined,
      });
      setGraphData(res);
      if (res.nodes.length > 0) {
        setSelectedNode(res.nodes[0]);
      }
    } catch (err: unknown) {
      setGraphError(err instanceof Error ? err.message : "Failed to generate graph.");
    } finally {
      setGraphLoading(false);
    }
  }

  async function handleRunRedTeam() {
    setRedTeamLoading(true);
    setRedTeamError(null);
    try {
      const res = await runRedTeamSuite();
      setRedTeamData(res);
    } catch (err: unknown) {
      setRedTeamError(err instanceof Error ? err.message : "Failed to execute red team suite.");
    } finally {
      setRedTeamLoading(false);
    }
  }

  async function handleRunDigitalTwin() {
    if (!activeReviewObj?.content) {
      setTwinError("Please select a review with stored content to evaluate the Digital Twin.");
      return;
    }
    setTwinLoading(true);
    setTwinError(null);
    try {
      const res = await evaluateDigitalTwin({
        content: activeReviewObj.content,
        review_id: effectiveReviewId,
      });
      setTwinData(res);
    } catch (err: unknown) {
      setTwinError(err instanceof Error ? err.message : "Digital twin evaluation failed.");
    } finally {
      setTwinLoading(false);
    }
  }

  async function handleRunSimulation() {
    if (!activeReviewObj?.content) {
      setSimError("Please select a review with stored content to simulate policy adjustments.");
      return;
    }
    setSimLoading(true);
    setSimError(null);
    try {
      const res = await runPolicySimulation({
        content: activeReviewObj.content,
        review_id: effectiveReviewId,
        disabled_rule_ids: disabledRules,
      });
      setSimData(res);
    } catch (err: unknown) {
      setSimError(err instanceof Error ? err.message : "Policy simulation failed.");
    } finally {
      setSimLoading(false);
    }
  }

  async function handleLoadLedger() {
    if (!effectiveReviewId) {
      setLedgerError("Please select a saved review to inspect its Trust Ledger.");
      return;
    }
    setLedgerLoading(true);
    setLedgerError(null);
    setVerifyResult(null);
    try {
      const res = await getTrustLedger(effectiveReviewId);
      setLedgerData(res);
      setVerifyContentInput(activeReviewObj?.content || "");
      setVerifyHashInput(res.content_fingerprint);
    } catch (err: unknown) {
      setLedgerError(err instanceof Error ? err.message : "Failed to load audit ledger.");
    } finally {
      setLedgerLoading(false);
    }
  }

  async function handleVerifyDigest() {
    setVerifyLoading(true);
    try {
      const res = await verifyTrustLedger({
        content: verifyContentInput,
        expected_fingerprint: verifyHashInput,
      });
      setVerifyResult(res);
    } catch (err: unknown) {
      setVerifyResult({
        status: "CANNOT_VERIFY",
        fingerprint_algorithm: "SHA-256",
        verified_at: new Date().toISOString(),
        explanation: err instanceof Error ? err.message : "Verification request failed.",
        limitations: "Network error occurred.",
      });
    } finally {
      setVerifyLoading(false);
    }
  }

  function handleDownloadLedgerJSON() {
    if (!ledgerData) return;
    const blob = new Blob([JSON.stringify(ledgerData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `brandproof-audit-${ledgerData.review_id.slice(0, 8)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function copyToClipboard(text: string, label: string) {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(text);
      setCopyStatus(label);
      setTimeout(() => setCopyStatus(null), 2000);
    }
  }

  const ALL_RULES = [
    { id: "absolute_guarantee", name: "Absolute Performance Guarantees (FTC)" },
    { id: "clinical_claim", name: "Unsubstantiated Clinical Claims" },
    { id: "superlative_ranking", name: "Superlative & Ranking Claims (#1/Best)" },
    { id: "customer_count", name: "Customer Count CRM Verification (420k+)" },
    { id: "vague_superlative", name: "Vague Superlatives (Revolutionary/Unprecedented)" },
    { id: "comparative_claim", name: "Comparative Claims (Nothing Else Comes Close)" },
    { id: "prohibited_term", name: "Prohibited Terms (Risk-free/100% Guaranteed)" },
  ];

  return (
    <div className="space-y-8">
      {/* ── Header ── */}
      <div className="border-b border-[rgba(230,240,224,0.08)] pb-6">
        <div className="text-xs font-mono text-[#A7D76B] uppercase tracking-wider mb-1">
          {"//"} Governance Lab & Red Team
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-[#F4F1E8]">
          Intelligence Lab
        </h1>
        <p className="text-sm text-[#C3CDBF] mt-1">
          Advanced brand governance tools: claim intelligence graph, adversarial red-teaming,
          channel risk twins, policy impact simulation, and explainable cryptographic trust ledgers.
        </p>
      </div>

      {/* ── Sub-Navigation Tabs ── */}
      <div className="flex flex-wrap gap-2 border-b border-[rgba(230,240,224,0.08)] pb-3">
        {[
          { id: "graph", label: "Claim Graph", code: "01" },
          { id: "redteam", label: "Adversarial Red Team", code: "02" },
          { id: "twin", label: "Campaign Digital Twin", code: "03" },
          { id: "simulator", label: "Policy Simulator", code: "04" },
          { id: "ledger", label: "Trust Ledger", code: "05" },
        ].map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono transition-all duration-150 ${
                active
                  ? "bg-[#101F17] text-[#A7D76B] border border-[#A7D76B]/30 shadow-sm"
                  : "bg-transparent text-[#8D9D8E] hover:text-[#F4F1E8] hover:bg-[#101F17]/50 border border-transparent"
              }`}
            >
              <span className={active ? "text-[#A7D76B]" : "text-[#8D9D8E]"}>
                {tab.code}
              </span>
              <span className="font-sans font-medium">{tab.label}</span>
              {active && <span className="w-1.5 h-1.5 rounded-full bg-[#A7D76B]" />}
            </button>
          );
        })}
      </div>

      {/* ── Review Selector Bar (For features 1, 3, 4, 5) ── */}
      {activeTab !== "redteam" && (
        <div className="p-4 rounded-2xl bg-[#101F17] border border-[rgba(230,240,224,0.09)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-[#8D9D8E] uppercase tracking-wider">
              Selected Review:
            </span>
            {historyReviews && historyReviews.length > 0 ? (
              <select
                value={effectiveReviewId}
                onChange={(e) => setSelectedReviewId(e.target.value)}
                className="bg-[#07110D] text-xs font-mono text-[#F4F1E8] border border-[rgba(230,240,224,0.15)] rounded-lg px-3 py-1.5 focus:border-[#A7D76B] focus:outline-none"
              >
                {historyReviews.map((r, i) => (
                  <option key={r.review_id} value={r.review_id}>
                    #{i + 1} {"//"} {r.review_id.slice(0, 8)}... — {r.channel.toUpperCase()} ({r.findings.length} findings)
                  </option>
                ))}
              </select>
            ) : (
              <span className="text-xs text-[#EF9187] font-mono">
                No saved reviews found.
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {activeReviewObj?.content && (
              <div className="text-[11px] font-mono text-[#8D9D8E] hidden md:block truncate max-w-xs">
                &quot;{activeReviewObj.content.slice(0, 40)}...&quot;
              </div>
            )}
            <button
              onClick={onNavigateToReview}
              className="text-xs text-[#A7D76B] hover:text-[#C0E88A] font-mono underline"
            >
              + Review New Copy
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          FEATURE 1: CLAIM INTELLIGENCE GRAPH
          ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "graph" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-[#F4F1E8]">
                Claim Intelligence Graph
              </h2>
              <p className="text-xs text-[#C3CDBF]">
                Trace candidate marketing claims to triggered compliance policies and verified evidence documents.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex bg-[#07110D] p-1 rounded-lg border border-[rgba(230,240,224,0.08)]">
                <button
                  onClick={() => setGraphViewMode("visual")}
                  className={`px-3 py-1 text-xs font-mono rounded ${
                    graphViewMode === "visual"
                      ? "bg-[#101F17] text-[#A7D76B] font-bold"
                      : "text-[#8D9D8E] hover:text-[#F4F1E8]"
                  }`}
                >
                  Visual Graph
                </button>
                <button
                  onClick={() => setGraphViewMode("table")}
                  className={`px-3 py-1 text-xs font-mono rounded ${
                    graphViewMode === "table"
                      ? "bg-[#101F17] text-[#A7D76B] font-bold"
                      : "text-[#8D9D8E] hover:text-[#F4F1E8]"
                  }`}
                >
                  Relational Table
                </button>
              </div>
              <button
                onClick={handleBuildGraph}
                disabled={graphLoading}
                className="btn-forest-primary text-xs px-4 py-2"
              >
                {graphLoading ? "Extracting Claims..." : "Extract & Build Graph ↗"}
              </button>
            </div>
          </div>

          {graphError && (
            <div className="p-4 rounded-xl bg-[#EF9187]/15 border border-[#EF9187] text-xs font-mono text-[#EF9187]">
              {graphError}
            </div>
          )}

          {/* Empty State */}
          {!graphData && !graphLoading && (
            <div className="p-12 text-center rounded-3xl bg-[#101F17] border border-[rgba(230,240,224,0.08)] space-y-4">
              <div className="w-12 h-12 mx-auto rounded-full bg-[#07110D] flex items-center justify-center text-xl text-[#A7D76B]">
                ⚡
              </div>
              <h3 className="text-base font-bold text-[#F4F1E8]">
                No Claim Graph Generated
              </h3>
              <p className="text-xs text-[#C3CDBF] max-w-md mx-auto">
                Select a saved review above or click &quot;Extract & Build Graph&quot; to parse marketing claims, map them to triggered policy findings, and link verified evidence.
              </p>
              <button
                onClick={handleBuildGraph}
                className="btn-forest-secondary text-xs px-4 py-2"
              >
                Build Graph for Current Selection
              </button>
            </div>
          )}

          {/* Graph Results */}
          {graphData && (
            <div className="space-y-6">
              {/* Telemetry Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 font-mono text-xs">
                <div className="p-4 rounded-2xl bg-[#101F17] border border-[rgba(230,240,224,0.08)]">
                  <div className="text-[#8D9D8E]">CLAIMS DETECTED</div>
                  <div className="text-2xl font-bold text-[#F4F1E8] mt-1">
                    {graphData.total_claims}
                  </div>
                </div>
                <div className="p-4 rounded-2xl bg-[#101F17] border border-[rgba(230,240,224,0.08)]">
                  <div className="text-[#8D9D8E]">FINDINGS FLAGGED</div>
                  <div className="text-2xl font-bold text-[#E5BD75] mt-1">
                    {graphData.total_findings}
                  </div>
                </div>
                <div className="p-4 rounded-2xl bg-[#101F17] border border-[rgba(230,240,224,0.08)]">
                  <div className="text-[#8D9D8E]">EVIDENCE ATTACHED</div>
                  <div className="text-2xl font-bold text-[#A7D76B] mt-1">
                    {graphData.total_evidence_links}
                  </div>
                </div>
                <div className="p-4 rounded-2xl bg-[#101F17] border border-[rgba(230,240,224,0.08)]">
                  <div className="text-[#8D9D8E]">GRAPH NODES</div>
                  <div className="text-2xl font-bold text-[#C3CDBF] mt-1">
                    {graphData.nodes.length}
                  </div>
                </div>
              </div>

              {/* View Mode 1: Interactive SVG Graph */}
              {graphViewMode === "visual" && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Visual Node-Edge Canvas */}
                  <div className="lg:col-span-2 p-6 rounded-3xl bg-[#0B1711] border border-[rgba(230,240,224,0.09)] min-h-[420px] flex flex-col justify-between">
                    <div className="flex items-center justify-between text-xs font-mono text-[#8D9D8E] mb-4">
                      <span>INTERACTIVE TOPOLOGY // CLICK ANY NODE</span>
                      <span>EDGES: {graphData.edges.length}</span>
                    </div>

                    <div className="space-y-6">
                      {/* Node Columns */}
                      <div className="grid grid-cols-3 gap-3 text-center">
                        {/* Column 1: Claims */}
                        <div className="space-y-2">
                          <div className="text-[11px] font-mono text-[#A7D76B] uppercase font-bold">
                            Claims (Detected)
                          </div>
                          <div className="space-y-2">
                            {graphData.nodes
                              .filter((n) => n.type === "claim")
                              .map((node) => {
                                const isSelected = selectedNode?.id === node.id;
                                return (
                                  <button
                                    key={node.id}
                                    onClick={() => setSelectedNode(node)}
                                    className={`w-full text-left p-2.5 rounded-xl text-xs font-mono transition-all ${
                                      isSelected
                                        ? "bg-[#A7D76B]/20 border border-[#A7D76B] text-[#F4F1E8]"
                                        : "bg-[#101F17] border border-[rgba(230,240,224,0.08)] text-[#C3CDBF] hover:border-[#A7D76B]/50"
                                    }`}
                                  >
                                    <div className="text-[10px] text-[#A7D76B] font-bold truncate">
                                      {node.category}
                                    </div>
                                    <div className="truncate font-sans font-medium text-[11px]">
                                      &quot;{node.label}&quot;
                                    </div>
                                  </button>
                                );
                              })}
                          </div>
                        </div>

                        {/* Column 2: Findings */}
                        <div className="space-y-2">
                          <div className="text-[11px] font-mono text-[#E5BD75] uppercase font-bold">
                            Findings (Flagged)
                          </div>
                          <div className="space-y-2">
                            {graphData.nodes
                              .filter((n) => n.type === "finding")
                              .map((node) => {
                                const isSelected = selectedNode?.id === node.id;
                                return (
                                  <button
                                    key={node.id}
                                    onClick={() => setSelectedNode(node)}
                                    className={`w-full text-left p-2.5 rounded-xl text-xs font-mono transition-all ${
                                      isSelected
                                        ? "bg-[#E5BD75]/20 border border-[#E5BD75] text-[#F4F1E8]"
                                        : "bg-[#101F17] border border-[rgba(230,240,224,0.08)] text-[#C3CDBF] hover:border-[#E5BD75]/50"
                                    }`}
                                  >
                                    <div className="text-[10px] text-[#E5BD75] font-bold truncate">
                                      {node.details?.severity?.toString().toUpperCase()}
                                    </div>
                                    <div className="truncate font-sans font-medium text-[11px]">
                                      {node.label}
                                    </div>
                                  </button>
                                );
                              })}
                          </div>
                        </div>

                        {/* Column 3: Rules & Evidence */}
                        <div className="space-y-2">
                          <div className="text-[11px] font-mono text-[#C3CDBF] uppercase font-bold">
                            Policy & Evidence
                          </div>
                          <div className="space-y-2">
                            {graphData.nodes
                              .filter((n) => n.type === "rule" || n.type === "evidence")
                              .map((node) => {
                                const isSelected = selectedNode?.id === node.id;
                                const isEv = node.type === "evidence";
                                return (
                                  <button
                                    key={node.id}
                                    onClick={() => setSelectedNode(node)}
                                    className={`w-full text-left p-2.5 rounded-xl text-xs font-mono transition-all ${
                                      isSelected
                                        ? isEv
                                          ? "bg-[#A7D76B]/20 border border-[#A7D76B] text-[#F4F1E8]"
                                          : "bg-[#F4F1E8]/20 border border-[#F4F1E8] text-[#F4F1E8]"
                                        : "bg-[#101F17] border border-[rgba(230,240,224,0.08)] text-[#C3CDBF] hover:border-[#A7D76B]/50"
                                    }`}
                                  >
                                    <div
                                      className={`text-[10px] font-bold truncate ${
                                        isEv ? "text-[#A7D76B]" : "text-[#8D9D8E]"
                                      }`}
                                    >
                                      {isEv ? "DOC EVIDENCE" : "RULE"}
                                    </div>
                                    <div className="truncate font-sans font-medium text-[11px]">
                                      {node.label}
                                    </div>
                                  </button>
                                );
                              })}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Verification Terminology Legend */}
                    <div className="mt-6 pt-4 border-t border-[rgba(230,240,224,0.06)] flex flex-wrap gap-4 text-[11px] font-mono text-[#8D9D8E]">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-[#A7D76B]" />
                        Detected (Pattern)
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-[#E5BD75]" />
                        Flagged (Policy Rule)
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-[#C3CDBF]" />
                        Evidence Attached
                      </span>
                    </div>
                  </div>

                  {/* Selected Node Detail Panel */}
                  <div className="p-6 rounded-3xl bg-[#101F17] border border-[rgba(230,240,224,0.09)] space-y-4">
                    <div className="text-xs font-mono text-[#A7D76B] uppercase tracking-wider">
                      {"//"} Node Inspector
                    </div>
                    {selectedNode ? (
                      <div className="space-y-4 text-xs">
                        <div>
                          <div className="text-[10px] font-mono text-[#8D9D8E] uppercase">
                            Identifier / Type
                          </div>
                          <div className="text-sm font-bold text-[#F4F1E8] font-mono">
                            {selectedNode.id} ({selectedNode.type.toUpperCase()})
                          </div>
                        </div>

                        <div>
                          <div className="text-[10px] font-mono text-[#8D9D8E] uppercase">
                            Label / Content
                          </div>
                          <div className="text-xs text-[#F4F1E8] bg-[#07110D] p-3 rounded-xl border border-[rgba(230,240,224,0.06)]">
                            {selectedNode.label}
                          </div>
                        </div>

                        {Boolean(selectedNode.details?.reason) && (
                          <div>
                            <div className="text-[10px] font-mono text-[#8D9D8E] uppercase">
                              Detection Reason
                            </div>
                            <div className="text-xs text-[#C3CDBF] mt-1">
                              {String(selectedNode.details.reason)}
                            </div>
                          </div>
                        )}

                        {Boolean(selectedNode.details?.suggestion) && (
                          <div>
                            <div className="text-[10px] font-mono text-[#8D9D8E] uppercase">
                              Compliant Suggestion
                            </div>
                            <div className="text-xs text-[#A7D76B] font-mono bg-[#A7D76B]/10 p-2.5 rounded-xl border border-[#A7D76B]/25 mt-1">
                              {String(selectedNode.details.suggestion)}
                            </div>
                          </div>
                        )}

                        {Boolean(selectedNode.details?.approved_stat) && (
                          <div>
                            <div className="text-[10px] font-mono text-[#8D9D8E] uppercase">
                              Approved Evidence Stat
                            </div>
                            <div className="text-xs text-[#A8D6A0] font-mono bg-[#A8D6A0]/10 p-2.5 rounded-xl border border-[#A8D6A0]/25 mt-1">
                              {String(selectedNode.details.approved_stat)}
                            </div>
                          </div>
                        )}

                        <div>
                          <div className="text-[10px] font-mono text-[#8D9D8E] uppercase">
                            Verification Status
                          </div>
                          <div className="text-xs font-mono text-[#F4F1E8] mt-1 uppercase">
                            {selectedNode.status.replace("_", " ")}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-[#8D9D8E] font-mono">
                        Select a node from the canvas to inspect its parameters.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* View Mode 2: Relational Table */}
              {graphViewMode === "table" && (
                <div className="rounded-3xl bg-[#101F17] border border-[rgba(230,240,224,0.09)] overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs font-mono">
                      <thead className="bg-[#07110D] border-b border-[rgba(230,240,224,0.08)] text-[#8D9D8E]">
                        <tr>
                          <th className="py-3 px-4">Claim Candidate</th>
                          <th className="py-3 px-4">Category</th>
                          <th className="py-3 px-4">Confidence</th>
                          <th className="py-3 px-4">Original Sentence</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[rgba(230,240,224,0.06)]">
                        {graphData.claims.map((c) => (
                          <tr key={c.id} className="hover:bg-[#07110D]/50">
                            <td className="py-3 px-4 font-bold text-[#F4F1E8]">
                              &quot;{c.matched_text}&quot;
                            </td>
                            <td className="py-3 px-4 text-[#A7D76B]">{c.category}</td>
                            <td className="py-3 px-4 text-[#8D9D8E]">{c.confidence}</td>
                            <td className="py-3 px-4 text-[#C3CDBF] font-sans text-xs">
                              {c.sentence}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          FEATURE 2: ADVERSARIAL BRAND RED TEAM
          ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "redteam" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-[#F4F1E8]">
                Adversarial Brand Red Team
              </h2>
              <p className="text-xs text-[#C3CDBF]">
                Automated regression & robustness suite measuring evaluator consistency against balanced positive and control statements.
              </p>
            </div>
            <button
              onClick={handleRunRedTeam}
              disabled={redTeamLoading}
              className="btn-forest-primary text-xs px-4 py-2"
            >
              {redTeamLoading ? "Running Benchmark..." : "Run Red Team Tests ⚡"}
            </button>
          </div>

          {redTeamError && (
            <div className="p-4 rounded-xl bg-[#EF9187]/15 border border-[#EF9187] text-xs font-mono text-[#EF9187]">
              {redTeamError}
            </div>
          )}

          {/* Initial State */}
          {!redTeamData && !redTeamLoading && (
            <div className="p-12 text-center rounded-3xl bg-[#101F17] border border-[rgba(230,240,224,0.08)] space-y-4">
              <div className="w-12 h-12 mx-auto rounded-full bg-[#07110D] flex items-center justify-center text-xl text-[#A7D76B]">
                🛡️
              </div>
              <h3 className="text-base font-bold text-[#F4F1E8]">
                Red Team Suite Ready
              </h3>
              <p className="text-xs text-[#C3CDBF] max-w-md mx-auto">
                Evaluates 16+ balanced test cases covering all 7 supported brand compliance categories and negative controls to compute recall, precision, and outcome pass rate.
              </p>
              <button onClick={handleRunRedTeam} className="btn-forest-secondary text-xs px-4 py-2">
                Execute Red Team Suite
              </button>
            </div>
          )}

          {/* Results Dashboard */}
          {redTeamData && (
            <div className="space-y-6">
              {/* Telemetry Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 font-mono text-xs">
                <div className="p-4 rounded-2xl bg-[#101F17] border border-[rgba(230,240,224,0.08)]">
                  <div className="text-[#8D9D8E]">PASS RATE</div>
                  <div className="text-3xl font-extrabold text-[#A7D76B] mt-1">
                    {redTeamData.metrics.expected_outcome_pass_rate}%
                  </div>
                  <div className="text-[11px] text-[#8D9D8E] mt-1">
                    {redTeamData.metrics.passed_cases} / {redTeamData.metrics.total_cases} passed
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-[#101F17] border border-[rgba(230,240,224,0.08)]">
                  <div className="text-[#8D9D8E]">PRECISION (TP / TP+FP)</div>
                  <div className="text-3xl font-extrabold text-[#F4F1E8] mt-1">
                    {typeof redTeamData.metrics.precision === "number"
                      ? `${(redTeamData.metrics.precision * 100).toFixed(0)}%`
                      : "N/A"}
                  </div>
                  <div className="text-[11px] text-[#8D9D8E] mt-1">
                    TP: {redTeamData.metrics.true_positives} {"//"} FP: {redTeamData.metrics.false_positives}
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-[#101F17] border border-[rgba(230,240,224,0.08)]">
                  <div className="text-[#8D9D8E]">RECALL (TP / TP+FN)</div>
                  <div className="text-3xl font-extrabold text-[#F4F1E8] mt-1">
                    {typeof redTeamData.metrics.recall === "number"
                      ? `${(redTeamData.metrics.recall * 100).toFixed(0)}%`
                      : "N/A"}
                  </div>
                  <div className="text-[11px] text-[#8D9D8E] mt-1">
                    TN: {redTeamData.metrics.true_negatives} {"//"} FN: {redTeamData.metrics.false_negatives}
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-[#101F17] border border-[rgba(230,240,224,0.08)]">
                  <div className="text-[#8D9D8E]">EXECUTION TIME</div>
                  <div className="text-3xl font-extrabold text-[#A7D76B] mt-1">
                    {redTeamData.metrics.execution_duration_ms} ms
                  </div>
                  <div className="text-[11px] text-[#8D9D8E] mt-1">
                    Version: {redTeamData.suite_version}
                  </div>
                </div>
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center justify-between border-b border-[rgba(230,240,224,0.08)] pb-2 text-xs font-mono">
                <div className="flex gap-2">
                  <button
                    onClick={() => setRedTeamFilter("all")}
                    className={`px-3 py-1 rounded ${
                      redTeamFilter === "all"
                        ? "bg-[#101F17] text-[#A7D76B] font-bold"
                        : "text-[#8D9D8E]"
                    }`}
                  >
                    All Cases ({redTeamData.results.length})
                  </button>
                  <button
                    onClick={() => setRedTeamFilter("passed")}
                    className={`px-3 py-1 rounded ${
                      redTeamFilter === "passed"
                        ? "bg-[#101F17] text-[#A8D6A0] font-bold"
                        : "text-[#8D9D8E]"
                    }`}
                  >
                    Passed ({redTeamData.metrics.passed_cases})
                  </button>
                  <button
                    onClick={() => setRedTeamFilter("failed")}
                    className={`px-3 py-1 rounded ${
                      redTeamFilter === "failed"
                        ? "bg-[#101F17] text-[#EF9187] font-bold"
                        : "text-[#8D9D8E]"
                    }`}
                  >
                    Failed ({redTeamData.metrics.failed_cases})
                  </button>
                </div>
                <span className="text-[#8D9D8E] hidden sm:block">
                  Evaluated At: {redTeamData.executed_at}
                </span>
              </div>

              {/* Case Cards */}
              <div className="space-y-3">
                {redTeamData.results
                  .filter((c) => {
                    if (redTeamFilter === "passed") return c.passed;
                    if (redTeamFilter === "failed") return !c.passed;
                    return true;
                  })
                  .map((caseItem) => (
                    <div
                      key={caseItem.case_id}
                      className={`p-4 rounded-2xl border transition-all ${
                        caseItem.passed
                          ? "bg-[#101F17] border-[rgba(230,240,224,0.08)]"
                          : "bg-[#EF9187]/10 border-[#EF9187]/40"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-[#F4F1E8]">
                            {caseItem.case_id}
                          </span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#07110D] text-[#8D9D8E] uppercase">
                            {caseItem.category}
                          </span>
                        </div>
                        <span
                          className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                            caseItem.passed
                              ? "bg-[#A7D76B]/20 text-[#A7D76B]"
                              : "bg-[#EF9187]/20 text-[#EF9187]"
                          }`}
                        >
                          {caseItem.passed ? "PASSED" : "FAILED"}
                        </span>
                      </div>

                      <div className="p-3 rounded-xl bg-[#07110D] font-mono text-xs text-[#C3CDBF] mb-2">
                        &quot;{caseItem.input_text}&quot;
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-[#8D9D8E]">
                        <div>
                          <span>Expected: </span>
                          <span className="text-[#F4F1E8]">
                            {caseItem.expected_rule_ids.length > 0
                              ? caseItem.expected_rule_ids.join(", ")
                              : "[None - Control]"}
                          </span>
                        </div>
                        <div>
                          <span>Actual: </span>
                          <span className="text-[#A7D76B]">
                            {caseItem.actual_rule_ids.length > 0
                              ? caseItem.actual_rule_ids.join(", ")
                              : "[None]"}
                          </span>
                        </div>
                      </div>

                      {caseItem.failure_explanation && (
                        <div className="mt-2 text-xs text-[#EF9187] font-mono bg-[#EF9187]/10 p-2 rounded">
                          {caseItem.failure_explanation}
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          FEATURE 3: CAMPAIGN RISK DIGITAL TWIN
          ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "twin" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-[#F4F1E8]">
                Campaign Risk Digital Twin
              </h2>
              <p className="text-xs text-[#C3CDBF]">
                Evaluate identical copy simultaneously under Website, Social Media, and Paid Ad policy profiles.
              </p>
            </div>
            <button
              onClick={handleRunDigitalTwin}
              disabled={twinLoading}
              className="btn-forest-primary text-xs px-4 py-2"
            >
              {twinLoading ? "Evaluating Twin..." : "Evaluate Digital Twin ↗"}
            </button>
          </div>

          {twinError && (
            <div className="p-4 rounded-xl bg-[#EF9187]/15 border border-[#EF9187] text-xs font-mono text-[#EF9187]">
              {twinError}
            </div>
          )}

          {!twinData && !twinLoading && (
            <div className="p-12 text-center rounded-3xl bg-[#101F17] border border-[rgba(230,240,224,0.08)] space-y-4">
              <div className="w-12 h-12 mx-auto rounded-full bg-[#07110D] flex items-center justify-center text-xl text-[#A7D76B]">
                🌐
              </div>
              <h3 className="text-base font-bold text-[#F4F1E8]">
                Multi-Channel Twin Ready
              </h3>
              <p className="text-xs text-[#C3CDBF] max-w-md mx-auto">
                Evaluates common marketing copy across 3 distinct channels with channel-specific disclaimer checks, FTC substantiation rules, and capped risk scores.
              </p>
              <button onClick={handleRunDigitalTwin} className="btn-forest-secondary text-xs px-4 py-2">
                Run Simulation for Selected Review
              </button>
            </div>
          )}

          {twinData && (
            <div className="space-y-6">
              {/* Content Fingerprint Badge */}
              <div className="flex flex-wrap items-center justify-between p-3 rounded-xl bg-[#101F17] border border-[rgba(230,240,224,0.08)] text-xs font-mono text-[#8D9D8E]">
                <div className="flex items-center gap-2">
                  <span>SHA-256 FINGERPRINT:</span>
                  <span className="text-[#A7D76B]">{twinData.input_fingerprint.slice(0, 16)}...</span>
                </div>
                <div>
                  <span>EVALUATED AT: </span>
                  <span className="text-[#F4F1E8]">{twinData.evaluated_at}</span>
                </div>
              </div>

              {/* 3 Channel Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {Object.values(twinData.channels).map((channel) => {
                  const isHigh = channel.risk_score >= 60;
                  const isMod = channel.risk_score >= 40 && channel.risk_score < 60;
                  const bandColor = isHigh
                    ? "text-[#EF9187]"
                    : isMod
                    ? "text-[#E5BD75]"
                    : "text-[#A7D76B]";

                  return (
                    <div
                      key={channel.channel_id}
                      className="p-6 rounded-3xl bg-[#101F17] border border-[rgba(230,240,224,0.09)] space-y-4 flex flex-col justify-between"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-mono font-bold text-[#F4F1E8]">
                            {channel.display_name}
                          </span>
                          <span
                            className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase ${bandColor} bg-[#07110D]`}
                          >
                            {channel.risk_band}
                          </span>
                        </div>

                        {/* Score Gauge */}
                        <div className="p-4 rounded-2xl bg-[#07110D] text-center border border-[rgba(230,240,224,0.06)]">
                          <div className={`text-4xl font-extrabold ${bandColor} font-mono`}>
                            {channel.risk_score}
                            <span className="text-xs text-[#8D9D8E] font-normal"> / 100</span>
                          </div>
                          <div className="text-[11px] font-mono text-[#8D9D8E] mt-1">
                            Status: {channel.status}
                          </div>
                        </div>

                        {/* Severity Breakdown */}
                        <div className="grid grid-cols-3 gap-2 text-center font-mono text-[11px]">
                          <div className="p-2 rounded bg-[#07110D] text-[#EF9187]">
                            <div>HIGH</div>
                            <div className="font-bold">{channel.severity_breakdown.high || 0}</div>
                          </div>
                          <div className="p-2 rounded bg-[#07110D] text-[#E5BD75]">
                            <div>MED</div>
                            <div className="font-bold">{channel.severity_breakdown.medium || 0}</div>
                          </div>
                          <div className="p-2 rounded bg-[#07110D] text-[#A8D6A0]">
                            <div>LOW</div>
                            <div className="font-bold">{channel.severity_breakdown.low || 0}</div>
                          </div>
                        </div>

                        {/* Missing Disclaimer Warnings */}
                        {channel.missing_disclaimer_warnings.length > 0 && (
                          <div className="space-y-1">
                            <div className="text-[10px] font-mono text-[#E5BD75] uppercase font-bold">
                              Required Disclaimers:
                            </div>
                            {channel.missing_disclaimer_warnings.map((warn, wIdx) => (
                              <div
                                key={wIdx}
                                className="text-[11px] text-[#E5BD75] bg-[#E5BD75]/10 p-2 rounded-lg border border-[#E5BD75]/25"
                              >
                                {warn}
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="text-xs text-[#C3CDBF] leading-relaxed pt-2 border-t border-[rgba(230,240,224,0.06)]">
                          {channel.score_explanation}
                        </div>
                      </div>

                      <div className="text-[11px] font-mono text-[#8D9D8E] pt-2 border-t border-[rgba(230,240,224,0.06)] flex justify-between">
                        <span>Total Findings:</span>
                        <span className="text-[#F4F1E8] font-bold">{channel.findings_count}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Summary Methodology */}
              <div className="p-5 rounded-2xl bg-[#0B1711] border border-[rgba(230,240,224,0.08)] text-xs text-[#C3CDBF] font-mono space-y-2">
                <div className="text-[#A7D76B] font-bold uppercase">
                  {"//"} Twin Comparative Analysis
                </div>
                <div>
                  Highest Exposure Channel:{" "}
                  <span className="text-[#EF9187] font-bold uppercase">
                    {twinData.summary_comparison.highest_risk_channel} (
                    {twinData.summary_comparison.highest_risk_score} pts)
                  </span>
                  {" // "}
                  Lowest Exposure:{" "}
                  <span className="text-[#A7D76B] font-bold uppercase">
                    {twinData.summary_comparison.lowest_risk_channel} (
                    {twinData.summary_comparison.lowest_risk_score} pts)
                  </span>
                </div>
                <div className="text-[#8D9D8E]">
                  Formula: min(100, sum(unique finding weights: high=25, medium=12, low=5)). All channels evaluate identical content without stochastic variation.
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          FEATURE 4: POLICY CHANGE IMPACT SIMULATOR
          ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "simulator" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-[#F4F1E8]">
                Policy Change Impact Simulator
              </h2>
              <p className="text-xs text-[#C3CDBF]">
                Test what happens when policies are disabled or modified in an isolated in-memory sandbox.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setDisabledRules([])}
                className="btn-forest-secondary text-xs px-3 py-2"
              >
                Reset to Baseline
              </button>
              <button
                onClick={handleRunSimulation}
                disabled={simLoading}
                className="btn-forest-primary text-xs px-4 py-2"
              >
                {simLoading ? "Simulating..." : "Run Simulation ⚡"}
              </button>
            </div>
          </div>

          {/* Sandbox Notice Banner */}
          <div className="p-4 rounded-2xl bg-[#101F17] border border-[#A7D76B]/25 text-xs text-[#C3CDBF] font-mono flex items-center justify-between">
            <span className="flex items-center gap-2">
              <span className="text-[#A7D76B]">ℹ️</span>
              <span>ISOLATED SIMULATION: Global rules and database records will NOT be mutated.</span>
            </span>
            <span className="text-[#8D9D8E]">
              Disabled Rules: {disabledRules.length} / {ALL_RULES.length}
            </span>
          </div>

          {simError && (
            <div className="p-4 rounded-xl bg-[#EF9187]/15 border border-[#EF9187] text-xs font-mono text-[#EF9187]">
              {simError}
            </div>
          )}

          {/* Rule Toggle Grid */}
          <div className="p-6 rounded-3xl bg-[#101F17] border border-[rgba(230,240,224,0.09)] space-y-4">
            <div className="text-xs font-mono text-[#A7D76B] uppercase font-bold">
              {"//"} Active Policy Toggles (Toggle to Simulate Change)
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {ALL_RULES.map((rule) => {
                const isDisabled = disabledRules.includes(rule.id);
                return (
                  <button
                    key={rule.id}
                    onClick={() => {
                      if (isDisabled) {
                        setDisabledRules((prev) => prev.filter((id) => id !== rule.id));
                      } else {
                        setDisabledRules((prev) => [...prev, rule.id]);
                      }
                    }}
                    className={`p-3 rounded-xl border text-left text-xs font-mono transition-all flex items-center justify-between ${
                      isDisabled
                        ? "bg-[#07110D] border-[rgba(230,240,224,0.08)] text-[#8D9D8E]"
                        : "bg-[#0B1711] border-[#A7D76B]/40 text-[#F4F1E8]"
                    }`}
                  >
                    <span className="truncate pr-2">{rule.name}</span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        isDisabled
                          ? "bg-[#EF9187]/20 text-[#EF9187]"
                          : "bg-[#A7D76B]/20 text-[#A7D76B]"
                      }`}
                    >
                      {isDisabled ? "DISABLED" : "ACTIVE"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Simulation Output */}
          {simData && (
            <div className="space-y-6">
              {/* Delta Telemetry */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 font-mono text-xs">
                <div className="p-4 rounded-2xl bg-[#101F17] border border-[rgba(230,240,224,0.08)]">
                  <div className="text-[#8D9D8E]">BASELINE FINDINGS</div>
                  <div className="text-3xl font-bold text-[#F4F1E8] mt-1">
                    {simData.summary.baseline_findings_count}
                  </div>
                </div>
                <div className="p-4 rounded-2xl bg-[#101F17] border border-[rgba(230,240,224,0.08)]">
                  <div className="text-[#8D9D8E]">SIMULATED FINDINGS</div>
                  <div className="text-3xl font-bold text-[#A7D76B] mt-1">
                    {simData.summary.simulated_findings_count}
                  </div>
                </div>
                <div className="p-4 rounded-2xl bg-[#101F17] border border-[rgba(230,240,224,0.08)]">
                  <div className="text-[#8D9D8E]">RESOLVED (SUPPRESSED)</div>
                  <div className="text-3xl font-bold text-[#E5BD75] mt-1">
                    {simData.summary.resolved_count}
                  </div>
                </div>
                <div className="p-4 rounded-2xl bg-[#101F17] border border-[rgba(230,240,224,0.08)]">
                  <div className="text-[#8D9D8E]">NET CHANGE</div>
                  <div
                    className={`text-3xl font-bold mt-1 ${
                      simData.summary.net_change < 0
                        ? "text-[#A8D6A0]"
                        : simData.summary.net_change > 0
                        ? "text-[#EF9187]"
                        : "text-[#C3CDBF]"
                    }`}
                  >
                    {simData.summary.net_change > 0 ? `+${simData.summary.net_change}` : simData.summary.net_change}
                  </div>
                </div>
              </div>

              {/* Classified Findings List */}
              <div className="rounded-3xl bg-[#101F17] border border-[rgba(230,240,224,0.09)] overflow-hidden">
                <div className="p-4 border-b border-[rgba(230,240,224,0.08)] text-xs font-mono font-bold text-[#F4F1E8]">
                  Finding Classifications (Before vs After)
                </div>
                <div className="divide-y divide-[rgba(230,240,224,0.06)]">
                  {simData.findings.map((f, fIdx) => (
                    <div key={fIdx} className="p-4 space-y-2 text-xs font-mono">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[#F4F1E8]">{f.rule_id}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-[#07110D] text-[#8D9D8E] uppercase">
                            {f.severity}
                          </span>
                        </div>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                            f.classification === "resolved_in_simulation"
                              ? "bg-[#E5BD75]/20 text-[#E5BD75]"
                              : f.classification === "newly_flagged"
                              ? "bg-[#EF9187]/20 text-[#EF9187]"
                              : "bg-[#8D9D8E]/20 text-[#C3CDBF]"
                          }`}
                        >
                          {f.classification.replace("_", " ")}
                        </span>
                      </div>
                      <div className="p-2.5 rounded bg-[#07110D] text-[#C3CDBF]">
                        &quot;{f.text}&quot;
                      </div>
                      <div className="text-[11px] text-[#8D9D8E] italic">
                        Note: {f.note}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          FEATURE 5: TRUST LEDGER & EXPLAINABILITY
          ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "ledger" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-[#F4F1E8]">
                Trust Ledger & Explainability
              </h2>
              <p className="text-xs text-[#C3CDBF]">
                Cryptographic SHA-256 audit artifacts, content integrity verification, and verifiable compliance records.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleLoadLedger}
                disabled={ledgerLoading}
                className="btn-forest-secondary text-xs px-4 py-2"
              >
                {ledgerLoading ? "Loading..." : "Inspect Stored Ledger"}
              </button>
              {ledgerData && (
                <button
                  onClick={handleDownloadLedgerJSON}
                  className="btn-forest-primary text-xs px-4 py-2"
                >
                  Download JSON Audit ⬇
                </button>
              )}
            </div>
          </div>

          {ledgerError && (
            <div className="p-4 rounded-xl bg-[#EF9187]/15 border border-[#EF9187] text-xs font-mono text-[#EF9187]">
              {ledgerError}
            </div>
          )}

          {!ledgerData && !ledgerLoading && (
            <div className="p-12 text-center rounded-3xl bg-[#101F17] border border-[rgba(230,240,224,0.08)] space-y-4">
              <div className="w-12 h-12 mx-auto rounded-full bg-[#07110D] flex items-center justify-center text-xl text-[#A7D76B]">
                📜
              </div>
              <h3 className="text-base font-bold text-[#F4F1E8]">
                Audit Ledger Exporter
              </h3>
              <p className="text-xs text-[#C3CDBF] max-w-md mx-auto">
                Generate a versioned JSON audit package containing cryptographic SHA-256 content hashes, policy findings, evidence links, and human decisions.
              </p>
              <button onClick={handleLoadLedger} className="btn-forest-secondary text-xs px-4 py-2">
                Generate Ledger for Selected Review
              </button>
            </div>
          )}

          {ledgerData && (
            <div className="space-y-6">
              {/* Ledger Metadata Card */}
              <div className="p-6 rounded-3xl bg-[#101F17] border border-[rgba(230,240,224,0.09)] space-y-4 font-mono text-xs">
                <div className="flex items-center justify-between border-b border-[rgba(230,240,224,0.08)] pb-3">
                  <span className="text-[#8D9D8E]">AUDIT SCHEMA VERSION</span>
                  <span className="text-[#A7D76B] font-bold">{ledgerData.schema_version}</span>
                </div>

                <div className="flex items-center justify-between border-b border-[rgba(230,240,224,0.08)] pb-3">
                  <span className="text-[#8D9D8E]">REVIEW IDENTIFIER</span>
                  <span className="text-[#F4F1E8]">{ledgerData.review_id}</span>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[rgba(230,240,224,0.08)] pb-3">
                  <span className="text-[#8D9D8E]">CONTENT FINGERPRINT (SHA-256)</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[#A7D76B] font-bold text-[11px] truncate max-w-xs">
                      {ledgerData.content_fingerprint}
                    </span>
                    <button
                      onClick={() =>
                        copyToClipboard(ledgerData.content_fingerprint, "hash")
                      }
                      className="px-2 py-1 rounded bg-[#07110D] border border-[rgba(230,240,224,0.1)] text-[10px] text-[#C3CDBF] hover:text-[#A7D76B]"
                    >
                      {copyStatus === "hash" ? "Copied!" : "Copy"}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between border-b border-[rgba(230,240,224,0.08)] pb-3">
                  <span className="text-[#8D9D8E]">AUDIT GENERATED TIMESTAMP</span>
                  <span className="text-[#F4F1E8]">{ledgerData.audit_generated_at}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[#8D9D8E]">POLICIES FLAGGED IN LEDGER</span>
                  <span className="text-[#F4F1E8] font-bold">
                    {ledgerData.triggered_rule_ids.length} rule types
                  </span>
                </div>
              </div>

              {/* Cryptographic Verifier Box */}
              <div className="p-6 rounded-3xl bg-[#0B1711] border border-[rgba(230,240,224,0.09)] space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-[#A7D76B] font-bold uppercase">
                    {"//"} Cryptographic Integrity Verifier
                  </span>
                  <span className="text-[11px] font-mono text-[#8D9D8E]">
                    Tamper Detection Engine
                  </span>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-mono text-[#8D9D8E] mb-1">
                      Content to Verify (Edit single character to test tamper detection):
                    </label>
                    <textarea
                      value={verifyContentInput}
                      onChange={(e) => setVerifyContentInput(e.target.value)}
                      rows={3}
                      className="w-full bg-[#07110D] text-xs font-mono text-[#F4F1E8] p-3 rounded-xl border border-[rgba(230,240,224,0.15)] focus:border-[#A7D76B] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono text-[#8D9D8E] mb-1">
                      Expected SHA-256 Digest:
                    </label>
                    <input
                      type="text"
                      value={verifyHashInput}
                      onChange={(e) => setVerifyHashInput(e.target.value)}
                      className="w-full bg-[#07110D] text-xs font-mono text-[#A7D76B] p-2.5 rounded-xl border border-[rgba(230,240,224,0.15)] focus:border-[#A7D76B] focus:outline-none"
                    />
                  </div>

                  <div className="flex justify-end">
                    <button
                      onClick={handleVerifyDigest}
                      disabled={verifyLoading}
                      className="btn-forest-primary text-xs px-4 py-2"
                    >
                      {verifyLoading ? "Computing Hash..." : "Verify Content Integrity ⚡"}
                    </button>
                  </div>
                </div>

                {/* Verification Result Banner */}
                {verifyResult && (
                  <div
                    className={`p-4 rounded-2xl border text-xs font-mono space-y-1 ${
                      verifyResult.status === "MATCH"
                        ? "bg-[#A7D76B]/15 border-[#A7D76B] text-[#A7D76B]"
                        : verifyResult.status === "MISMATCH"
                        ? "bg-[#EF9187]/15 border-[#EF9187] text-[#EF9187]"
                        : "bg-[#E5BD75]/15 border-[#E5BD75] text-[#E5BD75]"
                    }`}
                  >
                    <div className="font-bold flex items-center gap-2">
                      <span>
                        {verifyResult.status === "MATCH" ? "✓" : "✗"} STATUS:{" "}
                        {verifyResult.status}
                      </span>
                    </div>
                    <div>{verifyResult.explanation}</div>
                    <div className="text-[11px] opacity-80 pt-1">
                      {verifyResult.limitations}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
