"""
Rule-based brand compliance engine for BrandProof (demo mode).

Each rule is a deterministic pattern-matcher that:
  1. Detects a compliance issue using regex / keyword logic.
  2. Queries the evidence corpus to set evidence_status and source_ids.
  3. Returns a Finding if triggered, or None if the rule does not apply.

This module contains NO AI calls. It is clearly labelled as rule-based analysis.
Real AI-provider integration will replace / augment these rules in a future release.
"""

from __future__ import annotations

import re
import uuid
from typing import Callable, List, Optional

from .brand_data import lookup_evidence
from .models import EvidenceStatus, Finding, FindingType, Severity


# ─── Helpers ──────────────────────────────────────────────────────────────────


def _make_finding(
    *,
    finding_type: FindingType,
    severity: Severity,
    text: str,
    reason: str,
    suggestion: str,
) -> Finding:
    source_ids, ev_status_str = lookup_evidence(text)
    return Finding(
        id=str(uuid.uuid4()),
        type=finding_type,
        severity=severity,
        text=text,
        reason=reason,
        evidence_status=EvidenceStatus(ev_status_str),
        source_ids=source_ids,
        suggestion=suggestion,
    )


def _first_match(pattern: str, text: str, flags: int = re.IGNORECASE) -> Optional[str]:
    """Return the first captured group (or full match) for a regex, or None."""
    m = re.search(pattern, text, flags)
    if m:
        return m.group(0)
    return None


# ─── Individual rules ─────────────────────────────────────────────────────────


def rule_absolute_guarantee(content: str) -> Optional[Finding]:
    """
    Detects unqualified performance guarantees such as
    'guarantees X results in Y days' which violate brand policy and may
    breach FTC advertising guidelines.
    """
    pattern = (
        r"guarantee[sd]?\s+[^.,!?]{0,80}?"
        r"(?:\d+[x×%]|\d+\s+(?:times|fold|days?|week|month|year))"
    )
    matched = _first_match(pattern, content)
    if not matched:
        # Simpler fallback: any explicit 'guarantees' near a time/multiplier expression
        matched = _first_match(
            r"(?:guarantee[sd]?|guaranteed)\s+\w+\s+(?:result|growth|revenue|success|roi|return)",
            content,
        )
    if not matched:
        return None

    return _make_finding(
        finding_type=FindingType.absolute_guarantee,
        severity=Severity.high,
        text=matched,
        reason=(
            "Absolute performance guarantees are prohibited by brand policy and "
            "may violate FTC advertising guidelines. All outcome claims must be "
            "qualified with conditions and supported by approved evidence."
        ),
        suggestion=(
            "Customers report an average of 2× revenue growth within 90 days "
            "(based on 200 beta users, conditions apply — see results page)."
        ),
    )


def rule_clinical_claim(content: str) -> Optional[Finding]:
    """
    Detects 'clinically proven / tested / validated' phrases that imply
    peer-reviewed medical or scientific research.
    """
    pattern = r"clinical(?:ly)?\s+(?:proven|tested|validated|studied|demonstrated)"
    matched = _first_match(pattern, content)
    if not matched:
        return None

    return _make_finding(
        finding_type=FindingType.clinical_claim,
        severity=Severity.high,
        text=matched,
        reason=(
            "The phrase implies peer-reviewed medical/scientific research. "
            "No approved clinical study is on file for this product. "
            "This claim must be removed or substantiated with an approved citation."
        ),
        suggestion=(
            "Backed by independent performance benchmarks (2025) — see our methodology page."
        ),
    )


def rule_superlative_ranking(content: str) -> Optional[Finding]:
    """
    Detects unsubstantiated #1 or 'most trusted / most popular / best'
    ranking claims that require verified third-party attribution.
    """
    pattern = (
        r"(?:#\s*1|number\s+one|#1)"
        r"[\s\w]{0,40}"
        r"(?:trusted|popular|used|chosen|rated|brand|platform|solution|tool)"
        r"|"
        r"(?:the\s+)?best\s+(?:in|on|for|the)\s+\w+"
        r"|"
        r"most\s+(?:trusted|popular|used|advanced|innovative)\s+(?:brand|platform|tool|solution|software)"
    )
    matched = _first_match(pattern, content)
    if not matched:
        return None

    return _make_finding(
        finding_type=FindingType.superlative_ranking,
        severity=Severity.high,
        text=matched,
        reason=(
            "Superlative ranking claims (#1, most trusted, best) require a "
            "cited, independently verified source (e.g. G2, Gartner, Forrester). "
            "No qualifying citation was found in the submitted content."
        ),
        suggestion="Rated 4.9/5 by over 10,000 verified users on G2 (Q3 2025 report).",
    )


