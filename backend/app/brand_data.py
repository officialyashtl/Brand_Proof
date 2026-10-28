"""
Synthetic demo brand data for BrandProof.

This module defines the approved evidence corpus for the "demo-brand" brand.
ALL source_ids, statistics, and citations in this file are clearly labelled
as synthetic demo data. No real third-party claims are made.

When a rule matches a claim AND an approved evidence document covers it, the
finding receives evidence_status=found / partial and the matching source_ids.
When NO approved evidence covers the claim, evidence_status=not_found and
source_ids=[].  An unsupported claim is flagged as non-compliant but is NOT
asserted to be false.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, List


@dataclass
class EvidenceDoc:
    """A single approved evidence document in the brand library."""

    source_id: str
    title: str
    approved_stat: str          # The exact wording that is approved for use
    approved_keywords: List[str]  # Lowercased tokens that link a claim to this doc


# ─── Demo-brand evidence library ─────────────────────────────────────────────
# NOTE: All figures below are SYNTHETIC demo data, not real research.

DEMO_EVIDENCE: List[EvidenceDoc] = [
    EvidenceDoc(
        source_id="DEMO-EV-001",
        title="[DEMO] Internal performance benchmark Q3 2025",
        approved_stat="Customers report an average of 2× revenue growth within 90 days (n=200 beta users, conditions apply — see results page).",
        approved_keywords=["revenue", "growth", "2x", "2×", "beta"],
    ),
    EvidenceDoc(
        source_id="DEMO-EV-002",
        title="[DEMO] G2 crowd-sourced ratings report Q3 2025",
        approved_stat="Rated 4.9/5 by over 10,000 verified users on G2 (Q3 2025).",
        approved_keywords=["trusted", "rated", "g2", "rating", "reviews"],
    ),
    EvidenceDoc(
        source_id="DEMO-EV-003",
        title="[DEMO] CRM customer-count sign-off June 2025",
        approved_stat="Trusted by 420,000+ customers across 60 countries (approved figure, June 2025).",
        approved_keywords=["customers", "420,000", "420000", "countries"],
    ),
    EvidenceDoc(
        source_id="DEMO-EV-004",
        title="[DEMO] Independent performance comparison report 2025",
        approved_stat="Leading in category performance benchmarks — see our independent comparison report (2025).",
        approved_keywords=["comparison", "benchmark", "leading", "performance"],
    ),
]

# Build an index: keyword → [EvidenceDoc]
_KEYWORD_INDEX: Dict[str, List[EvidenceDoc]] = {}
for _doc in DEMO_EVIDENCE:
    for _kw in _doc.approved_keywords:
        _KEYWORD_INDEX.setdefault(_kw, []).append(_doc)


def lookup_evidence(claim_text: str) -> tuple[list[str], str]:
    """
    Return (source_ids, evidence_status) for a claim text.

    Matches lowercased tokens of the claim against the keyword index.
    - 'found'     → ≥ 1 doc with a strong keyword match
    - 'partial'   → match exists but the claim wording differs from the approved stat
    - 'not_found' → no approved evidence covers this claim
    """
    tokens = set(claim_text.lower().split())
    matched_docs: List[EvidenceDoc] = []
    for token in tokens:
        for doc in _KEYWORD_INDEX.get(token, []):
            if doc not in matched_docs:
                matched_docs.append(doc)

    if not matched_docs:
        return [], "not_found"

    source_ids = [d.source_id for d in matched_docs]

    # Check if claim wording closely matches the approved stat
    claim_lower = claim_text.lower()
    for doc in matched_docs:
        approved_lower = doc.approved_stat.lower()
        # Simple overlap heuristic: if at least 40% of approved tokens appear in claim
        approved_tokens = set(approved_lower.split())
        overlap = len(tokens & approved_tokens) / max(len(approved_tokens), 1)
        if overlap >= 0.40:
            return source_ids, "found"

    return source_ids, "partial"
