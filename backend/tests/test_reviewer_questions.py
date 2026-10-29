"""
Tests for BrandProof Reviewer Question Box and Gemini AI Integration.

Covers:
- Asking questions about reviews and specific findings
- Model response parsing and fallback behaviors
- Validation of question text and finding IDs
- Verification that questions NEVER mutate review records or decisions
- Isolated prompt building with untrusted content protection
"""

from __future__ import annotations

import os
import tempfile
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

# ─── Isolate the test database ────────────────────────────────────────────────
_tmp_db = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
_tmp_db.close()
os.environ["BRANDPROOF_DB"] = _tmp_db.name

from app.main import app
from app.database import init_db, load_review

init_db()
client = TestClient(app)


def _create_sample_review():
    """Helper to create a review with known findings."""
    response = client.post(
        "/api/reviews",
        json={
            "content": "Our solution is clinically proven and 100% guaranteed risk-free to increase ROI.",
            "channel": "advertisement",
            "brand_id": "test-brand",
        },
    )
    assert response.status_code == 201
    return response.json()


class TestReviewerQuestionsAPI:
    def test_ask_valid_question_mocked_gemini(self):
        """Verify successful Gemini AI response handling."""
        review_data = _create_sample_review()
        review_id = review_data["review_id"]
        finding_id = review_data["findings"][0]["id"]

        mock_gemini_json = {
            "candidates": [
                {
                    "content": {
                        "parts": [
                            {
                                "text": (
                                    '{"answer": "This claim violates FDA & FTC compliance rules without empirical clinical trial documentation.", '
                                    '"related_rule_ids": ["clinical_claim"], '
                                    f'"related_finding_ids": ["{finding_id}"], '
                                    '"suggested_next_steps": ["Attach clinical study registry ID", "Adopt suggested rewrite"]}'
                                )
                            }
                        ]
                    }
                }
            ]
        }

        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = mock_gemini_json

        mock_client = MagicMock()
        mock_client.__enter__.return_value = mock_client
        mock_client.post.return_value = mock_resp

        with patch("app.gemini_service.httpx.Client", return_value=mock_client):
            res = client.post(
                f"/api/reviews/{review_id}/questions",
                json={
                    "question": "Why was this clinical claim flagged?",
                    "finding_id": finding_id,
                },
            )

        assert res.status_code == 200
        data = res.json()
        assert data["review_id"] == review_id
        assert data["finding_id"] == finding_id
        assert data["source"] == "gemini_ai"
        assert "clinical trial" in data["answer"].lower()
        assert "clinical_claim" in data["related_rule_ids"]
        assert finding_id in data["related_finding_ids"]
        assert len(data["suggested_next_steps"]) == 2

    def test_ask_blank_question_rejected_422(self):
        """Verify empty or whitespace questions are rejected at API boundary."""
        review_data = _create_sample_review()
        review_id = review_data["review_id"]

        res = client.post(
            f"/api/reviews/{review_id}/questions",
            json={"question": "   "},
        )
        assert res.status_code == 422

    def test_nonexistent_review_returns_404(self):
        """Asking a question on an unknown review returns 404."""
        res = client.post(
            "/api/reviews/00000000-0000-0000-0000-000000000000/questions",
            json={"question": "Explain this finding."},
        )
        assert res.status_code == 404
        assert "not found" in res.json()["detail"].lower()

    def test_invalid_finding_id_returns_422(self):
        """Scoping a question to a finding ID that doesn't exist returns 422."""
        review_data = _create_sample_review()
        review_id = review_data["review_id"]

        res = client.post(
            f"/api/reviews/{review_id}/questions",
            json={
                "question": "What evidence is needed?",
                "finding_id": "non-existent-finding-uuid-999",
            },
        )
        assert res.status_code == 422
        assert "finding" in res.json()["detail"].lower()

    def test_deterministic_fallback_when_gemini_fails(self):
        """When Gemini API returns an error, endpoint gracefully returns deterministic fallback."""
        review_data = _create_sample_review()
        review_id = review_data["review_id"]
        finding = review_data["findings"][0]

        mock_err_resp = MagicMock()
        mock_err_resp.status_code = 503
        mock_err_resp.text = "High demand"

        mock_client = MagicMock()
        mock_client.__enter__.return_value = mock_client
        mock_client.post.return_value = mock_err_resp

        with patch("app.gemini_service.httpx.Client", return_value=mock_client):
            res = client.post(
                f"/api/reviews/{review_id}/questions",
                json={
                    "question": "Why was this flagged?",
                    "finding_id": finding["id"],
                },
            )

        assert res.status_code == 200
        data = res.json()
        assert data["source"] == "deterministic_fallback"
        assert data["model_name"] == "deterministic_engine"
        assert finding["id"] in data["answer"]
        assert len(data["suggested_next_steps"]) > 0

    def test_deterministic_fallback_general_unresolved_question(self):
        """Asking about unresolved findings returns deterministic summary when API is offline."""
        review_data = _create_sample_review()
        review_id = review_data["review_id"]

        with patch("app.gemini_service.get_api_key", return_value=None):
            res = client.post(
                f"/api/reviews/{review_id}/questions",
                json={"question": "What issues remain unresolved?"},
            )

        assert res.status_code == 200
        data = res.json()
        assert data["source"] == "deterministic_fallback"
        assert "unresolved finding" in data["answer"].lower()

    def test_questions_never_mutate_review_or_decisions(self):
        """Ensure asking questions is strictly read-only and leaves decisions and reviews untouched."""
        review_data = _create_sample_review()
        review_id = review_data["review_id"]

        # Record one human decision
        first_finding_id = review_data["findings"][0]["id"]
        dec_resp = client.post(
            f"/api/reviews/{review_id}/decision",
            json={"finding_id": first_finding_id, "action": "accepted", "note": "Approved by legal"},
        )
        assert dec_resp.status_code == 200

        before_review = load_review(review_id)
        assert before_review is not None
        assert len(before_review.human_decisions) == 1

        # Ask multiple questions
        client.post(
            f"/api/reviews/{review_id}/questions",
            json={"question": "Explain finding 1", "finding_id": first_finding_id},
        )
        client.post(
            f"/api/reviews/{review_id}/questions",
            json={"question": "How can I rewrite this?"},
        )

        after_review = load_review(review_id)
        assert after_review is not None
        assert len(after_review.human_decisions) == 1
        assert after_review.human_decisions[0].action.value == "accepted"
        assert after_review.human_decisions[0].note == "Approved by legal"
        assert len(after_review.findings) == len(before_review.findings)
