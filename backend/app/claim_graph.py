"""
Claim Intelligence Graph Service for BrandProof.

Extracts marketing claim candidates deterministically, maps them to triggered
findings and policy rules, and references the approved evidence library.
"""

from __future__ import annotations

import re
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

from .brand_data import DEMO_EVIDENCE, EvidenceDoc
from .models import Finding, FindingType, Severity


class GraphNode(BaseModel):
    id: str
    type: str  # "claim" | "finding" | "rule" | "evidence"
    label: str
    category: Optional[str] = None
    status: str  # "detected" | "flagged" | "evidence_attached" | "evidence_absent" | "policy_rule"
    details: Dict[str, Any] = Field(default_factory=dict)


class GraphEdge(BaseModel):
    id: str
    source: str
    target: str
    label: str
    relationship: str  # "flags_claim" | "enforces_policy" | "supported_by"


class ClaimCandidate(BaseModel):
    id: str
    category: str
    matched_text: str
    sentence: str
    reason: str
    confidence: str = "deterministic_pattern"
    status: str = "detected"


class ClaimGraphResponse(BaseModel):
    review_id: Optional[str] = None
    total_claims: int
    total_findings: int
    total_evidence_links: int
    claims: List[ClaimCandidate]
    nodes: List[GraphNode]
    edges: List[GraphEdge]
    verification_legend: Dict[str, str] = {
        "detected": "A deterministic pattern identified a marketing claim candidate in the text.",
        "flagged": "An implemented brand governance policy produced a compliance finding.",
        "evidence_attached": "An approved evidence reference exists in the brand knowledge corpus.",
        "evidence_absent": "No approved documentation exists to substantiate this specific claim.",
    }


# Inspectable patterns mapped to rule types
CLAIM_PATTERNS = [
    (
        "absolute_guarantee",
        r"(?:guarantee[sd]?\s+[^.,!?]{0,80}?(?:\d+[x×%]|\d+\s+(?:times|fold|days?|week|month|year))|(?:guarantee[sd]?|guaranteed)\s+\w+\s+(?:result|growth|revenue|success|roi|return))",
        "Absolute outcome guarantee detected.",
    ),
    (
        "clinical_claim",
        r"clinical(?:ly)?\s+(?:proven|tested|validated|studied|demonstrated)",
        "Assertion of clinical or scientific testing.",
    ),
    (
        "superlative_ranking",
        r"(?:#\s*1|number\s+one|#1)[\s\w]{0,40}(?:trusted|popular|used|chosen|rated|brand|platform|solution|tool)|(?:the\s+)?best\s+(?:in|on|for|the)\s+\w+|most\s+(?:trusted|popular|used|advanced|innovative)\s+(?:brand|platform|tool|solution|software)",
        "Top-rank or superlative positioning claim.",
    ),
    (
        "customer_count",
        r"\b\d[\d,\.]+\+?\s*(?:happy\s+)?(?:customers?|users?|businesses?|companies|clients?)\b",
        "Specific customer or user metric cited.",
    ),
    (
        "vague_superlative",
        r"\b(?:unprecedented|unmatched|unparalleled|revolutionary|game.changing|world.class|industry.leading|transformative|cutting.edge)\b",
        "Vague, unquantified superlative language.",
    ),
    (
        "comparative_claim",
        r"(?:nothing\s+else\s+comes\s+close|outperform[s]?\s+(?:any|all|every)\s+other|unlike\s+(?:any|all)\s+(?:other|competitors?)|no\s+(?:other|competitor)\s+(?:can|comes?)|leaves?\s+(?:the\s+)?competition\s+behind)",
        "Comparative superiority claim over unnamed competitors.",
    ),
    (
        "prohibited_term",
        r"\b(?:risk.free|no\s+side\s+effects?|100\s*%\s+(?:safe|guaranteed|effective))\b",
        "Strictly prohibited commercial terminology.",
    ),
]

