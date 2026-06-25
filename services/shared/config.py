"""
services/shared/config.py
Centralised configuration via Pydantic BaseSettings.
All services import get_settings() from here.
"""
from functools import lru_cache
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # ── Ollama ──
    OLLAMA_BASE_URL:    str = "http://localhost:11434"
    OLLAMA_LLM_MODEL:   str = "phi4-mini"
    OLLAMA_EMBED_MODEL: str = "nomic-embed-text"

    # ── MongoDB ──
    MONGO_URI:     str = "mongodb://localhost:27017"
    MONGO_DB_NAME: str = "elixara"

    # ── Redis ──
    REDIS_URL:       str = "redis://localhost:6379"
    REDIS_CACHE_TTL: int = 3600

    # ── ChromaDB ──
    CHROMA_DIR: str = "./data/chroma_db"

    # ── Service URLs (used by gateway + inter-service calls) ──
    INGEST_SERVICE_URL:     str = "http://localhost:5001"
    RAG_SERVICE_URL:        str = "http://localhost:5002"
    GRAPH_SERVICE_URL:      str = "http://localhost:5003"
    COMPLIANCE_SERVICE_URL: str = "http://localhost:5004"

    # ── Paths ──
    UPLOAD_DIR: str = "./data/uploads"
    PARSED_DIR: str = "./data/parsed"

    # ── Chunking ──
    CHUNK_SIZE:    int = 400
    CHUNK_OVERLAP: int = 100

    # ── Retrieval ──
    DENSE_TOP_K:  int = 20
    SPARSE_TOP_K: int = 20
    RRF_K:        int = 60
    RERANK_TOP_K: int = 5

    # ── Auth ──
    JWT_SECRET: str = "elixara_hackathon_secret_change_this"
    JWT_EXPIRY: str = "24h"

    # ── Frontend ──
    FRONTEND_URL: str = "http://localhost:5173"

    model_config = {"env_file": "../../.env", "extra": "ignore"}


@lru_cache
def get_settings() -> Settings:
    return Settings()