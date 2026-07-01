"""
services/rag_service/core/retriever.py
Four-stage hybrid retrieval pipeline.

Stage 1: Embed query with "search_query:" prefix (nomic-embed-text)
Stage 2A: Dense search — ChromaDB cosine similarity, top-20
Stage 2B: Sparse search — BM25Okapi, top-20
Stage 3: RRF fusion — merge ranked lists, top-10
(Stage 4 is cross-encoder reranking in reranker.py)

BM25 index is a module-level singleton built at RAG service startup
from all chunks in MongoDB. Rebuilt after each successful ingestion
via the /rebuild-index endpoint.
"""
import asyncio
import logging
import re

import httpx
from rank_bm25 import BM25Okapi

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../../.."))

from services.shared.config import get_settings
from services.shared.chroma import get_collection

logger = logging.getLogger(__name__)
cfg    = get_settings()


# ── Tokenizer ────────────────────────────────────────────────────────────────

def tokenize(text: str) -> list[str]:
    """
    Lowercase split on non-alphanumeric, preserving hyphenated equipment tags.
    "P-101 failed" → ["p-101", "failed"]
    """
    return re.findall(r"[a-z0-9]+(?:-[a-z0-9]+)*", text.lower())


# ── BM25 index singleton ─────────────────────────────────────────────────────

class BM25Index:
    def __init__(self):
        self.chunk_ids:  list[str]  = []
        self.raw_texts:  list[str]  = []
        self.metadatas:  list[dict] = []
        self.corpus:     list[list] = []   # tokenized texts
        self.bm25:       BM25Okapi | None = None
        self._lock = asyncio.Lock()

    async def build_from_mongo(self, chunks_coll) -> None:
        """Load all chunks from MongoDB and build BM25 index."""
        async with self._lock:
            self.chunk_ids = []
            self.raw_texts = []
            self.metadatas = []
            self.corpus    = []

            async for chunk in chunks_coll.find(
                {}, {"chunk_id": 1, "text": 1, "doc_id": 1, "section": 1}
            ):
                self.chunk_ids.append(chunk["chunk_id"])
                self.raw_texts.append(chunk["text"])
                self.metadatas.append({
                    "doc_id":  chunk.get("doc_id", ""),
                    "section": chunk.get("section", ""),
                })
                self.corpus.append(tokenize(chunk["text"]))

            if self.corpus:
                self.bm25 = BM25Okapi(self.corpus)

        logger.info(f"BM25 index built: {len(self.corpus)} chunks")

    def search(self, query: str, n: int = 20, scope_doc_id: str | None = None) -> list[dict]:
        if not self.bm25 or not self.corpus:
            return []

        q_tokens = tokenize(query)
        if not q_tokens:
            return []

        scores  = self.bm25.get_scores(q_tokens)
        top_idx = sorted(range(len(scores)), key=lambda i: scores[i], reverse=True)[:n]

        results = []
        for rank, i in enumerate(top_idx):
            if scores[i] <= 0.0:
                continue
            meta = self.metadatas[i]
            if scope_doc_id and meta.get("doc_id") != scope_doc_id:
                continue
            results.append({
                "chunk_id":     self.chunk_ids[i],
                "text":         self.raw_texts[i],
                "metadata":     meta,
                "sparse_score": float(scores[i]),
                "sparse_rank":  len(results) + 1,
            })
        return results


# Module-level singleton — built at startup, rebuilt on demand
bm25_index = BM25Index()


# ── Stage 1: Query embedding ─────────────────────────────────────────────────

async def embed_query(query: str) -> list[float]:
    """
    Embed user query with "search_query:" prefix.
    DIFFERENT from "search_document:" used at ingestion time.
    nomic-embed-text was trained to bring these two prefix spaces together.
    """
    prefixed = f"search_query: {query}"
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.post(
            f"{cfg.OLLAMA_BASE_URL}/api/embeddings",
            json={"model": cfg.OLLAMA_EMBED_MODEL, "prompt": prefixed},
        )
        resp.raise_for_status()
    return resp.json()["embedding"]


# ── Stage 2A: Dense retrieval ────────────────────────────────────────────────

async def dense_search(
    query_embedding: list[float],
    n_results:       int = 20,
    scope_doc_id:    str | None = None,
) -> list[dict]:
    """Cosine similarity search in ChromaDB. Optional doc scope filter."""
    collection = get_collection()
    count      = collection.count()
    if count == 0:
        return []

    where   = {"doc_id": scope_doc_id} if scope_doc_id else None
    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=min(n_results, count),
        include=["documents", "metadatas", "distances"],
        where=where,
    )

    chunks = []
    for i, chunk_id in enumerate(results["ids"][0]):
        # ChromaDB cosine distance → similarity: sim = 1 - dist
        cosine_sim = 1.0 - results["distances"][0][i]
        chunks.append({
            "chunk_id":    chunk_id,
            "text":        results["documents"][0][i],
            "metadata":    results["metadatas"][0][i],
            "dense_score": cosine_sim,
            "dense_rank":  i + 1,
        })
    return chunks


# ── Stage 2B: Sparse retrieval ───────────────────────────────────────────────

def sparse_search(query: str, n: int = 20, scope_doc_id: str | None = None) -> list[dict]:
    """BM25 search against in-memory index."""
    return bm25_index.search(query, n=n, scope_doc_id=scope_doc_id)


# ── Stage 3: RRF fusion ──────────────────────────────────────────────────────

def reciprocal_rank_fusion(
    dense_results:  list[dict],
    sparse_results: list[dict],
    k:              int = 60,
    top_n:          int = 10,
) -> list[dict]:
    """
    Reciprocal Rank Fusion (Cormack, Clarke & Buettcher, SIGIR 2009).

    RRF(d) = Σ 1 / (k + rank_i(d))   where k=60 (paper recommendation)

    Ignores raw scores — uses only rank positions.
    This is robust to different score scales between dense and sparse.
    """
    rrf_scores: dict[str, float] = {}
    chunk_meta: dict[str, dict]  = {}

    for rank, chunk in enumerate(dense_results):
        cid = chunk["chunk_id"]
        rrf_scores[cid]  = rrf_scores.get(cid, 0.0) + 1.0 / (k + rank + 1)
        chunk_meta[cid]  = chunk

    for rank, chunk in enumerate(sparse_results):
        cid = chunk["chunk_id"]
        rrf_scores[cid]  = rrf_scores.get(cid, 0.0) + 1.0 / (k + rank + 1)
        if cid not in chunk_meta:
            chunk_meta[cid] = chunk  # sparse-only hit

    ranked = sorted(rrf_scores.items(), key=lambda x: x[1], reverse=True)[:top_n]

    return [
        {**chunk_meta[cid], "rrf_score": score, "rrf_rank": i + 1}
        for i, (cid, score) in enumerate(ranked)
    ]