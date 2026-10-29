"""
Campaign Risk Digital Twin Service for BrandProof.

Evaluates marketing content across three channel policy contexts (Website,
Social Media, and Paid Advertising) with documented channel-specific rules,
content fingerprinting, and deterministic capped risk scoring.
"""

from __future__ import annotations

import hashlib
import re
import time
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

from .models import Channel, EvidenceStatus, Finding, FindingType, Severity
from .rules import run_rules


class ChannelRule(BaseModel):
    rule_id: str
    channel: str
    name: str
    condition: str
    severity: Severity
    explanation: str
    disclaimer_requirement: Optional[str] = None
    is_blocking: bool = False


class ChannelEvaluation(BaseModel):
    channel_id: str
    display_name: str
    content_fingerprint: str
    risk_score: int
    risk_band: str  # "Low" | "Guarded" | "Moderate" | "High" | "Critical"
    status: str     # "COMPLIANT" | "NEEDS_DISCLAIMER" | "HIGH_RISK" | "NON_COMPLIANT"
    score_explanation: str
    findings_count: int
    severity_breakdown: Dict[str, int]
    triggered_rule_ids: List[str]
    shared_rule_findings: int
    channel_specific_findings: int
    missing_disclaimer_warnings: List[str]
    findings: List[Finding]


class DigitalTwinResponse(BaseModel):
    input_fingerprint: str
    content_length: int
    evaluated_at: str
    channels: Dict[str, ChannelEvaluation]
    summary_comparison: Dict[str, Any]
    scoring_methodology: Dict[str, Any] = {
        "formula": "min(100, sum(unique finding severity weights))",
        "weights": {"high": 25, "medium": 12, "low": 5},
        "bands": {
            "0-19": "Low",
            "20-39": "Guarded",
            "40-59": "Moderate",
            "60-79": "High",
            "80-100": "Critical",
        },
    }


# ─── Severity Weights ─────────────────────────────────────────────────────────

SEVERITY_WEIGHTS: Dict[str, int] = {
    "critical": 40,
    "high": 25,
    "medium": 12,
    "low": 5,
    "informational": 0,
}


def calculate_risk_score(findings: List[Finding]) -> tuple[int, str, str]:
    """Calculates deterministic risk score capped at 100 with documented bands."""
    if not findings:
        return 0, "Low", "No compliance breaches detected. Minimal risk profile."

    # Avoid double-counting: use unique findings by type
    unique_types: Dict[str, Severity] = {}
    for f in findings:
        ft = f.type.value if hasattr(f.type, "value") else str(f.type)
        if ft not in unique_types:
            unique_types[ft] = f.severity

    total_weight = 0
    weight_breakdown: List[str] = []
    for ft, sev in unique_types.items():
        sev_key = sev.value if hasattr(sev, "value") else str(sev)
        w = SEVERITY_WEIGHTS.get(sev_key.lower(), 5)
        total_weight += w
        weight_breakdown.append(f"{ft} ({sev_key}: +{w})")

    score = min(100, total_weight)

    if score <= 19:
        band = "Low"
    elif score <= 39:
        band = "Guarded"
    elif score <= 59:
        band = "Moderate"
    elif score <= 79:
        band = "High"
    else:
        band = "Critical"

    explanation = (
        f"Score {score}/100 ({band}) calculated from {len(unique_types)} unique policy violation(s): "
        + ", ".join(weight_breakdown)
        + (". Capped at 100." if total_weight > 100 else ".")
    )

    return score, band, explanation


# ─── Channel-Specific Rule Evaluators ─────────────────────────────────────────


