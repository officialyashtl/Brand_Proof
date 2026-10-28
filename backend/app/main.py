"""
BrandProof FastAPI application.

Endpoints
─────────
GET  /                          Health root
GET  /health                    Service health check  (preserved from original)
POST /api/reviews               Submit content for brand compliance review
GET  /api/reviews/{review_id}   Retrieve a saved review with decisions
POST /api/reviews/{review_id}/decision  Accept or reject a single finding

Analysis mode: rule_based_demo
All analysis is deterministic and rule-based. No AI provider is integrated yet.
This is clearly communicated in every review response via the `analysis_mode` field.
"""

from __future__ import annotations


import uuid
from contextlib import asynccontextmanager
from typing import Any, AsyncGenerator, Dict, List

from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware

from .database import init_db, load_all_reviews, load_review, save_decision, save_review
from .models import DecisionRequest, ReviewRequest, ReviewResponse
from .rules import run_rules

# ─── App setup ────────────────────────────────────────────────────────────────


@asynccontextmanager
async def lifespan(application: FastAPI) -> AsyncGenerator[None, None]:
    """Initialise the SQLite database on startup."""
    init_db()
    yield


app = FastAPI(
    title="BrandProof API",
    description=(
        "Rule-based brand governance and content review. "
        "Analysis mode: deterministic rule engine (demo). "
        "AI integration is not yet active."
    ),
    version="0.2.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Existing preserved endpoints ─────────────────────────────────────────────


@app.get("/")
def root() -> Dict[str, Any]:
    return {"message": "BrandProof API is running"}


@app.get("/health")
def health() -> Dict[str, Any]:
    return {"status": "ok", "service": "brandproof-api"}


# ─── Review endpoints ─────────────────────────────────────────────────────────


@app.post(
    "/api/reviews",
    response_model=ReviewResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Submit content for brand compliance review",
)
def create_review(body: ReviewRequest) -> ReviewResponse:
    """
    Analyse *content* against brand guidelines for *brand_id*.

    Returns a list of findings produced by the rule-based demo engine.
    Each finding includes severity, evidence_status, source_ids, and a
    suggested compliant rewrite.

    **Analysis mode:** `rule_based_demo` — deterministic, no AI calls.
    """
    findings = run_rules(body.content)

    review = ReviewResponse(
        review_id=str(uuid.uuid4()),
        brand_id=body.brand_id,
        channel=body.channel,
        findings=findings,
        content=body.content,
    )
    save_review(review, body.content)
    return review


@app.get(
    "/api/reviews",
    response_model=List[ReviewResponse],
    summary="List all previously saved reviews",
)
def list_reviews(limit: int = 50, offset: int = 0) -> List[ReviewResponse]:
    """
    Retrieve history of all submitted content reviews with findings
    and human decisions, ordered most recent first.
    """
    return load_all_reviews(limit=limit, offset=offset)


@app.get(
    "/api/reviews/{review_id}",
    response_model=ReviewResponse,
    summary="Retrieve a saved review",
)
def get_review(review_id: str) -> ReviewResponse:
    """
    Fetch a previously submitted review including all human decisions recorded
    against its findings.
    """
    review = load_review(review_id)
    if review is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Review '{review_id}' not found.",
        )
    return review


@app.post(
    "/api/reviews/{review_id}/decision",
    response_model=ReviewResponse,
    summary="Record a human decision on a finding",
)
def record_decision(review_id: str, body: DecisionRequest) -> ReviewResponse:
    """
    Accept or reject a single finding within a review.

    - The decision is persisted in SQLite and returned with the full updated review.
    - A finding can be re-decided; the latest decision wins.
    """
    # Verify review exists first
    review = load_review(review_id)
    if review is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Review '{review_id}' not found.",
        )

    try:
        save_decision(
            review_id=review_id,
            finding_id=body.finding_id,
            action=body.action.value,
            note=body.note,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc

    # Return fresh copy with all decisions
    updated = load_review(review_id)
    assert updated is not None  # just saved, must exist
    return updated
