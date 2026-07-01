"""
services/rag_service/core/redis_cache.py
Cache-aside pattern for RAG query results.

Key:   sha256(query.lower() + "|" + scope)[:16]
TTL:   3600 seconds (1 hour)
Value: JSON blob {answer, sources, confidence}

Repeated identical queries (very common during demo) return in <50ms
instead of going through the full 15-25s LLM pipeline.
"""
import hashlib
import json
import logging

import redis.asyncio as redis

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../../.."))

from services.shared.config import get_settings

logger = logging.getLogger(__name__)
cfg    = get_settings()

_r: redis.Redis | None = None


def _client() -> redis.Redis:
    global _r
    if _r is None:
        _r = redis.from_url(cfg.REDIS_URL, decode_responses=True)
    return _r


def _cache_key(query: str, scope: str = "") -> str:
    raw = f"{query.lower().strip()}|{scope}"
    return "elixara:query:" + hashlib.sha256(raw.encode()).hexdigest()[:16]


async def get_cached(query: str, scope: str = "") -> dict | None:
    try:
        value = await _client().get(_cache_key(query, scope))
        if value:
            logger.debug(f"Cache HIT for query: {query[:60]}")
            return json.loads(value)
    except Exception as e:
        logger.warning(f"Redis get failed (non-fatal): {e}")
    return None


async def set_cached(query: str, scope: str, result: dict) -> None:
    try:
        await _client().setex(
            _cache_key(query, scope),
            cfg.REDIS_CACHE_TTL,
            json.dumps(result),
        )
        logger.debug(f"Cache SET for query: {query[:60]}")
    except Exception as e:
        logger.warning(f"Redis set failed (non-fatal): {e}")


async def invalidate_all() -> int:
    """Clear all Elixara query cache entries. Used after re-ingestion."""
    try:
        keys = await _client().keys("elixara:query:*")
        if keys:
            return await _client().delete(*keys)
    except Exception as e:
        logger.warning(f"Redis flush failed (non-fatal): {e}")
    return 0