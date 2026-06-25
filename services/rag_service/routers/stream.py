"""
services/rag_service/routers/stream.py
GET /stream — Server-Sent Events streaming query endpoint.

Flow:
  1. Check Redis cache → replay cached answer token-by-token if hit
  2. Embed query (nomic-embed-text, "search_query:" prefix)
  3. Dense search ChromaDB top-20
  4. Sparse search BM25 top-20
  5. RRF fusion → top-10
  6. Cross-encoder rerank → top-5
  7. Build prompt (Small-to-Big context)
  8. Stream phi4-mini tokens via Ollama /api/generate
  9. On done: send sources + confidence, cache result in Redis

SSE event format:
  data: {"token": "word "}         ← one per LLM token
  data: {"done": true, "sources": [...], "confidence": 0.87}  ← final
  data: {"error": "..."}           ← on failure
"""
import asyncio
import json
import logging
import sys
import os

import httpx
from fastapi import APIRouter
from fastapi.responses import StreamingResponse

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../../.."))

from services.shared.config import get_settings

from core.retriever import embed_query, dense_search, sparse_search, reciprocal_rank_fusion
from core.reranker import rerank, compute_confidence
from core.prompter import build_prompt, build_sources_payload
from core.redis_cache import get_cached, set_cached

logger = logging.getLogger(__name__)
router = APIRouter()
cfg    = get_settings()


@router.get("/stream")
async def stream_answer(
    q:            str,
    scope_doc_id: str | None = None,
):
    """
    SSE streaming RAG endpoint.
    Opens a long-lived HTTP connection and streams tokens as SSE events.
    """

    # ── Cache hit: replay stored answer ──────────────────────────────────
    cached = get_cached(q, scope_doc_id or "")
    if cached:
        async def replay():
            for token in cached["answer"].split(" "):
                yield f'data: {json.dumps({"token": token + " "})}\n\n'
                await asyncio.sleep(0.02)  # ~50 tokens/s replay speed
            yield f'data: {json.dumps({"done": True, "sources": cached["sources"], "confidence": cached["confidence"], "cached": True})}\n\n'
        return StreamingResponse(
            replay(),
            media_type="text/event-stream",
            headers={"X-Accel-Buffering": "no", "Cache-Control": "no-cache"},
        )

    # ── Full retrieval pipeline ───────────────────────────────────────────
    async def generate():
        try:
            # Stage 1: embed query
            q_embedding = await embed_query(q)

            # Stage 2A + 2B: dual retrieval
            dense_hits  = await dense_search(q_embedding, n_results=cfg.DENSE_TOP_K, scope_doc_id=scope_doc_id)
            sparse_hits = sparse_search(q, n=cfg.SPARSE_TOP_K)

            # Stage 3: RRF fusion
            fused = reciprocal_rank_fusion(dense_hits, sparse_hits, k=cfg.RRF_K, top_n=10)

            # Stage 4: cross-encoder rerank
            top_chunks = rerank(q, fused, top_k=cfg.RERANK_TOP_K)
            confidence = compute_confidence(top_chunks)
            sources    = build_sources_payload(top_chunks)
            prompt     = build_prompt(q, top_chunks)

            # Stream LLM tokens
            full_answer: list[str] = []
            async with httpx.AsyncClient(timeout=120.0) as client:
                async with client.stream(
                    "POST",
                    f"{cfg.OLLAMA_BASE_URL}/api/generate",
                    json={
                        "model":  cfg.OLLAMA_LLM_MODEL,
                        "prompt": prompt,
                        "stream": True,
                        "options": {
                            "temperature": 0.1,
                            "num_predict": 512,
                        },
                    },
                ) as resp:
                    async for line in resp.aiter_lines():
                        if not line.strip():
                            continue
                        try:
                            obj = json.loads(line)
                        except json.JSONDecodeError:
                            continue
                        token = obj.get("response", "")
                        if token:
                            full_answer.append(token)
                            yield f'data: {json.dumps({"token": token})}\n\n'
                        if obj.get("done"):
                            break

            # Final SSE event with metadata
            yield f'data: {json.dumps({"done": True, "sources": sources, "confidence": confidence})}\n\n'

            # Cache result (fire-and-forget — don't await, just set)
            set_cached(q, scope_doc_id or "", {
                "answer":     "".join(full_answer),
                "sources":    sources,
                "confidence": confidence,
            })

        except Exception as exc:
            logger.error(f"Stream error: {exc}", exc_info=True)
            yield f'data: {json.dumps({"error": str(exc)})}\n\n'

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={"X-Accel-Buffering": "no", "Cache-Control": "no-cache"},
    )