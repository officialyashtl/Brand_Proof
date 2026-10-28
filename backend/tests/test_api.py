"""
BrandProof backend test suite.

Covers:
  - Rule detection accuracy for all 7 rules
  - Input validation (blank content, invalid channel, missing fields)
  - Evidence status logic (not_found, partial, found)
  - Review persistence (create → retrieve round-trip)
  - Human decision recording (accept, reject, re-decide)
  - API response shape and status codes

Run with:
    python -m pytest tests/ -v
from the backend/ directory with the venv active.
"""

from __future__ import annotations

import os
import tempfile

import pytest
from fastapi.testclient import TestClient

# ─── Isolate the test database ────────────────────────────────────────────────
# Set env var BEFORE importing app so database.py picks it up.
_tmp_db = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
_tmp_db.close()
os.environ["BRANDPROOF_DB"] = _tmp_db.name

from app.main import app  # noqa: E402
from app.database import init_db  # noqa: E402
from app.rules import (  # noqa: E402
    run_rules,
    rule_absolute_guarantee,
    rule_clinical_claim,
    rule_comparative_claim,
    rule_customer_count,
    rule_prohibited_terms,
    rule_superlative_ranking,
    rule_vague_superlative,
)
from app.brand_data import lookup_evidence  # noqa: E402
from app.models import FindingType, Severity, EvidenceStatus  # noqa: E402

# Initialise DB once for the test session
init_db()

client = TestClient(app)


# ═══════════════════════════════════════════════════════════════════════════════
# Helpers
# ═══════════════════════════════════════════════════════════════════════════════


def _post_review(content: str, channel: str = "social", brand_id: str = "demo-brand"):
    return client.post(
        "/api/reviews",
        json={"content": content, "channel": channel, "brand_id": brand_id},
    )


# ═══════════════════════════════════════════════════════════════════════════════
# 1. Rule detection — unit tests
# ═══════════════════════════════════════════════════════════════════════════════


class TestRuleAbsoluteGuarantee:
    def test_detects_guarantees_2x(self):
        f = rule_absolute_guarantee("Our product guarantees 2x revenue in 7 days!")
        assert f is not None
        assert f.type == FindingType.absolute_guarantee
        assert f.severity == Severity.high

    def test_detects_guarantees_50_percent(self):
        f = rule_absolute_guarantee("We guarantee 50% improvement in 30 days.")
        assert f is not None

    def test_no_false_positive_on_neutral(self):
        f = rule_absolute_guarantee("We offer a free demo with no strings attached.")
        assert f is None

    def test_suggestion_is_non_empty(self):
        f = rule_absolute_guarantee("guarantees 3x growth in 14 days")
        assert f is not None
        assert len(f.suggestion) > 0


class TestRuleClinicalClaim:
    def test_detects_clinically_proven(self):
        f = rule_clinical_claim("Clinically proven results for everyone.")
        assert f is not None
        assert f.type == FindingType.clinical_claim
        assert f.severity == Severity.high

    def test_detects_clinically_tested(self):
        f = rule_clinical_claim("Our formula is clinically tested and safe.")
        assert f is not None

    def test_no_false_positive(self):
        f = rule_clinical_claim("Our team tested this thoroughly in-house.")
        assert f is None


class TestRuleSuperlativeRanking:
    def test_detects_hash_one_trusted(self):
        f = rule_superlative_ranking("The #1 most trusted brand in the industry.")
        assert f is not None
        assert f.type == FindingType.superlative_ranking
        assert f.severity == Severity.high

    def test_detects_number_one(self):
        f = rule_superlative_ranking("Number one platform for marketers.")
        assert f is not None

    def test_detects_most_trusted(self):
        f = rule_superlative_ranking("The most trusted software in the industry.")
        assert f is not None

    def test_no_false_positive_on_regular(self):
        f = rule_superlative_ranking("A great solution for modern teams.")
        assert f is None


