"use client";

import React from "react";
import { HumanDecision } from "@/lib/api";

interface FindingDecisionControlProps {
  reviewId: string;
  findingId: string;
  decision?: HumanDecision;
  isActing?: "accepted" | "rejected" | null;
  actionError?: string | null;
  onDecide: (
    findingId: string,
    action: "accepted" | "rejected",
    reviewId: string
  ) => Promise<void> | void;
  compact?: boolean;
}

/**
 * FindingDecisionControl
 *
 * Authoritative, state-dependent decision lifecycle component for BrandProof findings.
 * Enforces strict state boundaries:
 * - Pending: Renders 'Accept Suggestion' and 'Reject' actions.
 * - Accepted: Renders clear '✓ Recorded Accepted' badge; does NOT render Accept as pending.
 * - Rejected: Renders clear '✕ Recorded Rejected' badge; does NOT render Reject as pending.
 * - In Progress: Disables controls and prevents duplicate requests.
 * - Error: Displays message and offers retry.
 */
export default function FindingDecisionControl({
  reviewId,
  findingId,
  decision,
  isActing,
  actionError,
  onDecide,
  compact = false,
}: FindingDecisionControlProps) {
  const currentAction = decision?.action;
  const isBusy = Boolean(isActing);

  return (
    <div className={`space-y-2 ${compact ? "" : "w-full"}`}>
      <div
        className={`flex flex-wrap items-center justify-between gap-3 ${
          compact ? "text-[11px]" : "text-xs"
        }`}
      >
        {/* Left Status Label */}
        <div className="flex items-center gap-2">
          <span className="text-[#8D9D8E] font-mono">
            {compact ? "STATUS:" : "HUMAN DECISION:"}
          </span>
          {currentAction === "accepted" ? (
            <span className="font-mono font-semibold uppercase text-[#A8D6A0] flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#A8D6A0]" />
              <span>✓ Accepted</span>
            </span>
          ) : currentAction === "rejected" ? (
            <span className="font-mono font-semibold uppercase text-[#EF9187] flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#EF9187]" />
              <span>✕ Rejected</span>
            </span>
          ) : (
            <span className="font-mono text-[#E5BD75] font-semibold flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#E5BD75] animate-pulse" />
              <span>{compact ? "Pending" : "Pending Human Review"}</span>
            </span>
          )}
        </div>

        {/* Right Action Controls */}
        <div className="flex items-center gap-2.5">
          {/* Submitting in progress state */}
          {isBusy && (
            <span className="text-[11px] font-mono text-[#A7D76B] flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full border-2 border-[#A7D76B] border-t-transparent animate-spin" />
              <span>
                {isActing === "accepted"
                  ? "Recording acceptance..."
                  : "Recording rejection..."}
              </span>
            </span>
          )}

          {/* Pending: Show Accept and Reject actions */}
          {!currentAction && !isBusy && (
            <>
              <button
                id={`accept-finding-${findingId}`}
                type="button"
                onClick={() => onDecide(findingId, "accepted", reviewId)}
                disabled={isBusy}
                className={`btn-forest-primary font-semibold tracking-wider transition-all duration-150 cursor-pointer ${
                  compact ? "text-[10px] px-3 py-1" : "text-xs px-4 py-2"
                }`}
              >
                ✓ {compact ? "Accept" : "Accept Suggestion"}
              </button>
              <button
                id={`reject-finding-${findingId}`}
                type="button"
                onClick={() => onDecide(findingId, "rejected", reviewId)}
                disabled={isBusy}
                className={`btn-forest-danger font-semibold tracking-wider transition-all duration-150 cursor-pointer ${
                  compact ? "text-[10px] px-3 py-1" : "text-xs px-4 py-2"
                }`}
              >
                ✕ Reject
              </button>
            </>
          )}

          {/* Accepted: Show prominent Accepted state pill; DO NOT show Accept button as pending */}
          {currentAction === "accepted" && !isBusy && (
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-[#15271D] border border-[rgba(167,215,107,0.35)] text-[#A7D76B] font-mono text-[11px] font-bold">
                ✓ Recorded Accepted
              </span>
              <button
                id={`change-reject-${findingId}`}
                type="button"
                onClick={() => onDecide(findingId, "rejected", reviewId)}
                disabled={isBusy}
                className="text-[11px] font-mono text-[#8D9D8E] hover:text-[#EF9187] underline transition-colors cursor-pointer"
                title="Change human decision to Rejected"
              >
                Change to Reject
              </button>
            </div>
          )}

          {/* Rejected: Show prominent Rejected state pill; DO NOT show Reject button as pending */}
          {currentAction === "rejected" && !isBusy && (
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-[#2D1614] border border-[#EF9187]/30 text-[#EF9187] font-mono text-[11px] font-bold">
                ✕ Recorded Rejected
              </span>
              <button
                id={`change-accept-${findingId}`}
                type="button"
                onClick={() => onDecide(findingId, "accepted", reviewId)}
                disabled={isBusy}
                className="text-[11px] font-mono text-[#8D9D8E] hover:text-[#A7D76B] underline transition-colors cursor-pointer"
                title="Change human decision to Accepted"
              >
                Change to Accept
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Decision error with retry option */}
      {actionError && (
        <div className="p-2.5 rounded-xl bg-[#EF9187]/15 border border-[#EF9187]/40 text-[#EF9187] text-xs font-mono flex items-center justify-between gap-2">
          <span>Action failed: {actionError}</span>
          <button
            type="button"
            onClick={() => onDecide(findingId, "accepted", reviewId)}
            className="underline hover:text-white cursor-pointer text-[11px]"
          >
            Retry Accept
          </button>
        </div>
      )}
    </div>
  );
}
