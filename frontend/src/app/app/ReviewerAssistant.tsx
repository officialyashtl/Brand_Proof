"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  ReviewResponse,
  Finding,
  QuestionResponse,
  askReviewQuestion,
  FINDING_TYPE_LABELS,
} from "@/lib/api";

// ─── Inline Self-Contained SVG Icons ──────────────────────────────────────────

function SparklesIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
      <path d="M5 3v4" />
      <path d="M19 17v4" />
      <path d="M3 5h4" />
      <path d="M17 19h4" />
    </svg>
  );
}

function SendIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m22 2-7 20-4-9-9-4Z" />
      <path d="M22 2 11 13" />
    </svg>
  );
}

function SpinnerIcon({ className = "w-3.5 h-3.5 animate-spin" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

function AlertIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" x2="12" y1="8" y2="12" />
      <line x1="12" x2="12.01" y1="16" y2="16" />
    </svg>
  );
}

function CheckCircleIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <path d="m9 11 3 3L22 4" />
    </svg>
  );
}

function RotateCcwIcon({ className = "w-3 h-3" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
    </svg>
  );
}

function BotIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 8V4H8" />
      <rect width="16" height="12" x="4" y="8" rx="2" />
      <path d="M2 14h2" />
      <path d="M20 14h2" />
      <path d="M15 13v2" />
      <path d="M9 13v2" />
    </svg>
  );
}

function UserIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function XIcon({ className = "w-3 h-3" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

function HelpIcon({ className = "w-3 h-3" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <path d="M12 17h.01" />
    </svg>
  );
}

function LightbulbIcon({ className = "w-3 h-3" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" />
      <path d="M9 18h6" />
      <path d="M10 22h4" />
    </svg>
  );
}

// ─── Interfaces ──────────────────────────────────────────────────────────────

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  findingId?: string | null;
  source?: "gemini_ai" | "deterministic_fallback";
  modelName?: string | null;
  relatedRuleIds?: string[];
  relatedFindingIds?: string[];
  suggestedNextSteps?: string[];
}

interface ReviewerAssistantProps {
  review: ReviewResponse;
  activeFindingId?: string | null;
  onClearActiveFinding?: () => void;
  className?: string;
}

const QUICK_QUESTIONS = [
  "Why was this claim flagged?",
  "What evidence is missing?",
  "Which brand guideline applies?",
  "How can I rewrite this statement?",
  "What issues remain unresolved?",
  "Explain the findings in this review.",
];

export default function ReviewerAssistant({
  review,
  activeFindingId,
  onClearActiveFinding,
  className = "",
}: ReviewerAssistantProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFailedQuestion, setLastFailedQuestion] = useState<{
    question: string;
    findingId?: string | null;
  } | null>(null);

  const messageCounterRef = useRef(0);

  // Synchronize state during render when review changes
  const [activeReviewId, setActiveReviewId] = useState(review.review_id);
  if (activeReviewId !== review.review_id) {
    setActiveReviewId(review.review_id);
    setMessages([]);
    setError(null);
    setLastFailedQuestion(null);
  }

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const activeFinding: Finding | undefined = activeFindingId
    ? review.findings.find((f) => f.id === activeFindingId)
    : undefined;

  const handleSendQuestion = async (
    questionText: string,
    scopedFindingId?: string | null
  ) => {
    const trimmed = questionText.trim();
    if (!trimmed || isLoading) return;

    setError(null);
    setLastFailedQuestion(null);
    setIsLoading(true);

    const targetFindingId =
      scopedFindingId !== undefined ? scopedFindingId : activeFindingId || null;

    messageCounterRef.current += 1;
    const userMsg: ChatMessage = {
      id: `usr-${messageCounterRef.current}`,
      role: "user",
      content: trimmed,
      timestamp: "Just now",
      findingId: targetFindingId,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue("");

    try {
      const response: QuestionResponse = await askReviewQuestion(review.review_id, {
        question: trimmed,
        finding_id: targetFindingId,
      });

      messageCounterRef.current += 1;
      const assistantMsg: ChatMessage = {
        id: `asst-${messageCounterRef.current}`,
        role: "assistant",
        content: response.answer,
        timestamp: "Just now",
        findingId: response.finding_id,
        source: response.source,
        modelName: response.model_name,
        relatedRuleIds: response.related_rule_ids,
        relatedFindingIds: response.related_finding_ids,
        suggestedNextSteps: response.suggested_next_steps,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: unknown) {
      const errMsg =
        err instanceof Error ? err.message : "Failed to obtain response from assistant.";
      setError(errMsg);
      setLastFailedQuestion({ question: trimmed, findingId: targetFindingId });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSendQuestion(inputValue);
  };

  const handleRetry = () => {
    if (lastFailedQuestion) {
      handleSendQuestion(
        lastFailedQuestion.question,
        lastFailedQuestion.findingId
      );
    }
  };

  const welcomeMessage: ChatMessage = {
    id: `welcome-${review.review_id}`,
    role: "assistant",
    content: `I'm your **BrandProof Intelligence Assistant**. Review \`#${review.review_id.slice(
      0,
      8
    )}\` has **${review.findings.length} findings** across the \`${review.channel}\` channel. Ask me about specific policy rules, missing evidence, safe rewrites, or overall compliance status.`,
    timestamp: "Ready",
    source: "gemini_ai",
    suggestedNextSteps: [
      "Click a quick question below or ask in your own words.",
      "Select any finding to scope questions specifically to that claim.",
    ],
  };

  const displayMessages = messages.length > 0 ? messages : [welcomeMessage];

  return (
    <div
      className={`flex flex-col bg-[#07110D] border border-[rgba(230,240,224,0.12)] rounded-3xl overflow-hidden shadow-2xl backdrop-blur-xl ${className}`}
    >
      {/* Header */}
      <div className="px-6 py-4 bg-[#0B1711] border-b border-[rgba(230,240,224,0.08)] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[rgba(167,215,107,0.12)] border border-[rgba(167,215,107,0.25)] flex items-center justify-center text-[#A7D76B]">
            <SparklesIcon className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-[#F4F1E8] tracking-tight">
                Ask BrandProof
              </h3>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider rounded-full bg-[rgba(167,215,107,0.15)] text-[#A7D76B] border border-[rgba(167,215,107,0.3)]">
                AI Copilot
              </span>
            </div>
            <p className="text-[11px] text-[#8D9D8E] font-mono">
              Grounded in findings & policy for Review #{review.review_id.slice(0, 8)}
            </p>
          </div>
        </div>

        {/* Scope Indicator Pill */}
        {activeFinding ? (
          <div className="flex items-center gap-1.5 bg-[#102219] border border-[rgba(167,215,107,0.3)] px-3 py-1 rounded-full text-[11px] text-[#A7D76B]">
            <span className="font-mono">Finding [{activeFinding.id.slice(0, 6)}]:</span>
            <span className="max-w-[120px] truncate text-[#F4F1E8]">
              {FINDING_TYPE_LABELS[activeFinding.type] || activeFinding.type}
            </span>
            {onClearActiveFinding && (
              <button
                type="button"
                onClick={onClearActiveFinding}
                className="hover:text-white p-0.5 rounded-full hover:bg-[rgba(255,255,255,0.1)] transition-colors"
                title="Clear finding scope (ask about full review)"
              >
                <XIcon className="w-3 h-3" />
              </button>
            )}
          </div>
        ) : (
          <span className="hidden sm:inline-flex text-[11px] font-mono text-[#8D9D8E] bg-[rgba(230,240,224,0.04)] px-2.5 py-1 rounded-full border border-[rgba(230,240,224,0.06)]">
            Full Review Scope
          </span>
        )}
      </div>

      {/* Suggested Questions Pills */}
      <div className="px-6 py-2.5 bg-[#08140F] border-b border-[rgba(230,240,224,0.06)] flex items-center gap-2 overflow-x-auto scrollbar-none">
        <span className="text-[10px] font-mono uppercase tracking-wider text-[#8D9D8E] whitespace-nowrap flex items-center gap-1">
          <HelpIcon className="w-3 h-3 text-[#A7D76B]" /> Suggested:
        </span>
        {QUICK_QUESTIONS.map((q, idx) => (
          <button
            key={idx}
            type="button"
            disabled={isLoading}
            onClick={() => handleSendQuestion(q)}
            className="text-[11px] whitespace-nowrap bg-[#0D1C15] hover:bg-[#142A20] text-[#D0DCD0] hover:text-[#A7D76B] px-3 py-1 rounded-full border border-[rgba(230,240,224,0.08)] hover:border-[rgba(167,215,107,0.3)] transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-5 max-h-[460px] min-h-[280px]">
        {displayMessages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-3 ${
              msg.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            {msg.role === "assistant" && (
              <div className="w-7 h-7 rounded-lg bg-[rgba(167,215,107,0.12)] border border-[rgba(167,215,107,0.3)] flex items-center justify-center text-[#A7D76B] shrink-0 mt-0.5">
                <BotIcon className="w-4 h-4" />
              </div>
            )}

            <div
              className={`max-w-[85%] rounded-2xl p-4 text-xs leading-relaxed space-y-3 ${
                msg.role === "user"
                  ? "bg-[#142A20] text-[#F4F1E8] border border-[rgba(167,215,107,0.25)] rounded-tr-none"
                  : "bg-[#0B1711] text-[#E6F0E0] border border-[rgba(230,240,224,0.08)] rounded-tl-none shadow-lg"
              }`}
            >
              {/* Message Header / Meta */}
              <div className="flex items-center justify-between gap-3 text-[10px] font-mono text-[#8D9D8E] border-b border-[rgba(230,240,224,0.06)] pb-1.5">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-[#A7D76B]">
                    {msg.role === "user" ? "Reviewer" : "BrandProof AI"}
                  </span>
                  {msg.source && (
                    <span
                      className={`px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider font-mono ${
                        msg.source === "gemini_ai"
                          ? "bg-[rgba(167,215,107,0.15)] text-[#A7D76B] border border-[rgba(167,215,107,0.3)]"
                          : "bg-[rgba(230,240,224,0.1)] text-[#D0DCD0]"
                      }`}
                    >
                      {msg.source === "gemini_ai" ? "Gemini AI" : "Deterministic Engine"}
                    </span>
                  )}
                  {msg.findingId && (
                    <span className="text-[#8D9D8E]">
                      {"//"} Finding [{msg.findingId.slice(0, 6)}]
                    </span>
                  )}
                </div>
                <span>{msg.timestamp}</span>
              </div>

              {/* Message Body Content (formatted simple markdown) */}
              <div className="space-y-2 whitespace-pre-wrap text-[13px] leading-relaxed">
                {msg.content}
              </div>

              {/* Related Rules Tags */}
              {msg.relatedRuleIds && msg.relatedRuleIds.length > 0 && (
                <div className="pt-2 border-t border-[rgba(230,240,224,0.06)] flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] font-mono text-[#8D9D8E]">Related Rules:</span>
                  {msg.relatedRuleIds.map((rId, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-[#102219] text-[#A7D76B] border border-[rgba(167,215,107,0.2)]"
                    >
                      {FINDING_TYPE_LABELS[rId] || rId}
                    </span>
                  ))}
                </div>
              )}

              {/* Suggested Next Steps Checklist */}
              {msg.suggestedNextSteps && msg.suggestedNextSteps.length > 0 && (
                <div className="pt-2 border-t border-[rgba(230,240,224,0.06)] space-y-1.5 bg-[#08140F] p-3 rounded-xl border border-[rgba(230,240,224,0.05)]">
                  <div className="text-[10px] font-mono text-[#A7D76B] flex items-center gap-1 uppercase tracking-wider">
                    <LightbulbIcon className="w-3 h-3 text-[#A7D76B]" /> Recommended Actions:
                  </div>
                  <ul className="space-y-1">
                    {msg.suggestedNextSteps.map((step, sIdx) => (
                      <li
                        key={sIdx}
                        className="text-[11px] text-[#D0DCD0] flex items-start gap-1.5"
                      >
                        <CheckCircleIcon className="w-3.5 h-3.5 text-[#A7D76B] shrink-0 mt-0.5" />
                        <span>{step}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {msg.role === "user" && (
              <div className="w-7 h-7 rounded-lg bg-[#142A20] border border-[rgba(167,215,107,0.3)] flex items-center justify-center text-[#A7D76B] shrink-0 mt-0.5">
                <UserIcon className="w-4 h-4" />
              </div>
            )}
          </div>
        ))}

        {/* Inflight Loading Bubble */}
        {isLoading && (
          <div className="flex gap-3 justify-start items-center">
            <div className="w-7 h-7 rounded-lg bg-[rgba(167,215,107,0.12)] border border-[rgba(167,215,107,0.3)] flex items-center justify-center text-[#A7D76B] shrink-0">
              <BotIcon className="w-4 h-4" />
            </div>
            <div className="bg-[#0B1711] border border-[rgba(230,240,224,0.08)] rounded-2xl rounded-tl-none p-3.5 flex items-center gap-2.5 text-xs text-[#8D9D8E]">
              <SpinnerIcon className="w-3.5 h-3.5 text-[#A7D76B] animate-spin" />
              <span>Analyzing review evidence & brand compliance rules...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Error & Retry Banner */}
      {error && (
        <div className="px-6 py-2.5 bg-[rgba(239,68,68,0.1)] border-t border-b border-[rgba(239,68,68,0.25)] flex items-center justify-between gap-3 text-xs text-rose-300">
          <div className="flex items-center gap-2 truncate">
            <AlertIcon className="w-4 h-4 shrink-0 text-rose-400" />
            <span className="truncate">{error}</span>
          </div>
          {lastFailedQuestion && (
            <button
              type="button"
              onClick={handleRetry}
              disabled={isLoading}
              className="flex items-center gap-1 px-2.5 py-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 text-[11px] rounded-lg border border-rose-500/30 transition-colors shrink-0"
            >
              <RotateCcwIcon className="w-3 h-3" /> Retry
            </button>
          )}
        </div>
      )}

      {/* Input Form */}
      <form
        onSubmit={handleFormSubmit}
        className="p-4 bg-[#0B1711] border-t border-[rgba(230,240,224,0.08)] flex items-center gap-2"
      >
        <div className="relative flex-1">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            disabled={isLoading}
            placeholder={
              activeFinding
                ? `Ask about Finding [${activeFinding.id.slice(0, 6)}] or why it was flagged...`
                : "Ask about compliance, missing evidence, or safe rewrites..."
            }
            className="w-full bg-[#07110D] text-xs text-[#F4F1E8] placeholder-[#5A6E5C] px-4 py-3 rounded-2xl border border-[rgba(230,240,224,0.12)] focus:border-[#A7D76B] focus:outline-none focus:ring-1 focus:ring-[#A7D76B] transition-all disabled:opacity-50"
          />
        </div>

        <button
          type="submit"
          disabled={!inputValue.trim() || isLoading}
          className="bg-[#A7D76B] hover:bg-[#b6e47c] text-[#07110D] font-medium px-4 py-3 rounded-2xl text-xs flex items-center gap-1.5 transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed shrink-0 font-sans shadow-md"
        >
          {isLoading ? (
            <SpinnerIcon className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <span>Ask</span>
              <SendIcon className="w-3.5 h-3.5" />
            </>
          )}
        </button>
      </form>
    </div>
  );
}