class TestRuleCustomerCount:
    def test_detects_500k(self):
        f = rule_customer_count("Used by 500,000+ happy customers worldwide.")
        assert f is not None
        assert f.type == FindingType.customer_count
        assert f.severity == Severity.medium

    def test_exact_approved_count_passes(self):
        # 420,000 is the approved figure — should return None (compliant)
        f = rule_customer_count("Trusted by 420,000+ customers across 60 countries.")
        assert f is None

    def test_detects_1_million(self):
        f = rule_customer_count("Over 1,000,000 businesses trust us.")
        assert f is not None

    def test_no_false_positive_on_no_number(self):
        f = rule_customer_count("Thousands of customers love our product.")
        assert f is None


class TestRuleVagueSuperlative:
    def test_detects_unprecedented(self):
        f = rule_vague_superlative("Experience unprecedented growth with our tool.")
        assert f is not None
        assert f.type == FindingType.vague_superlative
        assert f.severity == Severity.medium

    def test_detects_unparalleled(self):
        f = rule_vague_superlative("Our unparalleled technology sets us apart.")
        assert f is not None

    def test_detects_revolutionary(self):
        f = rule_vague_superlative("A revolutionary platform for the modern age.")
        assert f is not None

    def test_no_false_positive(self):
        f = rule_vague_superlative("Consistent, measurable results for your team.")
        assert f is None


class TestRuleComparativeClaim:
    def test_detects_nothing_else_comes_close(self):
        f = rule_comparative_claim("Unparalleled — nothing else comes close.")
        assert f is not None
        assert f.type == FindingType.comparative_claim
        assert f.severity == Severity.low

    def test_detects_outperforms_all(self):
        f = rule_comparative_claim("It outperforms any other tool on the market.")
        assert f is not None

    def test_no_false_positive(self):
        f = rule_comparative_claim("We built this to suit modern teams.")
        assert f is None


class TestRuleProhibitedTerms:
    def test_detects_risk_free(self):
        f = rule_prohibited_terms("Start today — completely risk-free!")
        assert f is not None
        assert f.type == FindingType.prohibited_term
        assert f.severity == Severity.high

    def test_detects_100_percent_guaranteed(self):
        f = rule_prohibited_terms("100% guaranteed or your money back.")
        assert f is not None

    def test_no_false_positive_on_clean_text(self):
        f = rule_prohibited_terms("Start your free trial today.")
        assert f is None


# ═══════════════════════════════════════════════════════════════════════════════
# 2. Evidence status — unit tests
# ═══════════════════════════════════════════════════════════════════════════════


class TestEvidenceLookup:
    def test_unknown_claim_is_not_found(self):
        source_ids, status = lookup_evidence("banana smoothies are healthy")
        assert status == "not_found"
        assert source_ids == []

    def test_revenue_claim_returns_source(self):
        source_ids, status = lookup_evidence("guarantees 2x revenue growth")
        # "revenue" keyword should match DEMO-EV-001
        assert "DEMO-EV-001" in source_ids
        assert status in ("found", "partial")

    def test_customer_count_partial(self):
        # 500,000 customers → matches "customers" keyword → DEMO-EV-003
        source_ids, status = lookup_evidence("500,000+ happy customers")
        assert "DEMO-EV-003" in source_ids

    def test_empty_content_returns_not_found(self):
        source_ids, status = lookup_evidence("")
        assert status == "not_found"
        assert source_ids == []


# ═══════════════════════════════════════════════════════════════════════════════
# 3. run_rules integration — unit tests
# ═══════════════════════════════════════════════════════════════════════════════


class TestRunRules:
    SAMPLE = (
        "Our software guarantees 2x revenue in just 7 days.\n"
        "Clinically proven results. The #1 most trusted brand.\n"
        "Used by 500,000+ happy customers. Unprecedented growth.\n"
        "Nothing else comes close. Risk-free trial available."
    )

    def test_full_sample_returns_multiple_findings(self):
        findings = run_rules(self.SAMPLE)
        assert len(findings) >= 5

    def test_finding_ids_are_unique(self):
        findings = run_rules(self.SAMPLE)
        ids = [f.id for f in findings]
        assert len(ids) == len(set(ids))

    def test_each_finding_has_required_fields(self):
        findings = run_rules(self.SAMPLE)
        for f in findings:
            assert f.id
            assert f.type
            assert f.severity
            assert f.text
            assert f.reason
            assert f.suggestion
            assert f.evidence_status in (
                EvidenceStatus.found,
                EvidenceStatus.partial,
                EvidenceStatus.not_found,
            )

    def test_clean_content_returns_no_findings(self):
        clean = (
            "Discover our marketing platform. "
            "Trusted by 420,000+ customers across 60 countries. "
            "Rated 4.9/5 by over 10,000 users on G2."
        )
        findings = run_rules(clean)
        assert findings == []


