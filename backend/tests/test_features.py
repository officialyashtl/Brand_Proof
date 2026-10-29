"""
Automated Test Suite for BrandProof Five Features:
1. Claim Intelligence Graph
2. Adversarial Brand Red Team
3. Campaign Risk Digital Twin
4. Policy Change Impact Simulator
5. Trust Ledger & Explainability
"""

from __future__ import annotations

import os
import tempfile
import pytest
from fastapi.testclient import TestClient

# Isolate DB for tests
_tmp_db = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
_tmp_db.close()
os.environ["BRANDPROOF_DB"] = _tmp_db.name

from app.main import app  # noqa: E402
from app.database import init_db  # noqa: E402
from app.claim_graph import extract_claims, build_claim_graph  # noqa: E402
from app.red_team import run_red_team_suite, RedTestCase  # noqa: E402
from app.digital_twin import evaluate_digital_twin, calculate_risk_score  # noqa: E402
from app.simulator import simulate_policy  # noqa: E402
from app.trust_ledger import compute_sha256, verify_content_integrity, generate_trust_ledger  # noqa: E402
from app.rules import run_rules  # noqa: E402

init_db()
client = TestClient(app)

SAMPLE_MARKETING = """🚀 Guaranteed 2x revenue growth in just 7 days!
Clinically proven formulas backed by science.
We are the #1 most trusted platform.
Join 500,000+ happy customers worldwide.
Revolutionary and unprecedented AI technology.
When it comes to speed, nothing else comes close.
Completely risk-free trial available today."""


# ═══════════════════════════════════════════════════════════════════════════════
# 1. Feature 1: Claim Intelligence Graph Tests
# ═══════════════════════════════════════════════════════════════════════════════


class TestClaimIntelligenceGraph:
    def test_claim_extraction_supported_patterns(self):
        claims = extract_claims(SAMPLE_MARKETING)
        assert len(claims) >= 5
        categories = [c.category for c in claims]
        assert "absolute_guarantee" in categories
        assert "clinical_claim" in categories
        assert "customer_count" in categories
        assert "prohibited_term" in categories
        for c in claims:
            assert c.id.startswith("claim-")
            assert c.matched_text
            assert c.sentence
            assert c.confidence == "deterministic_pattern"

    def test_claim_extraction_clean_content(self):
        claims = extract_claims("We provide enterprise software solutions for your operations.")
        assert len(claims) == 0

    def test_claim_extraction_empty_or_whitespace(self):
        assert extract_claims("") == []
        assert extract_claims("   \n\t  ") == []

    def test_graph_construction_valid_nodes_and_edges(self):
        findings = run_rules(SAMPLE_MARKETING)
        graph = build_claim_graph(SAMPLE_MARKETING, findings, review_id="rev-test-123")
        assert graph.total_claims > 0
        assert graph.total_findings > 0
        assert len(graph.nodes) > 0
        assert len(graph.edges) > 0

        node_ids = {n.id for n in graph.nodes}
        # Verify NO dangling edges
        for e in graph.edges:
            assert e.source in node_ids, f"Dangling edge source: {e.source}"
            assert e.target in node_ids, f"Dangling edge target: {e.target}"

    def test_graph_missing_evidence_honesty(self):
        # Text with no approved evidence in DEMO_EVIDENCE
        text = "This formula is clinically proven."
        findings = run_rules(text)
        graph = build_claim_graph(text, findings)
        evidence_nodes = [n for n in graph.nodes if n.type == "evidence"]
        # Clinically proven has no approved evidence docs -> 0 evidence nodes
        assert len(evidence_nodes) == 0
        # No supported_by edges
        ev_edges = [e for e in graph.edges if e.relationship == "supported_by"]
        assert len(ev_edges) == 0

    def test_graph_endpoint_with_content(self):
        r = client.post("/api/graph", json={"content": SAMPLE_MARKETING})
        assert r.status_code == 200
        data = r.json()
        assert "nodes" in data
        assert "edges" in data
        assert data["total_claims"] > 0

    def test_graph_endpoint_missing_params(self):
        r = client.post("/api/graph", json={})
        assert r.status_code == 422


