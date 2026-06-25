"""
services/rag_service/core/reranker.py
Stage 4: Cross-encoder reranking over top-10 RRF results.

Model: cross-encoder/ms-marco-MiniLM-L-6-v2
  - 22MB, 6-layer MiniLM
  - Trained on MS MARCO passage ranking (8.8M real user queries)
  - Jointly encodes [query, document] — far more precise than bi-encoder
  - ~100-300ms for 10 pairs on CPU (acceptable for hackathon demo)

Loaded once at module import (first call downloads 22MB to ~/.cache/torch/).
"""
import logging

import numpy as np
from sentence_transformers import CrossEncoder

logger = logging.getLogger(__name__)

_model: CrossEncoder | None = None
MODEL_NAME = "cross-encoder/ms-marco-MiniLM-L-6-v2"


def get_reranker() -> CrossEncoder:
    global _model
    if _model is None:
        logger.info(f"Loading cross-encoder: {MODEL_NAME}")
        _model = CrossEncoder(
            MODEL_NAME,
            max_length=512,
            device="cpu",
        )
        logger.info("Cross-encoder loaded")
    return _model


def sigmoid(x: float) -> float:
    """Convert raw logit to [0, 1] probability."""
    return float(1.0 / (1.0 + np.exp(-float(x))))


def rerank(
    query:  str,
    chunks: list[dict],
    top_k:  int = 5,
) -> list[dict]:
    """
    Rerank chunks using cross-encoder. Returns top_k sorted by relevance.
    Adds rerank_score (raw logit) and confidence (sigmoid) to each chunk.
    """
    if not chunks:
        return []

    pairs  = [(query, c["text"]) for c in chunks]
    scores = get_reranker().predict(pairs)  # numpy array shape (n,)

    ranked = sorted(
        zip(scores, chunks),
        key=lambda x: float(x[0]),
        reverse=True,
    )

    return [
        {
            **chunk,
            "rerank_score": float(score),
            "confidence":   sigmoid(float(score)),
        }
        for score, chunk in ranked[:top_k]
    ]


def compute_confidence(top_chunks: list[dict]) -> float:
    """
    Overall answer confidence from top reranked chunk's sigmoid score.

    Adjustments:
      - All 5 chunks from same document: -10% (low source diversity)
      - Chunks from 3+ documents:        +5%  (cross-doc corroboration)
    Clipped to [0.0, 1.0].
    """
    if not top_chunks:
        return 0.0

    base    = top_chunks[0].get("confidence", 0.5)
    doc_ids = {c.get("metadata", {}).get("doc_id", "") for c in top_chunks}

    if len(doc_ids) == 1:
        base = max(0.0, base - 0.10)
    elif len(doc_ids) >= 3:
        base = min(1.0, base + 0.05)

    return round(base, 3)