# ═══════════════════════════════════════════════════════════════════════════════
# 4. API validation — integration tests
# ═══════════════════════════════════════════════════════════════════════════════


class TestAPIValidation:
    def test_blank_content_rejected(self):
        r = _post_review("   ")
        assert r.status_code == 422

    def test_empty_content_rejected(self):
        r = _post_review("")
        assert r.status_code == 422

    def test_invalid_channel_rejected(self):
        r = client.post(
            "/api/reviews",
            json={"content": "Hello world", "channel": "fax"},
        )
        assert r.status_code == 422

    def test_missing_content_field_rejected(self):
        r = client.post("/api/reviews", json={"channel": "social"})
        assert r.status_code == 422

    def test_missing_channel_field_rejected(self):
        r = client.post("/api/reviews", json={"content": "Hello world"})
        assert r.status_code == 422

    def test_all_valid_channels_accepted(self):
        for ch in ("social", "website", "email", "advertisement"):
            r = _post_review("Great content here.", channel=ch)
            assert r.status_code == 201, f"Expected 201 for channel={ch}"


# ═══════════════════════════════════════════════════════════════════════════════
# 5. Review create → retrieve round-trip
# ═══════════════════════════════════════════════════════════════════════════════


class TestReviewRoundTrip:
    def test_create_returns_201_and_review_id(self):
        r = _post_review("guarantees 2x revenue in 7 days")
        assert r.status_code == 201
        body = r.json()
        assert "review_id" in body
        assert body["status"] == "completed"
        assert body["analysis_mode"] == "rule_based_demo"

    def test_get_review_returns_same_findings(self):
        content = "Clinically proven. The #1 most trusted brand."
        r1 = _post_review(content)
        assert r1.status_code == 201
        review_id = r1.json()["review_id"]

        r2 = client.get(f"/api/reviews/{review_id}")
        assert r2.status_code == 200
        body = r2.json()
        assert body["review_id"] == review_id
        assert len(body["findings"]) == len(r1.json()["findings"])

    def test_unknown_review_id_returns_404(self):
        r = client.get("/api/reviews/non-existent-uuid-xyz")
        assert r.status_code == 404

    def test_clean_content_returns_zero_findings(self):
        r = _post_review(
            "Trusted by 420,000+ customers. Rated 4.9/5 on G2."
        )
        assert r.status_code == 201
        assert r.json()["findings"] == []

    def test_response_shape_complete(self):
        r = _post_review("Our service guarantees results overnight.")
        assert r.status_code == 201
        body = r.json()
        for key in ("review_id", "brand_id", "channel", "status", "analysis_mode", "findings"):
            assert key in body, f"Missing key: {key}"
        for finding in body["findings"]:
            for key in ("id", "type", "severity", "text", "reason",
                        "evidence_status", "source_ids", "suggestion"):
                assert key in finding, f"Finding missing key: {key}"


# ═══════════════════════════════════════════════════════════════════════════════
# 6. Human decisions
# ═══════════════════════════════════════════════════════════════════════════════


