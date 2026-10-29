"""
Trust Ledger and Audit Explainability Service for BrandProof.

Generates cryptographic audit records containing SHA-256 content fingerprints,
policy findings, evidence links, and human governance decisions.
Provides verifiable cryptographic integrity checks without claiming legal truth.
"""

from __future__ import annotations

import hashlib
import time
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

from .models import HumanDecision, ReviewResponse


class AuditVerificationResult(BaseModel):
    status: str  # "MATCH" | "MISMATCH" | "CANNOT_VERIFY"
    computed_fingerprint: Optional[str] = None
    expected_fingerprint: Optional[str] = None
    fingerprint_algorithm: str = "SHA-256"
    verified_at: str
    explanation: str
    limitations: str = (
        "Cryptographic verification certifies exact byte-for-byte content integrity against "
        "the recorded audit hash. It does NOT establish factual truth, legal compliance, "
        "or copyright ownership."
    )


class TrustLedgerExport(BaseModel):
    schema_version: str = "1.0.0"
    review_id: str
    review_created_at: Optional[str] = None
    audit_generated_at: str
    content_fingerprint: str
    fingerprint_algorithm: str = "SHA-256"
    fingerprint_encoding: str = "hex/utf-8"
    content_length: int
    content_excerpt: str
    channel: str
    policy_evaluator_version: str = "0.2.0-deterministic"
    triggered_rule_ids: List[str]
    findings: List[Dict[str, Any]]
    evidence_references: List[str]
    human_decisions: List[Dict[str, Any]]
    unavailable_fields: List[str]
    verification_status: str = "INITIALIZED"
    disclaimer: str = (
        "This audit record is generated deterministically by BrandProof by Inkloom AI. "
        "It provides a verifiable compliance trail for internal governance and does not constitute "
        "formal legal certification."
    )


def compute_sha256(content: str) -> str:
    """Computes exact SHA-256 hex digest of UTF-8 encoded text."""
    if not isinstance(content, str):
        raise TypeError("Content must be a string")
    return hashlib.sha256(content.encode("utf-8")).hexdigest()


def generate_trust_ledger(review: ReviewResponse) -> TrustLedgerExport:
    """Creates a versioned, exportable audit record from a saved ReviewResponse."""
    raw_content = review.content or ""
    fingerprint = compute_sha256(raw_content)

    triggered_rules = list(
        {f.type.value if hasattr(f.type, "value") else str(f.type) for f in review.findings}
    )

    evidence_ids: set[str] = set()
    for f in review.findings:
        for s_id in f.source_ids:
            evidence_ids.add(s_id)

    unavailable: List[str] = []
    if not review.created_at:
        unavailable.append("review_created_at")
    if not review.human_decisions:
        unavailable.append("human_decisions")
    if not evidence_ids:
        unavailable.append("evidence_references")

    findings_json = [
        {
            "id": f.id,
            "type": f.type.value if hasattr(f.type, "value") else str(f.type),
            "severity": f.severity.value if hasattr(f.severity, "value") else str(f.severity),
            "text": f.text,
            "reason": f.reason,
            "evidence_status": f.evidence_status.value if hasattr(f.evidence_status, "value") else str(f.evidence_status),
            "source_ids": f.source_ids,
            "suggestion": f.suggestion,
        }
        for f in review.findings
    ]

    decisions_json = [
        {
            "finding_id": d.finding_id,
            "action": d.action.value if hasattr(d.action, "value") else str(d.action),
            "note": d.note,
            "decided_at": d.decided_at,
        }
        for d in review.human_decisions
    ]

    return TrustLedgerExport(
        review_id=review.review_id,
        review_created_at=review.created_at,
        audit_generated_at=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        content_fingerprint=fingerprint,
        content_length=len(raw_content),
        content_excerpt=raw_content[:120] + ("..." if len(raw_content) > 120 else ""),
        channel=review.channel.value if hasattr(review.channel, "value") else str(review.channel),
        triggered_rule_ids=triggered_rules,
        findings=findings_json,
        evidence_references=sorted(evidence_ids),
        human_decisions=decisions_json,
        unavailable_fields=unavailable,
    )


def verify_content_integrity(
    content: Optional[str],
    expected_fingerprint: Optional[str],
) -> AuditVerificationResult:
    """
    Verifies supplied content against an expected SHA-256 digest.
    Returns MATCH, MISMATCH, or CANNOT_VERIFY.
    """
    now = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

    if content is None or not expected_fingerprint or not expected_fingerprint.strip():
        return AuditVerificationResult(
            status="CANNOT_VERIFY",
            computed_fingerprint=None,
            expected_fingerprint=expected_fingerprint,
            verified_at=now,
            explanation="Verification failed: Required content or expected digest was missing or empty.",
        )

    computed = compute_sha256(content)
    clean_expected = expected_fingerprint.strip().lower()

    if computed == clean_expected:
        return AuditVerificationResult(
            status="MATCH",
            computed_fingerprint=computed,
            expected_fingerprint=clean_expected,
            verified_at=now,
            explanation=(
                f"VERIFIED MATCH: SHA-256 digest ({computed[:12]}...) exactly matches the expected audit record. "
                "The content has not been altered or tampered with since the audit fingerprint was created."
            ),
        )
    else:
        return AuditVerificationResult(
            status="MISMATCH",
            computed_fingerprint=computed,
            expected_fingerprint=clean_expected,
            verified_at=now,
            explanation=(
                f"INTEGRITY MISMATCH: Computed hash ({computed[:12]}...) does not match expected ({clean_expected[:12]}...). "
                "The content has been modified, corrupted, or replaced."
            ),
        )
