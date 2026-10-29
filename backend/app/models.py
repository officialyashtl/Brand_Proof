"""
Pydantic models for BrandProof API request / response contracts.
All models use strict validation so invalid payloads are rejected at the boundary.
"""

from __future__ import annotations

from enum import Enum
from typing import List, Literal, Optional
from uuid import UUID

from pydantic import BaseModel, Field, field_validator


# ─── Enumerations ─────────────────────────────────────────────────────────────


class Channel(str, Enum):
    social = "social"
    website = "website"
    email = "email"
    advertisement = "advertisement"


class Severity(str, Enum):
    high = "high"
    medium = "medium"
    low = "low"


class EvidenceStatus(str, Enum):
    found = "found"
    partial = "partial"
    not_found = "not_found"


class FindingType(str, Enum):
    absolute_guarantee = "absolute_guarantee"
    clinical_claim = "clinical_claim"
    superlative_ranking = "superlative_ranking"
    customer_count = "customer_count"
    vague_superlative = "vague_superlative"
    comparative_claim = "comparative_claim"
    prohibited_term = "prohibited_term"


class DecisionAction(str, Enum):
    accepted = "accepted"
    rejected = "rejected"


# ─── Request models ───────────────────────────────────────────────────────────


class ReviewRequest(BaseModel):
    content: str = Field(..., min_length=1, description="Marketing content to analyse")
    channel: Channel = Field(..., description="Destination channel for the content")
    brand_id: str = Field("demo-brand", description="Brand whose guidelines to apply")

    @field_validator("content")
    @classmethod
    def content_not_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("content must not be blank or whitespace-only")
        return v


class DecisionRequest(BaseModel):
    finding_id: str = Field(..., description="ID of the finding being decided on")
    action: DecisionAction = Field(..., description="accepted or rejected")
    note: Optional[str] = Field(None, max_length=500, description="Optional reviewer note")


# ─── Response models ──────────────────────────────────────────────────────────


class Finding(BaseModel):
    id: str
    type: FindingType
    severity: Severity
    text: str = Field(..., description="Verbatim excerpt that triggered the rule")
    reason: str = Field(..., description="Explanation of the compliance issue")
    evidence_status: EvidenceStatus
    source_ids: List[str] = Field(
        default_factory=list,
        description="IDs of approved brand evidence docs that were matched",
    )
    suggestion: str = Field(..., description="Compliant alternative wording")


class HumanDecision(BaseModel):
    finding_id: str
    action: DecisionAction
    note: Optional[str] = None
    decided_at: str  # ISO-8601 string stored from SQLite


class ReviewResponse(BaseModel):
    review_id: str
    brand_id: str
    channel: Channel
    status: Literal["completed", "pending"] = "completed"
    analysis_mode: Literal["rule_based_demo"] = "rule_based_demo"
    findings: List[Finding]
    human_decisions: List[HumanDecision] = Field(default_factory=list)
    created_at: Optional[str] = None
    content: Optional[str] = None

    model_config = {"populate_by_name": True}


class QuestionRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=2000, description="Reviewer question regarding this review or finding")
    finding_id: Optional[str] = Field(None, description="Optional ID of specific finding to scope the question to")

    @field_validator("question")
    @classmethod
    def question_not_blank(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("question must not be blank or whitespace-only")
        return v.strip()


class QuestionResponse(BaseModel):
    review_id: str
    finding_id: Optional[str] = None
    question: str
    answer: str
    related_rule_ids: List[str] = Field(default_factory=list)
    related_finding_ids: List[str] = Field(default_factory=list)
    suggested_next_steps: List[str] = Field(default_factory=list)
    source: Literal["gemini_ai", "deterministic_fallback"]
    model_name: Optional[str] = None


ReviewRequest.model_rebuild()
DecisionRequest.model_rebuild()
ReviewResponse.model_rebuild()
QuestionRequest.model_rebuild()
QuestionResponse.model_rebuild()