class TestHumanDecisions:
    def _create_review_with_findings(self) -> tuple[str, str]:
        """Returns (review_id, first_finding_id)."""
        r = _post_review("guarantees 2x revenue in 7 days for all clients")
        assert r.status_code == 201
        body = r.json()
        assert len(body["findings"]) > 0
        return body["review_id"], body["findings"][0]["id"]

    def test_accept_finding(self):
        review_id, finding_id = self._create_review_with_findings()
        r = client.post(
            f"/api/reviews/{review_id}/decision",
            json={"finding_id": finding_id, "action": "accepted"},
        )
        assert r.status_code == 200
        body = r.json()
        decisions = body["human_decisions"]
        assert any(
            d["finding_id"] == finding_id and d["action"] == "accepted"
            for d in decisions
        )

    def test_reject_finding(self):
        review_id, finding_id = self._create_review_with_findings()
        r = client.post(
            f"/api/reviews/{review_id}/decision",
            json={"finding_id": finding_id, "action": "rejected", "note": "Not applicable"},
        )
        assert r.status_code == 200
        body = r.json()
        decisions = body["human_decisions"]
        assert any(
            d["finding_id"] == finding_id and d["action"] == "rejected"
            for d in decisions
        )

    def test_re_decide_overwrites(self):
        review_id, finding_id = self._create_review_with_findings()

        # First: accept
        r1 = client.post(
            f"/api/reviews/{review_id}/decision",
            json={"finding_id": finding_id, "action": "accepted"},
        )
        assert r1.status_code == 200

        # Then: reject (should overwrite)
        r2 = client.post(
            f"/api/reviews/{review_id}/decision",
            json={"finding_id": finding_id, "action": "rejected"},
        )
        assert r2.status_code == 200
        decisions = r2.json()["human_decisions"]
        matching = [d for d in decisions if d["finding_id"] == finding_id]
        assert len(matching) == 1
        assert matching[0]["action"] == "rejected"

    def test_decision_on_unknown_review_returns_404(self):
        r = client.post(
            "/api/reviews/bad-review-id/decision",
            json={"finding_id": "any-id", "action": "accepted"},
        )
        assert r.status_code == 404

    def test_decision_on_unknown_finding_returns_422(self):
        review_id, _ = self._create_review_with_findings()
        r = client.post(
            f"/api/reviews/{review_id}/decision",
            json={"finding_id": "not-a-real-finding-id", "action": "accepted"},
        )
        assert r.status_code == 422

    def test_invalid_action_rejected(self):
        review_id, finding_id = self._create_review_with_findings()
        r = client.post(
            f"/api/reviews/{review_id}/decision",
            json={"finding_id": finding_id, "action": "maybe"},
        )
        assert r.status_code == 422

    def test_note_is_persisted_and_returned(self):
        review_id, finding_id = self._create_review_with_findings()
        note = "Reviewed by legal team — acceptable for this campaign."
        r = client.post(
            f"/api/reviews/{review_id}/decision",
            json={"finding_id": finding_id, "action": "accepted", "note": note},
        )
        assert r.status_code == 200
        decisions = r.json()["human_decisions"]
        matching = [d for d in decisions if d["finding_id"] == finding_id]
        assert matching[0]["note"] == note

    def test_decided_at_is_present(self):
        review_id, finding_id = self._create_review_with_findings()
        r = client.post(
            f"/api/reviews/{review_id}/decision",
            json={"finding_id": finding_id, "action": "accepted"},
        )
        decisions = r.json()["human_decisions"]
        matching = [d for d in decisions if d["finding_id"] == finding_id]
        assert matching[0]["decided_at"]  # non-empty


# ═══════════════════════════════════════════════════════════════════════════════
# 7. Preserved original endpoints
# ═══════════════════════════════════════════════════════════════════════════════


class TestOriginalEndpoints:
    def test_root_returns_200(self):
        r = client.get("/")
        assert r.status_code == 200
        assert "BrandProof" in r.json()["message"]

    def test_health_returns_ok(self):
        r = client.get("/health")
        assert r.status_code == 200
        body = r.json()
        assert body["status"] == "ok"
        assert body["service"] == "brandproof-api"


# ═══════════════════════════════════════════════════════════════════════════════
# 8. List reviews (Review history)
# ═══════════════════════════════════════════════════════════════════════════════