def evaluate_website_rules(content: str) -> List[Finding]:
    """Website profile: checks mandatory terms & privacy link disclosures."""
    findings: List[Finding] = []
    has_terms_ref = bool(
        re.search(r"\b(?:terms|conditions|privacy|policy|guarantee\s+terms)\b", content, re.IGNORECASE)
    )
    has_commercial_claim = bool(
        re.search(r"\b(?:guarantees?|free\s+trial|revenue|growth|clinically)\b", content, re.IGNORECASE)
    )

    if has_commercial_claim and not has_terms_ref:
        findings.append(
            Finding(
                id="web-terms-01",
                type=FindingType.prohibited_term,
                severity=Severity.medium,
                text="Missing terms or policy link",
                reason=(
                    "Website landing page features commercial outcome claims without referencing "
                    "terms of service or full qualification policy."
                ),
                evidence_status=EvidenceStatus.not_found,
                source_ids=[],
                suggestion="Add footer disclaimer: 'Terms and conditions apply. See brand.com/terms for details.'",
            )
        )
    return findings


def evaluate_social_rules(content: str) -> List[Finding]:
    """Social profile: checks inline disclaimer requirements and promotional tags."""
    findings: List[Finding] = []

    # 1. Prominent outcome disclaimer check
    has_outcome_claim = bool(
        re.search(r"\b(?:guarantee[sd]?|clinically|2x|revenue|growth)\b", content, re.IGNORECASE)
    )
    has_inline_disclaimer = bool(
        re.search(r"(?:\*|results?\s+vary|conditions?\s+apply|individual\s+results)", content, re.IGNORECASE)
    )
    if has_outcome_claim and not has_inline_disclaimer:
        findings.append(
            Finding(
                id="soc-disc-01",
                type=FindingType.absolute_guarantee,
                severity=Severity.high,
                text="Missing in-caption social disclaimer",
                reason=(
                    "Social media posts with performance or clinical claims require immediate, "
                    "visible inline qualifying disclosures without requiring user clicks."
                ),
                evidence_status=EvidenceStatus.not_found,
                source_ids=[],
                suggestion="Append inline caption note: '*Results vary by business. Past performance does not guarantee future results.'",
            )
        )

    # 2. Promotional sponsor tag check
    has_promo_cta = bool(
        re.search(r"\b(?:free\s+trial|limited[- ]time|start\s+today|buy\s+now)\b", content, re.IGNORECASE)
    )
    has_ad_tag = bool(
        re.search(r"(?:#ad\b|#sponsored\b|#partner\b|\[promoted\])", content, re.IGNORECASE)
    )
    if has_promo_cta and not has_ad_tag:
        findings.append(
            Finding(
                id="soc-tag-02",
                type=FindingType.prohibited_term,
                severity=Severity.medium,
                text="Missing promotional identification tag",
                reason=(
                    "Promotional social media copy with direct conversion calls-to-action requires "
                    "clear commercial identification per FTC endorsement guidelines."
                ),
                evidence_status=EvidenceStatus.not_found,
                source_ids=[],
                suggestion="Include standard campaign identifier hashtag: '#ad' or '#sponsored'.",
            )
        )

    return findings


def evaluate_paid_ad_rules(content: str) -> List[Finding]:
    """Paid Ads profile: strict substantiation and pricing condition disclosures."""
    findings: List[Finding] = []

    # 1. Paid ad substantiation requirement
    has_quantified_claim = bool(
        re.search(r"\b(?:\d+[x×%]|revenue|#1|clinically|customers?)\b", content, re.IGNORECASE)
    )
    has_substantiation = bool(
        re.search(r"(?:\*|clinical\s+trial|see\s+(?:report|details|results)|source:|basis:|n=\d+)", content, re.IGNORECASE)
    )
    if has_quantified_claim and not has_substantiation:
        findings.append(
            Finding(
                id="ad-sub-01",
                type=FindingType.superlative_ranking,
                severity=Severity.high,
                text="Missing paid ad substantiation citation",
                reason=(
                    "Paid advertising is held to strict FTC prior-substantiation standards. "
                    "Quantified claims require visible footnote attribution in the ad unit."
                ),
                evidence_status=EvidenceStatus.not_found,
                source_ids=[],
                suggestion="Include ad unit footnote: '*Based on independent 2025 benchmark data. Details at brand.com/audit.'",
            )
        )

    # 2. Free trial billing terms disclosure
    has_trial = bool(re.search(r"\bfree\s+trial\b", content, re.IGNORECASE))
    has_billing_terms = bool(
        re.search(r"(?:\d+\s+days?|no\s+credit\s+card|cancel\s+anytime|subscription|auto[- ]renew)", content, re.IGNORECASE)
    )
    if has_trial and not has_billing_terms:
        findings.append(
            Finding(
                id="ad-trial-02",
                type=FindingType.prohibited_term,
                severity=Severity.medium,
                text="Unqualified free-trial ad claim",
                reason=(
                    "Paid ads offering free trials must disclose material billing conditions, "
                    "such as duration or cancellation policy, before signup."
                ),
                evidence_status=EvidenceStatus.not_found,
                source_ids=[],
                suggestion="Specify trial terms in ad: '14-day free trial, no credit card required, cancel anytime.'",
            )
        )

    return findings