# ═══════════════════════════════════════════════════════════════════════════════
# 2. Feature 2: Adversarial Brand Red Team Tests
# ═══════════════════════════════════════════════════════════════════════════════


class TestAdversarialRedTeam:
    def test_red_team_execution(self):
        suite = run_red_team_suite()
        assert suite.suite_version == "1.0.0"
        assert suite.metrics.total_cases >= 14
        assert suite.metrics.executed_cases == suite.metrics.total_cases
        assert suite.metrics.expected_outcome_pass_rate >= 80.0
        assert suite.metrics.true_positives > 0
        assert suite.metrics.true_negatives > 0
        assert suite.metrics.execution_duration_ms > 0

    def test_red_team_precision_recall_validity(self):
        suite = run_red_team_suite()
        m = suite.metrics
        if m.recall is not None:
            assert 0.0 <= m.recall <= 1.0
        if m.precision is not None:
            assert 0.0 <= m.precision <= 1.0

    def test_red_team_zero_division_safety(self):
        # Empty custom library must not crash with ZeroDivisionError
        empty_res = run_red_team_suite([])
        assert empty_res.metrics.total_cases == 0
        assert empty_res.metrics.recall is None
        assert empty_res.metrics.precision is None
        assert empty_res.metrics.expected_outcome_pass_rate == 0.0

    def test_red_team_determinism(self):
        run1 = run_red_team_suite()
        run2 = run_red_team_suite()
        assert run1.metrics.expected_outcome_pass_rate == run2.metrics.expected_outcome_pass_rate
        assert run1.metrics.true_positives == run2.metrics.true_positives

    def test_red_team_endpoint_post(self):
        r = client.post("/api/red-team/run")
        assert r.status_code == 200
        data = r.json()
        assert "metrics" in data
        assert "results" in data
        assert len(data["results"]) >= 14

    def test_red_team_cases_endpoint_get(self):
        r = client.get("/api/red-team/cases")
        assert r.status_code == 200
        data = r.json()
        assert data["total"] >= 14


# ═══════════════════════════════════════════════════════════════════════════════
# 3. Feature 3: Campaign Risk Digital Twin Tests
# ═══════════════════════════════════════════════════════════════════════════════


class TestCampaignRiskDigitalTwin:
    def test_digital_twin_three_profiles(self):
        res = evaluate_digital_twin(SAMPLE_MARKETING)
        assert "website" in res.channels
        assert "social" in res.channels
        assert "advertisement" in res.channels
        assert res.input_fingerprint
        assert len(res.input_fingerprint) == 64

    def test_digital_twin_channel_specific_rules(self):
        # Content without inline social disclaimer or hashtag
        res = evaluate_digital_twin(SAMPLE_MARKETING)
        social = res.channels["social"]
        ad = res.channels["advertisement"]
        web = res.channels["website"]

        # Social should flag missing disclaimer
        assert social.channel_specific_findings > 0
        assert any("social disclaimer" in f.text.lower() for f in social.findings)

        # Ad should flag missing substantiation citation
        assert any("substantiation" in f.text.lower() for f in ad.findings)

        # Website should flag missing terms link
        assert any("terms" in f.text.lower() for f in web.findings)

    def test_digital_twin_risk_score_capping(self):
        findings = run_rules(SAMPLE_MARKETING) * 5  # inflate artificially
        score, band, explanation = calculate_risk_score(findings)
        assert score <= 100
        assert band in ["Low", "Guarded", "Moderate", "High", "Critical"]

    def test_digital_twin_zero_findings_produces_zero(self):
        score, band, explanation = calculate_risk_score([])
        assert score == 0
        assert band == "Low"

    def test_digital_twin_endpoint_post(self):
        r = client.post("/api/digital-twin/evaluate", json={"content": SAMPLE_MARKETING})
        assert r.status_code == 200
        data = r.json()
        assert "channels" in data
        assert "website" in data["channels"]
        assert "social" in data["channels"]
        assert "advertisement" in data["channels"]

    def test_digital_twin_blank_rejected(self):
        r = client.post("/api/digital-twin/evaluate", json={"content": "  "})
        assert r.status_code == 422