class TestListReviews:
    def test_list_reviews_returns_200_and_list(self):
        r = client.get("/api/reviews")
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_list_reviews_contains_created_review(self):
        content = "Brand unique test content with guarantees 2x revenue."
        created = _post_review(content, channel="email")
        assert created.status_code == 201
        review_id = created.json()["review_id"]

        r = client.get("/api/reviews")
        assert r.status_code == 200
        items = r.json()
        matching = [item for item in items if item["review_id"] == review_id]
        assert len(matching) == 1
        assert matching[0]["channel"] == "email"
        assert matching[0]["content"] == content
        assert len(matching[0]["findings"]) > 0

    def test_list_reviews_includes_human_decisions(self):
        created = _post_review("Guarantees 2x revenue in 7 days.")
        review_id = created.json()["review_id"]
        finding_id = created.json()["findings"][0]["id"]

        # Accept the finding
        dec_res = client.post(
            f"/api/reviews/{review_id}/decision",
            json={"finding_id": finding_id, "action": "accepted", "note": "Approved by reviewer"},
        )
        assert dec_res.status_code == 200

        # Retrieve all reviews
        r = client.get("/api/reviews")
        assert r.status_code == 200
        items = r.json()
        matching = next(item for item in items if item["review_id"] == review_id)
        assert len(matching["human_decisions"]) == 1
        assert matching["human_decisions"][0]["finding_id"] == finding_id
        assert matching["human_decisions"][0]["action"] == "accepted"
        assert matching["human_decisions"][0]["note"] == "Approved by reviewer"

    def test_list_reviews_pagination_limit(self):
        r = client.get("/api/reviews?limit=2")
        assert r.status_code == 200
        items = r.json()
        assert len(items) <= 2


# ═══════════════════════════════════════════════════════════════════════════════
# 9. CORS Middleware & Preflight verification
# ═══════════════════════════════════════════════════════════════════════════════


class TestCORS:
    @pytest.mark.parametrize(
        "origin",
        [
            "https://brand-proof-teal.vercel.app",
            "https://brand-proof-qdnjl5bwd-powerr-house.vercel.app",
            "http://localhost:3000",
            "http://127.0.0.1:3000",
        ],
    )
    def test_cors_allowed_origins_preflight(self, origin: str):
        headers = {
            "Origin": origin,
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type",
        }
        r = client.options("/api/reviews", headers=headers)
        assert r.status_code == 200
        assert r.headers.get("access-control-allow-origin") == origin
        assert "POST" in r.headers.get("access-control-allow-methods", "")

    def test_cors_disallowed_origin_preflight(self):
        headers = {
            "Origin": "https://malicious-untrusted-origin.com",
            "Access-Control-Request-Method": "POST",
        }
        r = client.options("/api/reviews", headers=headers)
        # Disallowed origin does not get Access-Control-Allow-Origin header
        assert "access-control-allow-origin" not in r.headers

    def test_cors_actual_post_request(self):
        origin = "https://brand-proof-teal.vercel.app"
        r = client.post(
            "/api/reviews",
            json={"content": "Clean marketing update without claims.", "channel": "social"},
            headers={"Origin": origin},
        )
        assert r.status_code == 201
        assert r.headers.get("access-control-allow-origin") == origin
        assert r.headers.get("access-control-allow-credentials") == "true"


# ═══════════════════════════════════════════════════════════════════════════════
# 10. Guidelines & Metrics Endpoints
# ═══════════════════════════════════════════════════════════════════════════════


class TestGuidelinesAndMetrics:
    def test_guidelines_endpoint(self):
        r = client.get("/api/guidelines")
        assert r.status_code == 200
        data = r.json()
        assert "guidelines" in data
        assert data["total"] == len(data["guidelines"])
        assert data["total"] >= 7
        rule_ids = [g["id"] for g in data["guidelines"]]
        assert "absolute_guarantee" in rule_ids
        assert "prohibited_term" in rule_ids

    def test_metrics_endpoint(self):
        r = client.get("/api/metrics")
        assert r.status_code == 200
        data = r.json()
        assert "total_reviews" in data
        assert "total_findings" in data
        assert "accepted_decisions" in data
        assert "rejected_decisions" in data
        assert "compliance_score" in data
        assert isinstance(data["total_reviews"], int)