def rule_customer_count(content: str) -> Optional[Finding]:
    """
    Detects specific customer / user count statistics that must match
    the last CRM-approved figure.
    """
    pattern = r"(\d[\d,\.]+\+?)\s*(?:happy\s+)?(?:customers?|users?|businesses?|companies|clients?)"
    m = re.search(pattern, content, re.IGNORECASE)
    if not m:
        return None

    raw_number = m.group(1).replace(",", "").replace(".", "").rstrip("+")
    try:
        num = int(raw_number)
    except ValueError:
        return None

    # Only flag if the number differs from the approved 420,000 figure
    approved = 420_000
    if num == approved:
        return None  # Exact match — compliant

    matched_text = m.group(0)
    return _make_finding(
        finding_type=FindingType.customer_count,
        severity=Severity.medium,
        text=matched_text,
        reason=(
            f"Customer count statistics must match the latest CRM-approved figure. "
            f"The detected number ({num:,}) differs from the approved count "
            f"({approved:,}, signed off June 2025). Please update to the approved figure."
        ),
        suggestion=(
            "Trusted by 420,000+ customers across 60 countries (approved June 2025)."
        ),
    )


def rule_vague_superlative(content: str) -> Optional[Finding]:
    """
    Detects vague, non-quantifiable superlatives such as 'unprecedented',
    'unmatched', 'revolutionary' per brand voice guidelines.
    """
    terms = [
        "unprecedented",
        "unmatched",
        "unparalleled",
        "revolutionary",
        "game.changing",
        "world.class",
        "industry.leading",
        "transformative",
        "cutting.edge",
    ]
    pattern = r"\b(?:" + "|".join(terms) + r")\b"
    matched = _first_match(pattern, content)
    if not matched:
        return None

    return _make_finding(
        finding_type=FindingType.vague_superlative,
        severity=Severity.medium,
        text=matched,
        reason=(
            f"The term '{matched}' is a non-specific, exaggerated superlative flagged "
            "by brand voice guidelines. Replace with specific, measurable language."
        ),
        suggestion="measurable, compounding growth (include specific metric if available)",
    )


def rule_comparative_claim(content: str) -> Optional[Finding]:
    """
    Detects implicit comparative superiority claims against unnamed competitors
    (e.g. 'nothing else comes close', 'outperforms any other').
    """
    pattern = (
        r"nothing\s+else\s+comes\s+close"
        r"|outperform[s]?\s+(?:any|all|every)\s+other"
        r"|unlike\s+(?:any|all)\s+(?:other|competitors?)"
        r"|no\s+(?:other|competitor)\s+(?:can|comes?)"
        r"|leaves?\s+(?:the\s+)?competition\s+behind"
    )
    matched = _first_match(pattern, content)
    if not matched:
        return None

    return _make_finding(
        finding_type=FindingType.comparative_claim,
        severity=Severity.low,
        text=matched,
        reason=(
            "Comparative superiority claims against unnamed competitors require "
            "substantiated benchmark data. This phrase risks a false-advertising "
            "challenge without a supporting comparison report."
        ),
        suggestion=(
            "Leading in category performance benchmarks — see our independent "
            "comparison report (2025)."
        ),
    )


def rule_prohibited_terms(content: str) -> Optional[Finding]:
    """
    Detects terms that are outright prohibited in brand communications
    (e.g. 'risk-free', 'no side effects', 'unlimited').
    """
    prohibited = [
        r"risk.free",
        r"no\s+side\s+effects?",
        r"100\s*%\s+(?:safe|guaranteed|effective)",
        r"\bunlimited\b(?!\s+(?:storage|bandwidth|seats?))",   # allow product-tier uses
    ]
    for pat in prohibited:
        matched = _first_match(pat, content)
        if matched:
            return _make_finding(
                finding_type=FindingType.prohibited_term,
                severity=Severity.high,
                text=matched,
                reason=(
                    f"The phrase '{matched}' is on the prohibited-terms list. "
                    "It makes an absolute assurance that is not legally defensible "
                    "and violates brand compliance policy."
                ),
                suggestion=(
                    "Remove or replace with a qualified, evidence-backed alternative. "
                    "Consult the legal team for approved wording."
                ),
            )
    return None


# ─── Rule registry & runner ───────────────────────────────────────────────────

RULES: List[Callable[[str], Optional[Finding]]] = [
    rule_absolute_guarantee,
    rule_clinical_claim,
    rule_superlative_ranking,
    rule_customer_count,
    rule_vague_superlative,
    rule_comparative_claim,
    rule_prohibited_terms,
]


def run_rules(content: str) -> List[Finding]:
    """
    Run every registered rule against the supplied content and return all
    triggered findings.  Runs in O(rules × content_length) — deterministic,
    no external calls.
    """
    findings: List[Finding] = []
    for rule in RULES:
        result = rule(content)
        if result is not None:
            findings.append(result)
    return findings
