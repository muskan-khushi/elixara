"""
services/shared/chroma.py
ChromaDB PersistentClient singleton.
Runs embedded in the RAG service process — no separate server needed.

Collection: elixara_chunks
  - 768-dim cosine space (nomic-embed-text output)
  - metadata: doc_id, doc_name, doc_type, section, chunk_idx,
              equipment_tags (comma-sep string), regulations (comma-sep string)
"""
import chromadb
from chromadb.config import Settings as ChromaSettings
from .config import get_settings

_client: chromadb.PersistentClient | None = None
_collection = None

COLLECTION_NAME = "elixara_chunks"


def get_client() -> chromadb.PersistentClient:
    global _client
    if _client is None:
        cfg = get_settings()
        _client = chromadb.PersistentClient(
            path=cfg.CHROMA_DIR,
            settings=ChromaSettings(anonymized_telemetry=False),
        )
    return _client


def get_collection():
    global _collection
    if _collection is None:
        _collection = get_client().get_or_create_collection(
            name=COLLECTION_NAME,
            metadata={"hnsw:space": "cosine"},  # cosine sim for nomic-embed-text
        )
    return _collection


def reset_collection():
    """Drop and recreate the collection. Called during re-ingestion."""
    global _collection
    client = get_client()
    try:
        client.delete_collection(COLLECTION_NAME)
    except Exception:
        pass
    _collection = None
    return get_collection()