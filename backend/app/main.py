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

import os
import uuid
from contextlib import asynccontextmanager
from typing import Any, AsyncGenerator, Dict, List

from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware

from .database import init_db, load_all_reviews, load_review, save_decision, save_review
from .models import DecisionAction, DecisionRequest, ReviewRequest, ReviewResponse
from .rules import run_rules

# ─── App setup ────────────────────────────────────────────────────────────────

ALLOWED_ORIGINS: List[str] = [
    # Production Vercel deployments
    "https://brand-proof-teal.vercel.app",
    "https://brand-proof-qdnjl5bwd-powerr-house.vercel.app",
    "https://brand-proof-k989hojkq-powerr-house.vercel.app",
    # Local development
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
]


def get_allowed_origins() -> List[str]:
    """Retrieve allowed CORS origins combining defaults and environment overrides."""
    origins = list(ALLOWED_ORIGINS)
    env_origins = os.getenv("ALLOWED_ORIGINS") or os.getenv("CORS_ORIGINS")
    if env_origins:
        for origin in env_origins.split(","):
            cleaned = origin.strip().rstrip("/")
            if cleaned and cleaned not in origins:
                origins.append(cleaned)
    return origins


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
    allow_origins=get_allowed_origins(),
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS", "HEAD", "PUT", "DELETE", "PATCH"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=86400,
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


# ─── Guidelines & Metrics endpoints ──────────────────────────────────────────


GUIDELINES_DATA: List[Dict[str, Any]] = [
    {
        "id": "absolute_guarantee",
        "name": "Absolute Performance Guarantees",
        "severity": "high",
        "category": "Regulatory & Legal",
        "description": "Prohibits unqualified performance guarantees (e.g., 'guarantees 2x revenue') without verifiable empirical conditions.",
    },
    {
        "id": "clinical_claim",
        "name": "Unsubstantiated Clinical Claims",
        "severity": "high",
        "category": "Regulatory & Medical",
        "description": "Flags clinical assertions ('clinically proven', 'scientifically validated') lacking formal FDA/clinical trial documentation.",
    },
    {
        "id": "prohibited_term",
        "name": "Prohibited Terminology",
        "severity": "high",
        "category": "Brand Safety",
        "description": "Prevents legally indefensible absolute assurances such as 'risk-free' and '100% guaranteed'.",
    },
    {
        "id": "superlative_ranking",
        "name": "Superlative & Ranking Claims",
        "severity": "medium",
        "category": "Market Positioning",
        "description": "Requires independent third-party market research citations for '#1', 'most trusted', or ranking claims.",
    },
    {
        "id": "customer_count",
        "name": "Unverified Customer Metrics",
        "severity": "medium",
        "category": "Factual Verification",
        "description": "Requires empirical database metrics for claims specifying customer counts ('500,000+ customers', 'thousands of businesses').",
    },
    {
        "id": "comparative_claim",
        "name": "Comparative Superiority Claims",
        "severity": "medium",
        "category": "Competitive Compliance",
        "description": "Claims of superiority over unnamed competitors require substantiated benchmark data.",
    },
    {
        "id": "vague_superlative",
        "name": "Vague Superlative Language",
        "severity": "low",
        "category": "Brand Voice & Style",
        "description": "Flags exaggerated, non-specific superlatives ('revolutionary', 'unprecedented') to preserve credible brand voice.",
    },
]


@app.get(
    "/api/guidelines",
    summary="List active brand guidelines and compliance rules",
)
def get_guidelines() -> Dict[str, Any]:
    """Retrieve all brand governance policies enforced by the deterministic analysis engine."""
    return {"guidelines": GUIDELINES_DATA, "total": len(GUIDELINES_DATA)}


@app.get(
    "/api/metrics",
    summary="Get workspace compliance metrics",
)
def get_metrics() -> Dict[str, Any]:
    """Calculate and return workspace compliance statistics from recorded reviews."""
    reviews = load_all_reviews(limit=1000)
    total_reviews = len(reviews)
    total_findings = sum(len(r.findings) for r in reviews)
    total_decisions = sum(len(r.human_decisions) for r in reviews)
    accepted_decisions = sum(
        sum(1 for d in r.human_decisions if d.action == DecisionAction.accepted)
        for r in reviews
    )
    rejected_decisions = sum(
        sum(1 for d in r.human_decisions if d.action == DecisionAction.rejected)
        for r in reviews
    )
    compliance_score = (
        round((accepted_decisions / total_decisions) * 100)
        if total_decisions > 0
        else 100
    )
    return {
        "total_reviews": total_reviews,
        "total_findings": total_findings,
        "total_decisions": total_decisions,
        "accepted_decisions": accepted_decisions,
        "rejected_decisions": rejected_decisions,
        "compliance_score": compliance_score,
    }

