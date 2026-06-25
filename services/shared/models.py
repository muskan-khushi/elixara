"""
services/shared/models.py
Shared Pydantic request/response models.
Imported by all services to keep API contracts consistent.
"""
from datetime import datetime
from typing import Any
from pydantic import BaseModel, Field


# ── Ingestion ────────────────────────────────────────────────

class JobEvent(BaseModel):
    message: str
    ts: str  # ISO8601 UTC


class JobStatus(BaseModel):
    job_id: str
    status: str  # queued|parsing|chunking|extracting|embedding|graphing|done|failed
    events: list[JobEvent] = []
    total_chunks: int = 0
    total_entities: int = 0
    error: str | None = None
    created_at: str = ""
    completed_at: str | None = None


class DocumentMeta(BaseModel):
    doc_id: str
    filename: str
    doc_type: str
    status: str
    created_at: str
    total_chunks: int = 0
    total_entities: int = 0


# ── RAG / Query ──────────────────────────────────────────────

class QueryRequest(BaseModel):
    query: str
    scope_doc_id: str | None = None


class SourceChunk(BaseModel):
    doc_name: str
    doc_type: str
    section: str
    excerpt: str
    rerank_score: float = 0.0
    confidence: float = 0.0


class QueryResponse(BaseModel):
    answer: str
    sources: list[SourceChunk]
    confidence: float
    cached: bool = False


# ── Knowledge Graph ──────────────────────────────────────────

class GraphNode(BaseModel):
    id: str
    type: str  # equipment|regulation|person|location|process_param|document
    label: str
    mentions: int = 1


class GraphEdge(BaseModel):
    source: str
    target: str
    relation: str  # mentioned_in|co_occurs
    weight: int = 1


class SubgraphResponse(BaseModel):
    nodes: list[GraphNode]
    edges: list[GraphEdge]


class PathResponse(BaseModel):
    path: list[str]
    labels: list[str] = []
    hops: int = -1
    message: str = ""


# ── Compliance ───────────────────────────────────────────────

class ComplianceResult(BaseModel):
    regulation_id: str
    standard: str
    category: str
    title: str
    requirement: str
    status: str  # COMPLIANT|PARTIAL|GAP
    evidence: str
    check_query: str


class ComplianceSummary(BaseModel):
    total: int
    compliant: int
    partial: int
    gap: int


class ComplianceScanResponse(BaseModel):
    scan_id: str
    status: str
    results: list[ComplianceResult] = []
    summary: ComplianceSummary | None = None
    started_at: str = ""
    completed_at: str | None = None


# ── Health ───────────────────────────────────────────────────

class ServiceHealth(BaseModel):
    status: str  # ok|down|slow
    latency_ms: int | None = None
    detail: str | None = None