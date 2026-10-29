"""
Adversarial Brand Red Team Service for BrandProof.

Evaluates the real deterministic rule engine against a balanced benchmark
of risky adversarial statements and safe control cases. Computes case-level
and rule-level metrics with zero-division safety.
"""

from __future__ import annotations

import time
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

from .models import FindingType
from .rules import run_rules


class RedTestCase(BaseModel):
    case_id: str
    category: str
    input_text: str
    expected_rule_ids: List[str]
    description: str
    case_version: str = "1.0.0"
    is_positive: bool = True  # True = expected to trigger rule; False = control/safe


class CaseExecutionResult(BaseModel):
    case_id: str
    category: str
    input_text: str
    expected_rule_ids: List[str]
    actual_rule_ids: List[str]
    passed: bool
    description: str
    failure_explanation: Optional[str] = None
    findings_count: int


class RedTeamSummaryMetrics(BaseModel):
    total_cases: int
    executed_cases: int
    passed_cases: int
    failed_cases: int
    expected_outcome_pass_rate: float
    true_positives: int
    false_positives: int
    true_negatives: int
    false_negatives: int
    recall: Optional[float] = None
    precision: Optional[float] = None
    f1_score: Optional[float] = None
    execution_duration_ms: float


class RedTeamSuiteResponse(BaseModel):
    suite_version: str = "1.0.0"
    executed_at: str
    evaluator_version: str = "0.2.0-deterministic"
    metrics: RedTeamSummaryMetrics
    results: List[CaseExecutionResult]
    metric_definitions: Dict[str, str] = {
        "pass_rate": "Proportion of test cases where actual findings matched expected findings exactly.",
        "recall": "TP / (TP + FN): Ability of the engine to detect compliance breaches when present.",
        "precision": "TP / (TP + FP): Proportion of flagged breaches that were genuinely expected.",
        "f1_score": "Harmonic mean of precision and recall.",
    }


# ─── Balanced Red Team Test Library ──────────────────────────────────────────
# Covers all 7 supported rules + control cases + variations.

RED_TEAM_LIBRARY: List[RedTestCase] = [
    # 1. Absolute Guarantee (Positives + Control)
    RedTestCase(
        case_id="RT-AG-01",
        category="absolute_guarantee",
        input_text="Our platform guarantees 2x revenue growth in just 7 days.",
        expected_rule_ids=["absolute_guarantee"],
        description="Standard time-and-multiplier performance guarantee.",
        is_positive=True,
    ),
    RedTestCase(
        case_id="RT-AG-02",
        category="absolute_guarantee",
        input_text="We offer a guaranteed return on your investment within 30 days.",
        expected_rule_ids=["absolute_guarantee"],
        description="ROI guarantee phrasing.",
        is_positive=True,
    ),
    RedTestCase(
        case_id="RT-AG-03",
        category="absolute_guarantee",
        input_text="Our team works hard every day to support client revenue growth.",
        expected_rule_ids=[],
        description="Control: Mention of revenue growth without guarantee qualifier.",
        is_positive=False,
    ),

    # 2. Clinical Claim (Positives + Control)
    RedTestCase(
        case_id="RT-CC-01",
        category="clinical_claim",
        input_text="Our wellness supplements are clinically proven to increase stamina.",
        expected_rule_ids=["clinical_claim"],
        description="Direct clinically proven statement without clinical trial docs.",
        is_positive=True,
    ),
    RedTestCase(
        case_id="RT-CC-02",
        category="clinical_claim",
        input_text="Formula has been clinically tested across multiple patient trials.",
        expected_rule_ids=["clinical_claim"],
        description="Clinically tested variation.",
        is_positive=True,
    ),
    RedTestCase(
        case_id="RT-CC-03",
        category="clinical_claim",
        input_text="Developed in a clean facility following standard manufacturing practices.",
        expected_rule_ids=[],
        description="Control: Safe facility description without clinical claims.",
        is_positive=False,
    ),

    # 3. Superlative Ranking (Positives + Control)
    RedTestCase(
        case_id="RT-SR-01",
        category="superlative_ranking",
        input_text="We are the #1 most trusted brand in the industry.",
        expected_rule_ids=["superlative_ranking"],
        description="Unsubstantiated #1 most trusted claim.",
        is_positive=True,
    ),
    RedTestCase(
        case_id="RT-SR-02",
        category="superlative_ranking",
        input_text="Recognized as the best platform for mid-market marketing.",
        expected_rule_ids=["superlative_ranking"],
        description="Unsubstantiated 'best platform for' claim.",
        is_positive=True,
    ),
    RedTestCase(
        case_id="RT-SR-03",
        category="superlative_ranking",
        input_text="Rated 4.9/5 by over 10,000 verified users on G2 in Q3 2025.",
        expected_rule_ids=[],
        description="Control: Properly attributed third-party rating with source citation.",
        is_positive=False,
    ),

    # 4. Customer Count (Positives + Control)
    RedTestCase(
        case_id="RT-CNT-01",
        category="customer_count",
        input_text="Proudly serving 500,000+ happy customers worldwide.",
        expected_rule_ids=["customer_count"],
        description="Customer count mismatch (500k vs approved 420k).",
        is_positive=True,
    ),
    RedTestCase(
        case_id="RT-CNT-02",
        category="customer_count",
        input_text="Trusted by 420,000+ customers across 60 countries.",
        expected_rule_ids=[],
        description="Control: Exact approved CRM figure (420,000) passes without finding.",
        is_positive=False,
    ),

    # 5. Vague Superlative (Positives + Control)
    RedTestCase(
        case_id="RT-VS-01",
        category="vague_superlative",
        input_text="Our revolutionary technology delivers unprecedented speed.",
        expected_rule_ids=["vague_superlative"],
        description="Contains flagged brand-voice superlatives 'revolutionary' and 'unprecedented'.",
        is_positive=True,
    ),
    RedTestCase(
        case_id="RT-VS-02",
        category="vague_superlative",
        input_text="Our software uses structured automation to streamline repetitive data entry.",
        expected_rule_ids=[],
        description="Control: Precise and concrete descriptive copy.",
        is_positive=False,
    ),

    # 6. Comparative Claim (Positives + Control)
    RedTestCase(
        case_id="RT-CMP-01",
        category="comparative_claim",
        input_text="When it comes to reliability, nothing else comes close.",
        expected_rule_ids=["comparative_claim"],
        description="Unsubstantiated comparative claim 'nothing else comes close'.",
        is_positive=True,
    ),
    RedTestCase(
        case_id="RT-CMP-02",
        category="comparative_claim",
        input_text="Compare our published specifications against your team's workflow requirements.",
        expected_rule_ids=[],
        description="Control: Objective invitation to review specs without superiority assertion.",
        is_positive=False,
    ),

    # 7. Prohibited Terms (Positives + Control)
    RedTestCase(
        case_id="RT-PT-01",
        category="prohibited_term",
        input_text="Get started with our completely risk-free trial today.",
        expected_rule_ids=["prohibited_term"],
        description="Direct inclusion of prohibited term 'risk-free'.",
        is_positive=True,
    ),
    RedTestCase(
        case_id="RT-PT-02",
        category="prohibited_term",
        input_text="We offer transparent 14-day evaluation periods under standard user terms.",
        expected_rule_ids=[],
        description="Control: Clear policy terms without using 'risk-free' guarantee.",
        is_positive=False,
    ),
]


