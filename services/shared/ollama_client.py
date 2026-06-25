"""
services/shared/ollama_client.py
Thin async httpx wrappers for Ollama API.

Two operations used throughout Elixara:
  - embed(text)    → list[float]  (768 dims, nomic-embed-text)
  - generate(prompt) → str        (phi4-mini, blocking)
  - generate_json(prompt) → dict  (phi4-mini, format="json")
"""
import json
import httpx
from .config import get_settings

_cfg = None


def _settings():
    global _cfg
    if _cfg is None:
        _cfg = get_settings()
    return _cfg


async def embed(text: str, prefix: str = "search_document") -> list[float]:
    """
    Embed text using nomic-embed-text.
    prefix: "search_document" at ingestion time, "search_query" at query time.
    The prefix is CRITICAL for nomic-embed-text retrieval quality (~5-8% gain).
    """
    cfg = _settings()
    prefixed = f"{prefix}: {text}"
    async with httpx.AsyncClient(timeout=20.0) as client:
        resp = await client.post(
            f"{cfg.OLLAMA_BASE_URL}/api/embeddings",
            json={"model": cfg.OLLAMA_EMBED_MODEL, "prompt": prefixed},
        )
        resp.raise_for_status()
    return resp.json()["embedding"]  # list of 768 floats


async def generate(
    prompt: str,
    temperature: float = 0.1,
    max_tokens: int = 512,
) -> str:
    """Blocking LLM generation. Returns full response string."""
    cfg = _settings()
    async with httpx.AsyncClient(timeout=90.0) as client:
        resp = await client.post(
            f"{cfg.OLLAMA_BASE_URL}/api/generate",
            json={
                "model": cfg.OLLAMA_LLM_MODEL,
                "prompt": prompt,
                "stream": False,
                "options": {"temperature": temperature, "num_predict": max_tokens},
            },
        )
        resp.raise_for_status()
    return resp.json().get("response", "").strip()


async def generate_json(
    prompt: str,
    temperature: float = 0.0,
    max_tokens: int = 512,
) -> dict:
    """
    Blocking LLM generation with format='json'.
    phi4-mini has native JSON mode — responses are valid JSON.
    Falls back to {} on parse failure (caller handles fallback).
    """
    cfg = _settings()
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(
            f"{cfg.OLLAMA_BASE_URL}/api/generate",
            json={
                "model": cfg.OLLAMA_LLM_MODEL,
                "prompt": prompt,
                "format": "json",
                "stream": False,
                "options": {"temperature": temperature, "num_predict": max_tokens},
            },
        )
        resp.raise_for_status()
    raw = resp.json().get("response", "{}")
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return {}


async def check_health() -> dict:
    """Ping Ollama and return model availability status."""
    cfg = _settings()
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(f"{cfg.OLLAMA_BASE_URL}/api/tags")
            resp.raise_for_status()
        models = [m["name"] for m in resp.json().get("models", [])]
        return {
            "status": "ok",
            "models": models,
            "llm_ready":   cfg.OLLAMA_LLM_MODEL   in " ".join(models),
            "embed_ready": cfg.OLLAMA_EMBED_MODEL  in " ".join(models),
        }
    except Exception as e:
        return {"status": "down", "error": str(e)}