RULE_METADATA: Dict[str, Dict[str, str]] = {
    "absolute_guarantee": {
        "name": "FTC Guarantee Policy",
        "category": "Regulatory & Legal",
        "description": "Unqualified performance and revenue guarantees violate brand safety and FTC guidelines.",
    },
    "clinical_claim": {
        "name": "Medical & Clinical Substantiation",
        "category": "Regulatory & Medical",
        "description": "Clinical assertions require peer-reviewed trial documentation.",
    },
    "superlative_ranking": {
        "name": "Third-Party Ranking Standard",
        "category": "Market Positioning",
        "description": "Superlative #1 or Best claims require verified third-party citations.",
    },
    "customer_count": {
        "name": "CRM Metric Verification",
        "category": "Factual Verification",
        "description": "Customer metrics must reflect current approved CRM data (420,000+).",
    },
    "vague_superlative": {
        "name": "Brand Voice Integrity",
        "category": "Brand Voice & Style",
        "description": "Prohibits exaggerated fluff in favor of concrete, measurable phrasing.",
    },
    "comparative_claim": {
        "name": "Competitive Benchmark Standard",
        "category": "Competitive Compliance",
        "description": "Comparative superiority requires substantiated head-to-head data.",
    },
    "prohibited_term": {
        "name": "Prohibited Terminology List",
        "category": "Brand Safety",
        "description": "Prohibits legally indefensible phrases like 'risk-free'.",
    },
}


def split_sentences(text: str) -> List[str]:
    """Split text into sentences cleanly, preserving meaningful blocks."""
    if not text or not text.strip():
        return []
    # Split on periods, exclamation marks, question marks, and newlines
    raw_lines = re.split(r"[\n\r]+", text)
    sentences: List[str] = []
    for line in raw_lines:
        trimmed = line.strip()
        if not trimmed:
            continue
        parts = re.split(r"(?<=[.!?])\s+", trimmed)
        for p in parts:
            p_clean = p.strip()
            if p_clean:
                sentences.append(p_clean)
    return sentences


def extract_claims(content: str) -> List[ClaimCandidate]:
    """Deterministically extracts candidate marketing claims from content."""
    if not content or not content.strip():
        return []

    sentences = split_sentences(content)
    candidates: List[ClaimCandidate] = []
    seen_texts: set[str] = set()

    claim_idx = 1
    for sentence in sentences:
        for cat, pattern, reason in CLAIM_PATTERNS:
            for match in re.finditer(pattern, sentence, re.IGNORECASE):
                matched_str = match.group(0).strip()
                normalized = matched_str.lower()
                if normalized in seen_texts:
                    continue
                seen_texts.add(normalized)

                candidates.append(
                    ClaimCandidate(
                        id=f"claim-{claim_idx}",
                        category=cat,
                        matched_text=matched_str,
                        sentence=sentence,
                        reason=reason,
                        confidence="deterministic_pattern",
                        status="detected",
                    )
                )
                claim_idx += 1

    return candidates