def evaluate_digital_twin(content: str) -> DigitalTwinResponse:
    """Evaluates content across Website, Social Media, and Paid Advertising profiles."""
    if not content or not content.strip():
        fingerprint = hashlib.sha256(b"").hexdigest()
    else:
        fingerprint = hashlib.sha256(content.encode("utf-8")).hexdigest()

    # Core shared findings from deterministic engine
    core_findings = run_rules(content)

    # Channel profiles
    channel_configs = [
        ("website", "Website Presence", evaluate_website_rules),
        ("social", "Social Media Campaign", evaluate_social_rules),
        ("advertisement", "Paid Advertising Unit", evaluate_paid_ad_rules),
    ]

    channels_result: Dict[str, ChannelEvaluation] = {}
    scores: Dict[str, int] = {}

    for ch_id, ch_name, extra_fn in channel_configs:
        extra_findings = extra_fn(content)
        all_ch_findings = list(core_findings) + extra_findings

        score, band, explanation = calculate_risk_score(all_ch_findings)
        scores[ch_id] = score

        # Count severities
        sev_counts: Dict[str, int] = {"high": 0, "medium": 0, "low": 0}
        for f in all_ch_findings:
            sev_key = f.severity.value if hasattr(f.severity, "value") else str(f.severity)
            sev_counts[sev_key.lower()] = sev_counts.get(sev_key.lower(), 0) + 1

        # Missing disclaimer warnings
        disclaimer_warnings: List[str] = []
        for ef in extra_findings:
            if "disclaimer" in ef.reason.lower() or "disclosure" in ef.reason.lower():
                disclaimer_warnings.append(ef.reason)

        status_val = (
            "COMPLIANT" if score < 20 else
            "NEEDS_DISCLAIMER" if score < 40 else
            "HIGH_RISK" if score < 60 else "NON_COMPLIANT"
        )

        triggered_rule_ids = list(
            {f.type.value if hasattr(f.type, "value") else str(f.type) for f in all_ch_findings}
        )

        channels_result[ch_id] = ChannelEvaluation(
            channel_id=ch_id,
            display_name=ch_name,
            content_fingerprint=fingerprint,
            risk_score=score,
            risk_band=band,
            status=status_val,
            score_explanation=explanation,
            findings_count=len(all_ch_findings),
            severity_breakdown=sev_counts,
            triggered_rule_ids=triggered_rule_ids,
            shared_rule_findings=len(core_findings),
            channel_specific_findings=len(extra_findings),
            missing_disclaimer_warnings=disclaimer_warnings,
            findings=all_ch_findings,
        )

    # Highest vs Lowest risk summary
    sorted_channels = sorted(scores.items(), key=lambda item: item[1], reverse=True)
    highest_channel = sorted_channels[0][0]
    lowest_channel = sorted_channels[-1][0]

    summary = {
        "highest_risk_channel": highest_channel,
        "highest_risk_score": scores[highest_channel],
        "lowest_risk_channel": lowest_channel,
        "lowest_risk_score": scores[lowest_channel],
        "shared_core_findings": len(core_findings),
    }

    return DigitalTwinResponse(
        input_fingerprint=fingerprint,
        content_length=len(content),
        evaluated_at=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        channels=channels_result,
        summary_comparison=summary,
    )