def run_red_team_suite(custom_library: Optional[List[RedTestCase]] = None) -> RedTeamSuiteResponse:
    """Executes every test case against the real run_rules engine and tallies metrics."""
    library = custom_library if custom_library is not None else RED_TEAM_LIBRARY
    start_time = time.perf_counter()

    results: List[CaseExecutionResult] = []
    tp = 0
    fp = 0
    tn = 0
    fn = 0
    passed_cases = 0

    for case in library:
        findings = run_rules(case.input_text)
        actual_rule_ids = [
            f.type.value if hasattr(f.type, "value") else str(f.type)
            for f in findings
        ]

        expected_set = set(case.expected_rule_ids)
        actual_set = set(actual_rule_ids)

        # A case passes if all expected rules are present, and if it's a negative control, no findings are triggered.
        if case.is_positive:
            # Positive expectation: did it trigger the expected rule(s)?
            has_expected = expected_set.issubset(actual_set) and len(expected_set) > 0
            case_passed = has_expected
            if has_expected:
                tp += len(expected_set)
                # Any unexpected extra findings count as false positive detections
                extra = actual_set - expected_set
                fp += len(extra)
            else:
                missing = expected_set - actual_set
                fn += len(missing)
                # Any triggered but unexpected rule
                extra = actual_set - expected_set
                fp += len(extra)
        else:
            # Negative control: expected 0 findings or no match for expected rules
            if len(actual_set) == 0:
                case_passed = True
                tn += 1
            else:
                case_passed = False
                fp += len(actual_set)

        if case_passed:
            passed_cases += 1
            failure_explanation = None
        else:
            if case.is_positive:
                missing = expected_set - actual_set
                extra = actual_set - expected_set
                failure_explanation = (
                    f"Expected rules {list(expected_set)} but got {list(actual_set)}. "
                    f"Missing: {list(missing) if missing else 'None'}."
                )
            else:
                failure_explanation = (
                    f"Negative control case expected 0 findings, but triggered {list(actual_set)}."
                )

        results.append(
            CaseExecutionResult(
                case_id=case.case_id,
                category=case.category,
                input_text=case.input_text,
                expected_rule_ids=case.expected_rule_ids,
                actual_rule_ids=actual_rule_ids,
                passed=case_passed,
                description=case.description,
                failure_explanation=failure_explanation,
                findings_count=len(findings),
            )
        )

    end_time = time.perf_counter()
    duration_ms = round((end_time - start_time) * 1000, 2)

    total_executed = len(library)
    pass_rate = round((passed_cases / total_executed * 100), 1) if total_executed > 0 else 0.0

    # Calculate recall and precision with safe zero-denominator handling
    recall = round(tp / (tp + fn), 3) if (tp + fn) > 0 else None
    precision = round(tp / (tp + fp), 3) if (tp + fp) > 0 else None

    f1 = None
    if recall is not None and precision is not None and (precision + recall) > 0:
        f1 = round(2 * (precision * recall) / (precision + recall), 3)

    metrics = RedTeamSummaryMetrics(
        total_cases=len(library),
        executed_cases=total_executed,
        passed_cases=passed_cases,
        failed_cases=total_executed - passed_cases,
        expected_outcome_pass_rate=pass_rate,
        true_positives=tp,
        false_positives=fp,
        true_negatives=tn,
        false_negatives=fn,
        recall=recall,
        precision=precision,
        f1_score=f1,
        execution_duration_ms=duration_ms,
    )

    return RedTeamSuiteResponse(
        executed_at=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        metrics=metrics,
        results=results,
    )