def build_claim_graph(
    content: str,
    findings: List[Finding],
    review_id: Optional[str] = None,
) -> ClaimGraphResponse:
    """Builds node-and-edge intelligence graph linking claims, findings, rules, and evidence."""
    claims = extract_claims(content)

    nodes: List[GraphNode] = []
    edges: List[GraphEdge] = []
    node_ids: set[str] = set()
    edge_ids: set[str] = set()

    # 1. Add Claim Nodes
    for c in claims:
        node_id = c.id
        if node_id not in node_ids:
            nodes.append(
                GraphNode(
                    id=node_id,
                    type="claim",
                    label=c.matched_text,
                    category=c.category,
                    status=c.status,
                    details={
                        "sentence": c.sentence,
                        "reason": c.reason,
                        "confidence": c.confidence,
                    },
                )
            )
            node_ids.add(node_id)

    # 2. Add Finding Nodes & Claim->Finding Edges
    finding_counter = 1
    for f in findings:
        f_id = f"finding-{f.id[:8] if f.id else finding_counter}"
        finding_counter += 1
        finding_type_val = f.type.value if hasattr(f.type, "value") else str(f.type)
        severity_val = f.severity.value if hasattr(f.severity, "value") else str(f.severity)

        if f_id not in node_ids:
            nodes.append(
                GraphNode(
                    id=f_id,
                    type="finding",
                    label=f.text[:40] + ("..." if len(f.text) > 40 else ""),
                    category=finding_type_val,
                    status="flagged",
                    details={
                        "full_text": f.text,
                        "reason": f.reason,
                        "severity": severity_val,
                        "suggestion": f.suggestion,
                        "evidence_status": f.evidence_status.value if hasattr(f.evidence_status, "value") else str(f.evidence_status),
                    },
                )
            )
            node_ids.add(f_id)

        # Match finding to claim if text overlaps
        for c in claims:
            if (
                c.matched_text.lower() in f.text.lower()
                or f.text.lower() in c.matched_text.lower()
                or c.category == finding_type_val
            ):
                edge_id = f"edge-{c.id}-{f_id}"
                if edge_id not in edge_ids:
                    edges.append(
                        GraphEdge(
                            id=edge_id,
                            source=c.id,
                            target=f_id,
                            label="violates",
                            relationship="flags_claim",
                        )
                    )
                    edge_ids.add(edge_id)

        # 3. Add Rule Nodes & Finding->Rule Edges
        rule_info = RULE_METADATA.get(
            finding_type_val,
            {
                "name": finding_type_val.replace("_", " ").title(),
                "category": "Brand Compliance",
                "description": f.reason,
            },
        )
        rule_node_id = f"rule-{finding_type_val}"
        if rule_node_id not in node_ids:
            nodes.append(
                GraphNode(
                    id=rule_node_id,
                    type="rule",
                    label=rule_info["name"],
                    category=rule_info["category"],
                    status="policy_rule",
                    details={"description": rule_info["description"]},
                )
            )
            node_ids.add(rule_node_id)

        edge_f_r = f"edge-{f_id}-{rule_node_id}"
        if edge_f_r not in edge_ids:
            edges.append(
                GraphEdge(
                    id=edge_f_r,
                    source=f_id,
                    target=rule_node_id,
                    label="triggers",
                    relationship="enforces_policy",
                )
            )
            edge_ids.add(edge_f_r)

        # 4. Add Evidence Nodes & Finding->Evidence Edges (Honest representation)
        if f.source_ids:
            for s_id in f.source_ids:
                doc = next((d for d in DEMO_EVIDENCE if d.source_id == s_id), None)
                ev_node_id = f"evidence-{s_id}"
                if ev_node_id not in node_ids:
                    nodes.append(
                        GraphNode(
                            id=ev_node_id,
                            type="evidence",
                            label=doc.title if doc else s_id,
                            category="Approved Evidence",
                            status="evidence_attached",
                            details={
                                "source_id": s_id,
                                "approved_stat": doc.approved_stat if doc else "Documented reference on file",
                            },
                        )
                    )
                    node_ids.add(ev_node_id)

                edge_f_ev = f"edge-{f_id}-{ev_node_id}"
                if edge_f_ev not in edge_ids:
                    edges.append(
                        GraphEdge(
                            id=edge_f_ev,
                            source=f_id,
                            target=ev_node_id,
                            label="references",
                            relationship="supported_by",
                        )
                    )
                    edge_ids.add(edge_f_ev)

    # Validate that no dangling edges exist
    edges = [e for e in edges if e.source in node_ids and e.target in node_ids]

    evidence_link_count = sum(1 for e in edges if e.relationship == "supported_by")

    return ClaimGraphResponse(
        review_id=review_id,
        total_claims=len(claims),
        total_findings=len(findings),
        total_evidence_links=evidence_link_count,
        claims=claims,
        nodes=nodes,
        edges=edges,
    )
