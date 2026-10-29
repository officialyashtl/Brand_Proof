"""
Policy Change Impact Simulator Service for BrandProof.

Allows compliance officers to simulate the effect of toggling rules or adjusting
parameters on real content in an isolated in-memory environment, without mutating
global rule registries, persisted SQLite reviews, or human decisions.
"""

from __future__ import annotations

from typing import Any, Callable, Dict, List, Optional
from pydantic import BaseModel, Field

from .models import Finding, FindingType, Severity
from .rules import (
    rule_absolute_guarantee,
    rule_clinical_claim,
    rule_comparative_claim,
    rule_customer_count,
    rule_prohibited_terms,
    rule_superlative_ranking,
    rule_vague_superlative,
    run_rules,
)


class ClassifiedFinding(BaseModel):
    finding_id: str
    rule_id: str
    severity: Severity
    text: str
    reason: str
    suggestion: str
    classification: str  # "unchanged" | "resolved_in_simulation" | "newly_flagged" | "severity_changed"
    note: str


class PolicySimulationSummary(BaseModel):
    baseline_findings_count: int
    simulated_findings_count: int
    net_change: int
    unchanged_count: int
    resolved_count: int
    newly_flagged_count: int
    active_rules_count: int
    disabled_rules_count: int


class PolicySimulationResponse(BaseModel):
    review_id: Optional[str] = None
    is_simulation: bool = True
    notice: str = "SIMULATION ONLY: No changes have been applied to production policies or stored review records."
    disabled_rule_ids: List[str]
    summary: PolicySimulationSummary
    findings: List[ClassifiedFinding]


# Mapping of rule identifiers to their rule functions
RULE_DISPATCH: Dict[str, Callable[[str], Optional[Finding]]] = {
    "absolute_guarantee": rule_absolute_guarantee,
    "clinical_claim": rule_clinical_claim,
    "superlative_ranking": rule_superlative_ranking,
    "customer_count": rule_customer_count,
    "vague_superlative": rule_vague_superlative,
    "comparative_claim": rule_comparative_claim,
    "prohibited_term": rule_prohibited_terms,
}


def simulate_policy(
    content: str,
    baseline_findings: List[Finding],
    disabled_rule_ids: List[str],
    review_id: Optional[str] = None,
) -> PolicySimulationResponse:
    """
    Executes an isolated simulation of policy adjustments on content.
    Does not mutate global RULES.
    """
    disabled_set = set(disabled_rule_ids)

    # Build active rule list for this run only
    simulated_rules = [
        fn for r_id, fn in RULE_DISPATCH.items()
        if r_id not in disabled_set
    ]

    # Run in-memory evaluation
    simulated_findings: List[Finding] = []
    for rule_fn in simulated_rules:
        res = rule_fn(content)
        if res is not None:
            simulated_findings.append(res)

    # Classify findings between baseline and simulated
    baseline_map: Dict[str, Finding] = {
        (f.type.value if hasattr(f.type, "value") else str(f.type)): f
        for f in baseline_findings
    }
    simulated_map: Dict[str, Finding] = {
        (f.type.value if hasattr(f.type, "value") else str(f.type)): f
        for f in simulated_findings
    }

    all_rule_keys = set(baseline_map.keys()) | set(simulated_map.keys())
    classified: List[ClassifiedFinding] = []

    unchanged_c = 0
    resolved_c = 0
    new_c = 0

    for r_key in sorted(all_rule_keys):
        in_base = r_key in baseline_map
        in_sim = r_key in simulated_map

        if in_base and in_sim:
            unchanged_c += 1
            f = simulated_map[r_key]
            classified.append(
                ClassifiedFinding(
                    finding_id=f.id,
                    rule_id=r_key,
                    severity=f.severity,
                    text=f.text,
                    reason=f.reason,
                    suggestion=f.suggestion,
                    classification="unchanged",
                    note="Finding persists under the simulated policy.",
                )
            )
        elif in_base and not in_sim:
            resolved_c += 1
            f = baseline_map[r_key]
            is_disabled = r_key in disabled_set
            note = (
                f"Finding suppressed because rule '{r_key}' was disabled in simulation. "
                "This does NOT certify the content is safe or compliant."
                if is_disabled
                else "Finding resolved under simulated parameters."
            )
            classified.append(
                ClassifiedFinding(
                    finding_id=f.id,
                    rule_id=r_key,
                    severity=f.severity,
                    text=f.text,
                    reason=f.reason,
                    suggestion=f.suggestion,
                    classification="resolved_in_simulation",
                    note=note,
                )
            )
        elif not in_base and in_sim:
            new_c += 1
            f = simulated_map[r_key]
            classified.append(
                ClassifiedFinding(
                    finding_id=f.id,
                    rule_id=r_key,
                    severity=f.severity,
                    text=f.text,
                    reason=f.reason,
                    suggestion=f.suggestion,
                    classification="newly_flagged",
                    note="New compliance issue detected under simulated policy configuration.",
                )
            )

    summary = PolicySimulationSummary(
        baseline_findings_count=len(baseline_findings),
        simulated_findings_count=len(simulated_findings),
        net_change=len(simulated_findings) - len(baseline_findings),
        unchanged_count=unchanged_c,
        resolved_count=resolved_c,
        newly_flagged_count=new_c,
        active_rules_count=len(simulated_rules),
        disabled_rules_count=len(disabled_set),
    )

    return PolicySimulationResponse(
        review_id=review_id,
        disabled_rule_ids=list(disabled_set),
        summary=summary,
        findings=classified,
    )
