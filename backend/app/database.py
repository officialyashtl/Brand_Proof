"""
SQLite persistence layer for BrandProof reviews and human decisions.

Uses Python stdlib sqlite3 — no external dependency required.
The DB file is created automatically on first use at:
  backend/brandproof.db   (relative to the process working directory)
"""

from __future__ import annotations

import json
import os
import sqlite3
from contextlib import contextmanager
from typing import Generator, List, Optional

from .models import (
    Channel,
    DecisionAction,
    EvidenceStatus,
    Finding,
    FindingType,
    HumanDecision,
    ReviewResponse,
    Severity,
)

# Allow the DB path to be overridden via env var (useful in tests)
_DB_PATH = os.environ.get("BRANDPROOF_DB", "brandproof.db")


@contextmanager
def _get_conn() -> Generator[sqlite3.Connection, None, None]:
    conn = sqlite3.connect(_DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def init_db() -> None:
    """Create tables if they do not already exist."""
    with _get_conn() as conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS reviews (
                review_id   TEXT PRIMARY KEY,
                brand_id    TEXT NOT NULL,
                channel     TEXT NOT NULL,
                content     TEXT NOT NULL,
                findings    TEXT NOT NULL,   -- JSON array
                created_at  TEXT NOT NULL DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS decisions (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                review_id   TEXT NOT NULL,
                finding_id  TEXT NOT NULL,
                action      TEXT NOT NULL,
                note        TEXT,
                decided_at  TEXT NOT NULL DEFAULT (datetime('now')),
                UNIQUE (review_id, finding_id)
            );
            """
        )


# ─── Persistence helpers ───────────────────────────────────────────────────────


def save_review(review: ReviewResponse, content: str) -> None:
    with _get_conn() as conn:
        findings_json = json.dumps(
            [f.model_dump(mode="json") for f in review.findings]
        )
        conn.execute(
            """
            INSERT OR REPLACE INTO reviews (review_id, brand_id, channel, content, findings)
            VALUES (?, ?, ?, ?, ?)
            """,
            (review.review_id, review.brand_id, review.channel.value, content, findings_json),
        )


def load_review(review_id: str) -> Optional[ReviewResponse]:
    with _get_conn() as conn:
        row = conn.execute(
            "SELECT * FROM reviews WHERE review_id = ?", (review_id,)
        ).fetchone()
        if not row:
            return None

        findings_data = json.loads(row["findings"])
        findings = [
            Finding(
                id=f["id"],
                type=FindingType(f["type"]),
                severity=Severity(f["severity"]),
                text=f["text"],
                reason=f["reason"],
                evidence_status=EvidenceStatus(f["evidence_status"]),
                source_ids=f.get("source_ids", []),
                suggestion=f["suggestion"],
            )
            for f in findings_data
        ]

        decisions = _load_decisions(conn, review_id)

        return ReviewResponse(
            review_id=row["review_id"],
            brand_id=row["brand_id"],
            channel=Channel(row["channel"]),
            findings=findings,
            human_decisions=decisions,
        )


def _load_decisions(
    conn: sqlite3.Connection, review_id: str
) -> List[HumanDecision]:
    rows = conn.execute(
        "SELECT * FROM decisions WHERE review_id = ?", (review_id,)
    ).fetchall()
    return [
        HumanDecision(
            finding_id=r["finding_id"],
            action=DecisionAction(r["action"]),
            note=r["note"],
            decided_at=r["decided_at"],
        )
        for r in rows
    ]


def save_decision(review_id: str, finding_id: str, action: str, note: Optional[str]) -> HumanDecision:
    with _get_conn() as conn:
        # Verify finding exists in this review
        row = conn.execute(
            "SELECT findings FROM reviews WHERE review_id = ?", (review_id,)
        ).fetchone()
        if not row:
            raise ValueError(f"Review '{review_id}' not found")

        findings_data = json.loads(row["findings"])
        finding_ids = {f["id"] for f in findings_data}
        if finding_id not in finding_ids:
            raise ValueError(
                f"Finding '{finding_id}' does not belong to review '{review_id}'"
            )

        conn.execute(
            """
            INSERT INTO decisions (review_id, finding_id, action, note)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(review_id, finding_id) DO UPDATE SET
                action     = excluded.action,
                note       = excluded.note,
                decided_at = datetime('now')
            """,
            (review_id, finding_id, action, note),
        )

        decided_at_row = conn.execute(
            "SELECT decided_at FROM decisions WHERE review_id=? AND finding_id=?",
            (review_id, finding_id),
        ).fetchone()

    return HumanDecision(
        finding_id=finding_id,
        action=DecisionAction(action),
        note=note,
        decided_at=decided_at_row["decided_at"],
    )
