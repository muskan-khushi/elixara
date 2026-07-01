"""
services/rag_service/main.py
FastAPI entry point for the RAG Service (port 5002).

Responsibilities:
  - Hybrid retrieval: dense (ChromaDB) + sparse (BM25) + RRF fusion
  - Cross-encoder reranking (ms-marco-MiniLM-L-6-v2)
  - LLM answer generation via phi4-mini (streaming SSE + blocking JSON)
  - Redis query result cache (TTL 1h)
  - BM25 index built from MongoDB chunks at startup
"""
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../.."))
sys.path.insert(0, os.path.dirname(__file__))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from services.shared.config import get_settings
from services.shared.mongo import get_db, close_client

from core.retriever import bm25_index
from routers import query, stream

cfg = get_settings()

app = FastAPI(
    title="Elixara RAG Service",
    description="Hybrid retrieval + reranking + streaming LLM generation",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[cfg.FRONTEND_URL, "http://localhost:4000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(query.router,  tags=["query"])
app.include_router(stream.router, tags=["stream"])


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "service": "rag",
        "bm25_chunks": len(bm25_index.chunk_ids),
    }


@app.on_event("startup")
async def startup():
    """Build BM25 index from all chunks in MongoDB at service startup."""
    db = get_db()
    await bm25_index.build_from_mongo(db["chunks"])


@app.on_event("shutdown")
async def shutdown():
    await close_client()