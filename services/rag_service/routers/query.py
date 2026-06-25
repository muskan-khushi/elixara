"""
services/rag_service/routers/query.py
POST /query  — blocking (non-streaming) query endpoint.
GET  /history — query history from MongoDB.
POST /rebuild-index — trigger BM25 index rebuild after new ingestion.

The blocking endpoint is used by:
  - compliance_service (needs full answer before classifying)
  - automated tests
  - clients that don't support SSE
"""
import logging
import sys
import os
from datetime import datetime, timezone

import httpx
from fastapi import APIRouter

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../../.."))

from services.shared.config import get_settings
from services.shared.mongo import get_db
from services.shared.models import QueryRequest

from core.retriever import embed_query, dense_search, sparse_search, reciprocal_rank_fusion, bm25_index
from core.reranker import rerank, compute_confidence
from core.prompter import build_prompt, build_sources_payload
from core.redis_cache import get_cached, set_cached

logger = logging.getLogger(__name__)
router = APIRouter()
cfg    = get_settings()


def utcnow() -> str:
    return datetime.now(timezone.utc).isoformat()


@router.post("/query")
async def query_docs(body: QueryRequest):
    """Blocking RAG query. Returns full answer JSON."""
    scope = body.scope_doc_id or ""

    # Cache check
    cached = get_cached(body.query, scope)
    if cached:
        return {**cached, "cached": True}

    # Retrieval pipeline
    q_embedding = await embed_query(body.query)
    dense_hits  = await dense_search(q_embedding, n_results=cfg.DENSE_TOP_K, scope_doc_id=body.scope_doc_id)
    sparse_hits = sparse_search(body.query, n=cfg.SPARSE_TOP_K)
    fused       = reciprocal_rank_fusion(dense_hits, sparse_hits, k=cfg.RRF_K, top_n=10)
    top_chunks  = rerank(body.query, fused, top_k=cfg.RERANK_TOP_K)
    confidence  = compute_confidence(top_chunks)
    sources     = build_sources_payload(top_chunks)
    prompt      = build_prompt(body.query, top_chunks)

    # Blocking LLM generation
    async with httpx.AsyncClient(timeout=90.0) as client:
        resp = await client.post(
            f"{cfg.OLLAMA_BASE_URL}/api/generate",
            json={
                "model":  cfg.OLLAMA_LLM_MODEL,
                "prompt": prompt,
                "stream": False,
                "options": {"temperature": 0.1, "num_predict": 512},
            },
        )
        resp.raise_for_status()

    answer = resp.json().get("response", "").strip()

    result = {"answer": answer, "sources": sources, "confidence": confidence, "cached": False}
    set_cached(body.query, scope, result)

    # Persist to query history
    db = get_db()
    await db["queries"].insert_one({
        "query":      body.query,
        "answer":     answer,
        "confidence": confidence,
        "sources":    [s["doc_name"] for s in sources],
        "cached":     False,
        "created_at": utcnow(),
    })

    return result


@router.get("/history")
async def get_history(limit: int = 50):
    """Return recent query history, newest first."""
    db      = get_db()
    queries = await db["queries"].find(
        {}, {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    return queries


@router.post("/rebuild-index")
async def rebuild_bm25_index():
    """
    Rebuild BM25 index from MongoDB after new document ingestion.
    Called by gateway after a successful ingestion job completes.
    """
    db = get_db()
    await bm25_index.build_from_mongo(db["chunks"])
    return {"status": "ok", "chunks_indexed": len(bm25_index.chunk_ids)}