# ═══════════════════════════════════════════════════════════════════════════════
# 4. Feature 4: Policy Change Impact Simulator Tests
# ═══════════════════════════════════════════════════════════════════════════════


class TestPolicyImpactSimulator:
    def test_simulator_rule_disable(self):
        baseline = run_rules(SAMPLE_MARKETING)
        has_guarantee_base = any(
            (f.type.value if hasattr(f.type, "value") else str(f.type)) == "absolute_guarantee"
            for f in baseline
        )
        assert has_guarantee_base

        # Disable absolute_guarantee
        sim = simulate_policy(
            content=SAMPLE_MARKETING,
            baseline_findings=baseline,
            disabled_rule_ids=["absolute_guarantee"],
        )
        assert sim.summary.disabled_rules_count == 1
        assert sim.summary.resolved_count >= 1

        resolved_item = next(
            (f for f in sim.findings if f.rule_id == "absolute_guarantee"), None
        )
        assert resolved_item is not None
        assert resolved_item.classification == "resolved_in_simulation"
        assert "disabled in simulation" in resolved_item.note

    def test_simulator_reset_identity(self):
        baseline = run_rules(SAMPLE_MARKETING)
        sim = simulate_policy(
            content=SAMPLE_MARKETING,
            baseline_findings=baseline,
            disabled_rule_ids=[],
        )
        assert sim.summary.net_change == 0
        assert sim.summary.resolved_count == 0
        assert sim.summary.newly_flagged_count == 0
        assert sim.summary.unchanged_count == len(baseline)

    def test_simulator_endpoint_post(self):
        r = client.post(
            "/api/simulator/run",
            json={"content": SAMPLE_MARKETING, "disabled_rule_ids": ["clinical_claim"]},
        )
        assert r.status_code == 200
        data = r.json()
        assert data["is_simulation"] is True
        assert "summary" in data
        assert "findings" in data


# ═══════════════════════════════════════════════════════════════════════════════
# 5. Feature 5: Trust Ledger & Explainability Tests
# ═══════════════════════════════════════════════════════════════════════════════


class TestTrustLedger:
    def test_sha256_exact_utf8_match(self):
        content = "Exact brand marketing sentence with 100% precision."
        expected_hash = compute_sha256(content)
        res = verify_content_integrity(content, expected_hash)
        assert res.status == "MATCH"
        assert res.computed_fingerprint == expected_hash

    def test_sha256_tampered_mismatch(self):
        content_original = "Official approved text."
        content_tampered = "Official approved text with an injected guarantee!"
        original_hash = compute_sha256(content_original)
        res = verify_content_integrity(content_tampered, original_hash)
        assert res.status == "MISMATCH"

    def test_cannot_verify_on_missing_input(self):
        res = verify_content_integrity(None, "some-hash")
        assert res.status == "CANNOT_VERIFY"
        res2 = verify_content_integrity("some content", "")
        assert res2.status == "CANNOT_VERIFY"

    def test_ledger_export_and_endpoint(self):
        # Create a review first
        create_res = client.post(
            "/api/reviews",
            json={"content": SAMPLE_MARKETING, "channel": "social"},
        )
        assert create_res.status_code == 201
        review_id = create_res.json()["review_id"]

        # Fetch ledger
        ledger_res = client.get(f"/api/reviews/{review_id}/ledger")
        assert ledger_res.status_code == 200
        ledger = ledger_res.json()
        assert ledger["schema_version"] == "1.0.0"
        assert ledger["review_id"] == review_id
        assert ledger["content_fingerprint"]
        assert len(ledger["content_fingerprint"]) == 64
        assert "findings" in ledger

        # Verify endpoint
        verify_res = client.post(
            "/api/ledger/verify",
            json={
                "content": SAMPLE_MARKETING,
                "expected_fingerprint": ledger["content_fingerprint"],
            },
        )
        assert verify_res.status_code == 200
        assert verify_res.json()["status"] == "MATCH"
