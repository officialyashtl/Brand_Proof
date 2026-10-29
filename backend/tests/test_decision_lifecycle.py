"""
BrandProof Decision Lifecycle Regression Test Suite.

Verifies:
1. Submit Accept succeeds and returns updated review.
2. Subsequent GET /api/reviews/{id} returns saved decision as Accepted.
3. Submit Reject updates saved decision to Rejected.
4. Invalid decision actions are rejected with 422.
5. Missing review IDs return 404.
6. Non-existent finding IDs return 422.
7. History (/api/reviews) and detail (/api/reviews/{id}) endpoints agree.
8. Multiple findings within a single review maintain independent decisions.
9. Re-decisions and duplicate submissions are idempotent and do not create duplicate records.
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

from app.main import app
from app.database import init_db

init_db()
client = TestClient(app)

SAMPLE_MARKETING = """
🚀 Guaranteed 2x revenue growth in just 7 days!
Clinically proven results with #1 most trusted platform.
"""


class TestDecisionLifecycle:
    @pytest.fixture(autouse=True)
    def setup_review(self):
        # Create a fresh review with findings
        res = client.post(
            "/api/reviews",
            json={
                "content": SAMPLE_MARKETING,
                "channel": "social",
                "brand_id": "demo-brand",
            },
        )
        assert res.status_code == 201
        self.review_data = res.json()
        self.review_id = self.review_data["review_id"]
        assert len(self.review_data["findings"]) >= 2
        self.finding_1 = self.review_data["findings"][0]["id"]
        self.finding_2 = self.review_data["findings"][1]["id"]

    def test_submit_accept_succeeds(self):
        """1. Submit Accept and verify the endpoint succeeds."""
        res = client.post(
            f"/api/reviews/{self.review_id}/decision",
            json={
                "finding_id": self.finding_1,
                "action": "accepted",
                "note": "Approved by compliance lead",
            },
        )
        assert res.status_code == 200
        data = res.json()
        assert data["review_id"] == self.review_id
        decisions = data.get("human_decisions", [])
        assert len(decisions) == 1
        assert decisions[0]["finding_id"] == self.finding_1
        assert decisions[0]["action"] == "accepted"
        assert decisions[0]["note"] == "Approved by compliance lead"
        assert "decided_at" in decisions[0]

    def test_fetch_again_returns_accepted(self):
        """2. Fetch the record again and verify the saved decision is Accepted."""
        # First accept
        client.post(
            f"/api/reviews/{self.review_id}/decision",
            json={"finding_id": self.finding_1, "action": "accepted"},
        )

        # GET detail
        res = client.get(f"/api/reviews/{self.review_id}")
        assert res.status_code == 200
        data = res.json()
        decisions = {d["finding_id"]: d["action"] for d in data["human_decisions"]}
        assert decisions.get(self.finding_1) == "accepted"

    def test_submit_reject_updates_saved_decision(self):
        """3. Submit Reject and verify the saved decision is Rejected."""
        # Initial accept
        client.post(
            f"/api/reviews/{self.review_id}/decision",
            json={"finding_id": self.finding_1, "action": "accepted"},
        )

        # Re-decide to rejected
        res = client.post(
            f"/api/reviews/{self.review_id}/decision",
            json={"finding_id": self.finding_1, "action": "rejected", "note": "Reconsidered"},
        )
        assert res.status_code == 200
        data = res.json()
        decisions = {d["finding_id"]: d["action"] for d in data["human_decisions"]}
        assert decisions.get(self.finding_1) == "rejected"

        # Verify persisted via GET
        get_res = client.get(f"/api/reviews/{self.review_id}")
        assert get_res.status_code == 200
        persisted = {d["finding_id"]: d["action"] for d in get_res.json()["human_decisions"]}
        assert persisted.get(self.finding_1) == "rejected"

    def test_invalid_decision_action_rejected(self):
        """4. Verify invalid decisions are rejected."""
        res = client.post(
            f"/api/reviews/{self.review_id}/decision",
            json={"finding_id": self.finding_1, "action": "invalid_action"},
        )
        assert res.status_code == 422

    def test_missing_review_id_returns_404(self):
        """5a. Verify missing review ID returns 404."""
        res = client.post(
            "/api/reviews/rev-non-existent-99999/decision",
            json={"finding_id": self.finding_1, "action": "accepted"},
        )
        assert res.status_code == 404

    def test_missing_finding_id_returns_422(self):
        """5b. Verify missing finding ID returns 422."""
        res = client.post(
            f"/api/reviews/{self.review_id}/decision",
            json={"finding_id": "finding-does-not-exist", "action": "accepted"},
        )
        assert res.status_code == 422

    def test_history_and_detail_agree(self):
        """6. Verify history (/api/reviews) and detail (/api/reviews/{id}) responses agree on the decision."""
        # Record decisions on two findings
        client.post(
            f"/api/reviews/{self.review_id}/decision",
            json={"finding_id": self.finding_1, "action": "accepted"},
        )
        client.post(
            f"/api/reviews/{self.review_id}/decision",
            json={"finding_id": self.finding_2, "action": "rejected"},
        )

        # GET detail
        detail_res = client.get(f"/api/reviews/{self.review_id}")
        assert detail_res.status_code == 200
        detail_decisions = {d["finding_id"]: d["action"] for d in detail_res.json()["human_decisions"]}

        # GET history list
        history_res = client.get("/api/reviews")
        assert history_res.status_code == 200
        history_item = next(r for r in history_res.json() if r["review_id"] == self.review_id)
        history_decisions = {d["finding_id"]: d["action"] for d in history_item["human_decisions"]}

        assert detail_decisions == history_decisions
        assert history_decisions[self.finding_1] == "accepted"
        assert history_decisions[self.finding_2] == "rejected"

    def test_independent_decisions_on_multiple_findings(self):
        """7. Verify multiple findings maintain separate, independent decision states."""
        client.post(
            f"/api/reviews/{self.review_id}/decision",
            json={"finding_id": self.finding_1, "action": "accepted"},
        )
        res = client.get(f"/api/reviews/{self.review_id}").json()
        decisions_map = {d["finding_id"]: d["action"] for d in res["human_decisions"]}
        assert decisions_map.get(self.finding_1) == "accepted"
        assert self.finding_2 not in decisions_map  # finding_2 is still pending/undecided

    def test_duplicate_submission_is_idempotent(self):
        """8. Verify duplicate Accept clicks do not duplicate rows in database."""
        for _ in range(3):
            res = client.post(
                f"/api/reviews/{self.review_id}/decision",
                json={"finding_id": self.finding_1, "action": "accepted"},
            )
            assert res.status_code == 200

        detail = client.get(f"/api/reviews/{self.review_id}").json()
        matching = [d for d in detail["human_decisions"] if d["finding_id"] == self.finding_1]
        assert len(matching) == 1
        assert matching[0]["action"] == "accepted"
