"use client";

import { useState } from "react";
import Link from "next/link";

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [trialDecision, setTrialDecision] = useState<"pending" | "accepted" | "rejected">("pending");
  const [copied, setCopied] = useState(false);

  const sampleRewrite =
    "In internal pilot evaluations across customer accounts, participants observed accelerated revenue improvements.";

  const handleCopy = () => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(sampleRewrite);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-[#07110D] text-[#F4F1E8] font-sans selection:bg-[#A7D76B] selection:text-[#07110D]">
      {/* ── A. NAVIGATION ── */}
      <header className="sticky top-0 z-50 bg-[#07110D]/85 backdrop-blur-md border-b border-[rgba(230,240,224,0.08)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          
          {/* Brand Identity / Monogram */}
          <Link href="/" className="flex items-center gap-3 group">
            <span className="w-9 h-9 rounded-full bg-[#101F17] border border-[rgba(167,215,107,0.3)] flex items-center justify-center text-[#A7D76B] group-hover:scale-105 transition-transform shadow-[0_0_15px_rgba(167,215,107,0.15)]">
              {/* Refined Leaf / Shield Monogram */}
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M12 2L4 6v6c0 5.55 3.84 10.74 8 12 4.16-1.26 8-6.45 8-12V6l-8-4z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12l2 2 4-4" />
              </svg>
            </span>
            <div className="flex flex-col">
              <span className="font-bold text-base tracking-tight text-[#F4F1E8] group-hover:text-[#A7D76B] transition-colors flex items-center gap-1.5">
                BrandProof
              </span>
              <span className="text-[10px] uppercase tracking-widest text-[#8D9D8E] font-mono">
                Inkloom AI
              </span>
            </div>
          </Link>

          {/* Nav Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm text-[#C3CDBF]">
            <a href="#hero" className="text-[#F4F1E8] hover:text-[#A7D76B] transition-colors font-medium">
              Home
            </a>
            <a href="#workflow" className="hover:text-[#F4F1E8] transition-colors">
              Workflow
            </a>
            <a href="#technology" className="hover:text-[#F4F1E8] transition-colors">
              Technology
            </a>
            <a href="#policies" className="hover:text-[#F4F1E8] transition-colors">
              Brand Policies
            </a>
            <Link href="/app" className="hover:text-[#F4F1E8] transition-colors">
              Workspace
            </Link>
          </nav>

          {/* Right Action */}
          <div className="hidden sm:flex items-center gap-4">
            <Link
              href="/app"
              id="header-launch-btn"
              className="btn-forest-primary"
            >
              Explore BrandProof ↗
            </Link>
          </div>

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg text-[#C3CDBF] hover:text-[#F4F1E8] bg-[#101F17] border border-[rgba(230,240,224,0.1)]"
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Dropdown Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-[rgba(230,240,224,0.08)] bg-[#0B1711] px-5 py-6 space-y-4">
            <a
              href="#hero"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-sm text-[#F4F1E8] font-medium"
            >
              Home
            </a>
            <a
              href="#workflow"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-sm text-[#C3CDBF] hover:text-[#A7D76B]"
            >
              Workflow
            </a>
            <a
              href="#technology"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-sm text-[#C3CDBF] hover:text-[#A7D76B]"
            >
              Technology
            </a>
            <a
              href="#policies"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-sm text-[#C3CDBF] hover:text-[#A7D76B]"
            >
              Brand Policies
            </a>
            <div className="pt-2">
              <Link
                href="/app"
                onClick={() => setMobileMenuOpen(false)}
                className="btn-forest-primary w-full text-center"
              >
                Explore BrandProof ↗
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* ── HERO SECTION: CINEMATIC VISUAL & LAYERED COMPOSITION ── */}
      <section id="hero" className="relative border-b border-[rgba(230,240,224,0.08)] overflow-hidden forest-hero-gradient">
        
        {/* Subtle Atmospheric Depth Glows */}
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-[#A7D76B]/8 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 left-10 w-80 h-80 bg-[#15271D]/60 rounded-full blur-2xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            
            {/* Left Column: Headline & Value Proposition */}
            <div className="lg:col-span-7 flex flex-col justify-center">
              
              {/* Eyebrow Pill Tag */}
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#101F17] border border-[rgba(167,215,107,0.25)] text-[#A7D76B] text-xs font-medium tracking-wide mb-6 w-fit shadow-sm">
                <span className="w-2 h-2 rounded-full bg-[#A7D76B] pulse-led" />
                <span className="font-mono text-[11px] uppercase tracking-wider">
                  BRAND INTELLIGENCE / EVIDENCE-AWARE GOVERNANCE
                </span>
              </div>

              {/* Exact Hero Headline */}
              <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-[#F4F1E8] leading-[1.08] mb-6">
                Every claim deserves<br />
                <span className="text-[#A7D76B] inline-block mt-1">
                  credible evidence.
                </span>
              </h1>

              {/* Exact Hero Supporting Text */}
              <p className="text-base sm:text-lg text-[#C3CDBF] leading-relaxed max-w-xl mb-8">
                Review marketing content against brand policies, identify unsupported claims,
                improve risky language, and preserve accountable human decisions.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-4 mb-12">
                <Link
                  href="/app"
                  id="hero-launch-btn"
                  className="btn-forest-primary text-sm px-7 py-3.5"
                >
                  Explore BrandProof ↗
                </Link>
                <a
                  href="#workflow"
                  className="btn-forest-secondary text-sm px-7 py-3.5 flex items-center gap-2"
                >
                  <span>See How It Works</span>
                  <span className="text-[#A7D76B]">↓</span>
                </a>
              </div>

              {/* Verified Metrics Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-8 border-t border-[rgba(230,240,224,0.08)]">
                <div>
                  <div className="font-extrabold text-2xl text-[#F4F1E8]">13</div>
                  <div className="text-xs text-[#8D9D8E] mt-0.5">Persisted Audits</div>
                </div>
                <div>
                  <div className="font-extrabold text-2xl text-[#A7D76B]">7 Rules</div>
                  <div className="text-xs text-[#8D9D8E] mt-0.5">Active Policies</div>
                </div>
                <div>
                  <div className="font-extrabold text-2xl text-[#F4F1E8]">100%</div>
                  <div className="text-xs text-[#8D9D8E] mt-0.5">Deterministic Engine</div>
                </div>
                <div>
                  <div className="font-extrabold text-2xl text-[#A8D6A0]">0%</div>
                  <div className="text-xs text-[#8D9D8E] mt-0.5">AI Hallucinations</div>
                </div>
              </div>

            </div>

            {/* Right Column: Floating Review Instrument (Translucent Dark Glass) */}
            <div className="lg:col-span-5 flex justify-center">
              <div className="w-full max-w-md frosted-glass-elevated rounded-3xl p-6 sm:p-7 relative transition-all duration-300 hover:border-[rgba(167,215,107,0.35)] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)]">
                
                {/* Panel Header */}
                <div className="flex items-center justify-between border-b border-[rgba(230,240,224,0.1)] pb-4 mb-5">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#A7D76B] pulse-led" />
                    <span className="text-xs font-mono font-semibold tracking-wider text-[#F4F1E8] uppercase">
                      Review Instrument
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-[#8D9D8E] px-2 py-0.5 rounded-full bg-[#101F17] border border-[rgba(230,240,224,0.08)]">
                    #REV-2026-FTC
                  </span>
                </div>

                {/* Engine Disclosure Badge */}
                <div className="mb-4 text-[11px] font-mono text-[#A7D76B] flex items-center justify-between px-3 py-1.5 rounded-lg bg-[#A7D76B]/10 border border-[#A7D76B]/20">
                  <span>ENGINE: DETERMINISTIC EVALUATION</span>
                  <span className="text-[10px] text-[#C3CDBF]">CONFIDENCE: 100%</span>
                </div>

                {/* Flagged Example Claim */}
                <div className="mb-4">
                  <div className="text-[11px] font-mono uppercase tracking-wider text-[#8D9D8E] mb-1.5">
                    INPUT MARKETING CLAIM:
                  </div>
                  <div className="p-3.5 rounded-xl bg-[#0B1711] border border-[rgba(230,240,224,0.1)] text-xs text-[#F4F1E8] leading-relaxed">
                    &quot;Our platform <span className="bg-[#EF9187]/20 text-[#EF9187] px-1 py-0.5 rounded font-semibold underline decoration-[#EF9187]">guarantees 2x revenue growth in just 7 days</span>.&quot;
                  </div>
                </div>

                {/* Conflict & Severity Badges */}
                <div className="space-y-2 mb-5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#8D9D8E]">Policy Conflict:</span>
                    <span className="text-[#EF9187] font-semibold">FTC Sec. 5 Guarantee</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#8D9D8E]">Severity Rating:</span>
                    <span className="px-2 py-0.5 rounded-full bg-[#EF9187]/15 border border-[#EF9187]/30 text-[#EF9187] font-mono text-[10px] font-bold">
                      Critical Risk
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#8D9D8E]">Evidence Status:</span>
                    <span className="text-[#E5BD75] font-mono text-xs font-semibold">
                      Deficit: 0 / 3 Verified Sources
                    </span>
                  </div>
                </div>

                {/* Suggested Rewrite */}
                <div className="p-4 rounded-xl bg-[#101F17] border border-[rgba(167,215,107,0.25)] mb-5">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-mono font-semibold text-[#A7D76B] uppercase flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#A7D76B]" />
                      Suggested Rewrite
                    </span>
                    <button
                      onClick={handleCopy}
                      className="text-[10px] font-mono text-[#8D9D8E] hover:text-[#A7D76B] transition-colors"
                    >
                      {copied ? "Copied ✓" : "Copy"}
                    </button>
                  </div>
                  <p className="text-xs text-[#A8D6A0] leading-relaxed">
                    &quot;{sampleRewrite}&quot;
                  </p>
                </div>

                {/* Interactive Decision Trial */}
                <div className="pt-4 border-t border-[rgba(230,240,224,0.1)] flex items-center justify-between">
                  <div className="text-xs">
                    <span className="text-[#8D9D8E] text-[11px] block">Decision State:</span>
                    <span className={`font-mono text-xs font-semibold ${
                      trialDecision === "accepted" ? "text-[#A8D6A0]" :
                      trialDecision === "rejected" ? "text-[#EF9187]" :
                      "text-[#E5BD75]"
                    }`}>
                      {trialDecision === "pending" ? "● Pending Action" :
                       trialDecision === "accepted" ? "✓ Accepted" :
                       "✕ Rejected"}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setTrialDecision("accepted")}
                      className={`btn-forest-primary text-xs px-3.5 py-1.5 ${
                        trialDecision === "accepted" ? "ring-2 ring-white" : ""
                      }`}
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => setTrialDecision("rejected")}
                      className="btn-forest-danger text-xs px-3.5 py-1.5"
                    >
                      Reject
                    </button>
                    {trialDecision !== "pending" && (
                      <button
                        onClick={() => setTrialDecision("pending")}
                        className="text-[10px] text-[#8D9D8E] hover:text-[#F4F1E8] underline ml-1"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                </div>

              </div>
            </div>

          </div>
        </div>

      </section>

      {/* ── B. WORKFLOW SECTION ── */}
      <section id="workflow" className="py-24 border-b border-[rgba(230,240,224,0.08)] bg-[#0B1711]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="max-w-2xl mb-16">
            <span className="text-xs font-mono font-semibold uppercase tracking-wider text-[#A7D76B] block mb-2">
              What We Do
            </span>
            <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-[#F4F1E8] leading-tight">
              From marketing claims to accountable decisions.
            </h2>
            <p className="text-[#C3CDBF] text-base sm:text-lg mt-4 leading-relaxed">
              BrandProof provides end-to-end evidence intelligence to examine claims,
              highlight regulatory friction, and preserve immutable human sign-offs.
            </p>
          </div>

          {/* 4 Feature Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* Card 1: Content Review */}
            <div className="p-8 rounded-3xl bg-[#101F17] border border-[rgba(230,240,224,0.09)] flex flex-col justify-between group hover:border-[rgba(167,215,107,0.3)] transition-all duration-200">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-[#15271D] border border-[rgba(230,240,224,0.08)] flex items-center justify-center text-[#A7D76B] mb-6 group-hover:scale-105 transition-transform">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-[#F4F1E8] mb-2">
                  Content Review
                </h3>
                <p className="text-sm text-[#C3CDBF] leading-relaxed">
                  Submit marketing copy across Social, Web, Email, and Ad campaigns for immediate tokenized claim extraction.
                </p>
              </div>
              <div className="pt-6 mt-6 border-t border-[rgba(230,240,224,0.06)] flex items-center justify-between">
                <span className="text-xs text-[#8D9D8E] font-mono">01 / SUBMIT</span>
                <Link href="/app" className="w-8 h-8 rounded-full bg-[#15271D] flex items-center justify-center text-[#A7D76B] group-hover:bg-[#A7D76B] group-hover:text-[#07110D] transition-colors">
                  →
                </Link>
              </div>
            </div>

            {/* Card 2: Policy Analysis */}
            <div className="p-8 rounded-3xl bg-[#101F17] border border-[rgba(230,240,224,0.09)] flex flex-col justify-between group hover:border-[rgba(167,215,107,0.3)] transition-all duration-200">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-[#15271D] border border-[rgba(230,240,224,0.08)] flex items-center justify-center text-[#A7D76B] mb-6 group-hover:scale-105 transition-transform">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-[#F4F1E8] mb-2">
                  Policy Analysis
                </h3>
                <p className="text-sm text-[#C3CDBF] leading-relaxed">
                  Evaluate copy against 7 active deterministic policies spanning FTC compliance, guarantees, and environmental terms.
                </p>
              </div>
              <div className="pt-6 mt-6 border-t border-[rgba(230,240,224,0.06)] flex items-center justify-between">
                <span className="text-xs text-[#8D9D8E] font-mono">02 / ANALYZE</span>
                <Link href="/app" className="w-8 h-8 rounded-full bg-[#15271D] flex items-center justify-center text-[#A7D76B] group-hover:bg-[#A7D76B] group-hover:text-[#07110D] transition-colors">
                  →
                </Link>
              </div>
            </div>

            {/* Card 3: Evidence Inspection */}
            <div className="p-8 rounded-3xl bg-[#101F17] border border-[rgba(230,240,224,0.09)] flex flex-col justify-between group hover:border-[rgba(167,215,107,0.3)] transition-all duration-200">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-[#15271D] border border-[rgba(230,240,224,0.08)] flex items-center justify-center text-[#A7D76B] mb-6 group-hover:scale-105 transition-transform">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-[#F4F1E8] mb-2">
                  Evidence Inspection
                </h3>
                <p className="text-sm text-[#C3CDBF] leading-relaxed">
                  Pinpoint missing empirical citations, measure evidentiary deficits, and inspect verified repository sources.
                </p>
              </div>
              <div className="pt-6 mt-6 border-t border-[rgba(230,240,224,0.06)] flex items-center justify-between">
                <span className="text-xs text-[#8D9D8E] font-mono">03 / INSPECT</span>
                <Link href="/app" className="w-8 h-8 rounded-full bg-[#15271D] flex items-center justify-center text-[#A7D76B] group-hover:bg-[#A7D76B] group-hover:text-[#07110D] transition-colors">
                  →
                </Link>
              </div>
            </div>

            {/* Card 4: Human Decisions */}
            <div className="p-8 rounded-3xl bg-[#101F17] border border-[rgba(230,240,224,0.09)] flex flex-col justify-between group hover:border-[rgba(167,215,107,0.3)] transition-all duration-200">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-[#15271D] border border-[rgba(230,240,224,0.08)] flex items-center justify-center text-[#A7D76B] mb-6 group-hover:scale-105 transition-transform">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-[#F4F1E8] mb-2">
                  Human Decisions
                </h3>
                <p className="text-sm text-[#C3CDBF] leading-relaxed">
                  Review compliant rewrite suggestions, record accountable decisions, and persist permanent audit records in SQLite.
                </p>
              </div>
              <div className="pt-6 mt-6 border-t border-[rgba(230,240,224,0.06)] flex items-center justify-between">
                <span className="text-xs text-[#8D9D8E] font-mono">04 / DECIDE</span>
                <Link href="/app" className="w-8 h-8 rounded-full bg-[#15271D] flex items-center justify-center text-[#A7D76B] group-hover:bg-[#A7D76B] group-hover:text-[#07110D] transition-colors">
                  →
                </Link>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── C. PRODUCT TECHNOLOGY & REALISTIC DASHBOARD PREVIEW ── */}
      <section id="technology" className="py-24 border-b border-[rgba(230,240,224,0.08)] bg-[#07110D]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left Column: Tech Description */}
            <div className="lg:col-span-5">
              <span className="text-xs font-mono font-semibold uppercase tracking-wider text-[#A7D76B] block mb-2">
                Our Technology
              </span>
              <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-[#F4F1E8] leading-tight mb-6">
                Clear policies.<br />Traceable decisions.
              </h2>
              <p className="text-[#C3CDBF] text-base leading-relaxed mb-8">
                BrandProof connects deterministically audited brand guidelines with live marketing workflows.
                Every claim is verified against indexed records with human sign-offs saved directly to the database.
              </p>

              {/* Verified Checklist */}
              <ul className="space-y-3.5 mb-8 text-sm text-[#F4F1E8]">
                <li className="flex items-center gap-3">
                  <span className="w-5 h-5 rounded-full bg-[#A7D76B]/15 text-[#A7D76B] flex items-center justify-center text-xs font-bold">
                    ✓
                  </span>
                  <span>Real-time claim detection &amp; phrase isolation</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="w-5 h-5 rounded-full bg-[#A7D76B]/15 text-[#A7D76B] flex items-center justify-center text-xs font-bold">
                    ✓
                  </span>
                  <span>Deterministic rule engines without hallucinated AI</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="w-5 h-5 rounded-full bg-[#A7D76B]/15 text-[#A7D76B] flex items-center justify-center text-xs font-bold">
                    ✓
                  </span>
                  <span>Traceable evidence citation &amp; gap identification</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="w-5 h-5 rounded-full bg-[#A7D76B]/15 text-[#A7D76B] flex items-center justify-center text-xs font-bold">
                    ✓
                  </span>
                  <span>Immutable SQLite audit trail for human decisions</span>
                </li>
              </ul>

              <Link href="/app" className="btn-forest-primary">
                Explore Workspace →
              </Link>
            </div>

            {/* Right Column: Realistic Dashboard Preview Card */}
            <div className="lg:col-span-7">
              <div className="rounded-3xl border border-[rgba(230,240,224,0.12)] bg-[#101F17] p-6 sm:p-8 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.7)]">
                
                {/* Console Top Bar */}
                <div className="flex items-center justify-between border-b border-[rgba(230,240,224,0.08)] pb-4 mb-6">
                  <div className="flex items-center gap-3">
                    <span className="w-3 h-3 rounded-full bg-[#A7D76B]" />
                    <span className="font-bold text-sm text-[#F4F1E8]">
                      BrandProof Console // Overview
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-[#8D9D8E] bg-[#15271D] px-2.5 py-1 rounded-full border border-[rgba(230,240,224,0.06)]">
                    LIVE PERSISTENCE
                  </span>
                </div>

                {/* Metric Gauges Row */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                  
                  {/* Total Audits Card */}
                  <div className="p-4 rounded-2xl bg-[#0B1711] border border-[rgba(230,240,224,0.08)]">
                    <div className="text-[11px] text-[#8D9D8E] font-mono uppercase">
                      Audited Reviews
                    </div>
                    <div className="text-3xl font-extrabold text-[#F4F1E8] mt-1">
                      13
                    </div>
                    <div className="text-[11px] text-[#A7D76B] mt-2 flex items-center gap-1">
                      <span>↑ 100% verified</span>
                    </div>
                  </div>

                  {/* Circular Compliance Gauge */}
                  <div className="p-4 rounded-2xl bg-[#0B1711] border border-[rgba(230,240,224,0.08)] flex flex-col justify-between">
                    <div className="text-[11px] text-[#8D9D8E] font-mono uppercase">
                      Policy Health
                    </div>
                    <div className="flex items-center gap-3 my-1">
                      <div className="relative w-12 h-12 flex items-center justify-center">
                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                          <path
                            className="text-[#15271D]"
                            strokeWidth="3.5"
                            stroke="currentColor"
                            fill="none"
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          />
                          <path
                            className="text-[#A7D76B]"
                            strokeDasharray="85, 100"
                            strokeWidth="3.5"
                            strokeLinecap="round"
                            stroke="currentColor"
                            fill="none"
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          />
                        </svg>
                        <span className="absolute text-[11px] font-bold text-[#F4F1E8]">85%</span>
                      </div>
                      <div className="text-xs text-[#A8D6A0] font-semibold">
                        Good Standing
                      </div>
                    </div>
                  </div>

                  {/* Active Policy Rules */}
                  <div className="p-4 rounded-2xl bg-[#0B1711] border border-[rgba(230,240,224,0.08)]">
                    <div className="text-[11px] text-[#8D9D8E] font-mono uppercase">
                      Rule Register
                    </div>
                    <div className="text-3xl font-extrabold text-[#A7D76B] mt-1">
                      7 Active
                    </div>
                    <div className="text-[11px] text-[#8D9D8E] mt-2">
                      Zero unverified claims
                    </div>
                  </div>

                </div>

                {/* Recent Compliance Stream */}
                <div className="rounded-2xl bg-[#0B1711] border border-[rgba(230,240,224,0.08)] p-4">
                  <div className="text-xs font-mono font-semibold text-[#C3CDBF] mb-3 flex items-center justify-between">
                    <span>Recent Claim Stream</span>
                    <span className="text-[10px] text-[#8D9D8E]">SQLite Audit Trail</span>
                  </div>
                  <div className="space-y-2.5 text-xs">
                    <div className="p-2.5 rounded-lg bg-[#101F17] flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[#EF9187]" />
                        <span className="text-[#F4F1E8] truncate max-w-[240px]">&quot;Guarantees 2x revenue growth&quot;</span>
                      </div>
                      <span className="text-[10px] font-mono text-[#EF9187] bg-[#EF9187]/10 px-2 py-0.5 rounded">
                        Critical Risk
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-[#101F17] flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[#E5BD75]" />
                        <span className="text-[#F4F1E8] truncate max-w-[240px]">&quot;500,000+ happy customers&quot;</span>
                      </div>
                      <span className="text-[10px] font-mono text-[#E5BD75] bg-[#E5BD75]/10 px-2 py-0.5 rounded">
                        Substantiation Needed
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-[#101F17] flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[#A8D6A0]" />
                        <span className="text-[#F4F1E8] truncate max-w-[240px]">&quot;Pilot users reported revenue gains&quot;</span>
                      </div>
                      <span className="text-[10px] font-mono text-[#A8D6A0] bg-[#A8D6A0]/10 px-2 py-0.5 rounded">
                        Compliant Rewrite
                      </span>
                    </div>
                  </div>
                </div>

              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── D. BRAND POLICY REGISTER ── */}
      <section id="policies" className="py-24 border-b border-[rgba(230,240,224,0.08)] bg-[#0B1711]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="flex flex-wrap items-end justify-between gap-6 mb-12">
            <div>
              <span className="text-xs font-mono font-semibold uppercase tracking-wider text-[#A7D76B] block mb-2">
                Policy Register
              </span>
              <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-[#F4F1E8]">
                07 Implemented Brand Policies
              </h2>
              <p className="text-[#C3CDBF] text-base mt-2">
                Active deterministic verification criteria evaluated in every review.
              </p>
            </div>
            <Link
              href="/app"
              className="btn-forest-secondary text-xs px-5 py-2.5"
            >
              Open Full Guidelines Workspace →
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* Policy 1 */}
            <div className="p-6 rounded-3xl bg-[#101F17] border border-[rgba(230,240,224,0.09)]">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-mono font-bold text-[#A7D76B]">FTC-01</span>
                <span className="px-2 py-0.5 rounded-full bg-[#EF9187]/15 text-[#EF9187] text-[10px] font-bold font-mono">
                  CRITICAL RISK
                </span>
              </div>
              <h4 className="text-base font-bold text-[#F4F1E8] mb-2">
                Absolute Guarantees
              </h4>
              <p className="text-xs text-[#C3CDBF] leading-relaxed">
                Flags 100% certainty, risk-free returns, or unqualified outcome guarantees that violate FTC Section 5.
              </p>
            </div>

            {/* Policy 2 */}
            <div className="p-6 rounded-3xl bg-[#101F17] border border-[rgba(230,240,224,0.09)]">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-mono font-bold text-[#A7D76B]">FTC-02</span>
                <span className="px-2 py-0.5 rounded-full bg-[#EF9187]/15 text-[#EF9187] text-[10px] font-bold font-mono">
                  CRITICAL RISK
                </span>
              </div>
              <h4 className="text-base font-bold text-[#F4F1E8] mb-2">
                Customer Count Substantiation
              </h4>
              <p className="text-xs text-[#C3CDBF] leading-relaxed">
                Requires empirical database corroboration for claims specifying customer metrics (&quot;500,000+ users&quot;).
              </p>
            </div>

            {/* Policy 3 */}
            <div className="p-6 rounded-3xl bg-[#101F17] border border-[rgba(230,240,224,0.09)]">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-mono font-bold text-[#A7D76B]">FTC-03</span>
                <span className="px-2 py-0.5 rounded-full bg-[#EF9187]/15 text-[#EF9187] text-[10px] font-bold font-mono">
                  CRITICAL RISK
                </span>
              </div>
              <h4 className="text-base font-bold text-[#F4F1E8] mb-2">
                Clinical &amp; Scientific Claims
              </h4>
              <p className="text-xs text-[#C3CDBF] leading-relaxed">
                Enforces medical and scientific substantiation. Bars &quot;clinically proven&quot; language lacking trial citations.
              </p>
            </div>

            {/* Policy 4 */}
            <div className="p-6 rounded-3xl bg-[#101F17] border border-[rgba(230,240,224,0.09)]">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-mono font-bold text-[#A7D76B]">FTC-04</span>
                <span className="px-2 py-0.5 rounded-full bg-[#E5BD75]/15 text-[#E5BD75] text-[10px] font-bold font-mono">
                  WARNING
                </span>
              </div>
              <h4 className="text-base font-bold text-[#F4F1E8] mb-2">
                Superlative &amp; Ranking Claims
              </h4>
              <p className="text-xs text-[#C3CDBF] leading-relaxed">
                Requires independent third-party survey citations for claims asserting &quot;the #1 solution&quot; or &quot;industry leader&quot;.
              </p>
            </div>

            {/* Policy 5 */}
            <div className="p-6 rounded-3xl bg-[#101F17] border border-[rgba(230,240,224,0.09)]">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-mono font-bold text-[#A7D76B]">ENV-01</span>
                <span className="px-2 py-0.5 rounded-full bg-[#EF9187]/15 text-[#EF9187] text-[10px] font-bold font-mono">
                  CRITICAL RISK
                </span>
              </div>
              <h4 className="text-base font-bold text-[#F4F1E8] mb-2">
                Environmental &amp; Green Claims
              </h4>
              <p className="text-xs text-[#C3CDBF] leading-relaxed">
                Audits carbon-neutral and eco-friendly claims in compliance with the FTC Green Guides.
              </p>
            </div>

            {/* Policy 6 */}
            <div className="p-6 rounded-3xl bg-[#101F17] border border-[rgba(230,240,224,0.09)]">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-mono font-bold text-[#A7D76B]">TON-01</span>
                <span className="px-2 py-0.5 rounded-full bg-[#E5BD75]/15 text-[#E5BD75] text-[10px] font-bold font-mono">
                  WARNING
                </span>
              </div>
              <h4 className="text-base font-bold text-[#F4F1E8] mb-2">
                Urgent High-Pressure Tactics
              </h4>
              <p className="text-xs text-[#C3CDBF] leading-relaxed">
                Identifies deceptive countdowns and artificial scarcity language (&quot;don&apos;t miss this limited-time offer&quot;).
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* ── E. CLOSING CTA BANNER ── */}
      <section className="py-20 bg-[#07110D]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Panoramic Rounded Banner Card (Inspired by reference bottom card) */}
          <div className="rounded-3xl p-8 sm:p-12 border border-[rgba(230,240,224,0.12)] bg-gradient-to-r from-[#101F17] to-[#15271D] relative overflow-hidden shadow-2xl flex flex-col md:flex-row items-center justify-between gap-8">
            
            {/* Visual glow element */}
            <div className="absolute -left-10 -bottom-10 w-64 h-64 bg-[#A7D76B]/10 rounded-full blur-3xl pointer-events-none" />

            <div className="max-w-xl relative z-10">
              <h2 className="text-3xl sm:text-4xl font-extrabold text-[#F4F1E8] tracking-tight mb-3">
                Make every claim accountable.
              </h2>
              <p className="text-[#C3CDBF] text-sm sm:text-base leading-relaxed">
                Give your team a clearer path from marketing copy to evidence-aware decisions.
              </p>
            </div>

            <div className="relative z-10 flex flex-wrap items-center gap-4">
              <Link
                href="/app"
                id="footer-launch-btn"
                className="btn-forest-primary text-sm px-8 py-4"
              >
                Explore BrandProof ↗
              </Link>
            </div>

          </div>

        </div>
      </section>

      {/* ── F. FOOTER ── */}
      <footer className="bg-[#050C09] border-t border-[rgba(230,240,224,0.08)] text-[#8D9D8E] text-xs py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-8">
          
          {/* Identity */}
          <div>
            <div className="flex items-center gap-2.5 mb-3">
              <span className="w-7 h-7 rounded-full bg-[#101F17] border border-[#A7D76B]/30 flex items-center justify-center text-[#A7D76B] text-xs">
                BP
              </span>
              <span className="font-bold text-sm text-[#F4F1E8]">BrandProof</span>
            </div>
            <p className="text-[#8D9D8E] leading-relaxed text-[11px]">
              &copy; 2026 Inkloom AI.<br />
              All rights reserved.<br />
              Evidence-aware brand governance.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-[#F4F1E8] font-semibold mb-3 text-xs uppercase tracking-wider">
              Navigation
            </h4>
            <ul className="space-y-2 text-[11px]">
              <li><a href="#hero" className="hover:text-[#A7D76B]">Home</a></li>
              <li><a href="#workflow" className="hover:text-[#A7D76B]">Workflow</a></li>
              <li><a href="#technology" className="hover:text-[#A7D76B]">Technology</a></li>
              <li><a href="#policies" className="hover:text-[#A7D76B]">Brand Policies</a></li>
              <li><Link href="/app" className="hover:text-[#A7D76B]">Launch Workspace ↗</Link></li>
            </ul>
          </div>

          {/* Architecture Disclosure */}
          <div className="md:col-span-2">
            <h4 className="text-[#F4F1E8] font-semibold mb-3 text-xs uppercase tracking-wider">
              Engine Architecture &amp; Disclosure
            </h4>
            <p className="text-[#8D9D8E] leading-relaxed text-[11px]">
              BrandProof operates through deterministic rule-based evaluation. Claims are tested
              against regulatory guidelines and evidence records with zero unverified LLM hallucinations.
              All reviews, findings, and human accept/reject actions are persisted locally in SQLite.
            </p>
          </div>

        </div>
      </footer>
    </div>
  );
}
