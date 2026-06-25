"""
services/ingest_service/pipeline/embedder.py
Embeds chunks using nomic-embed-text and stores them in ChromaDB.

Key implementation detail:
  - "search_document:" prefix added HERE at embed time (not in chunker)
  - This is the ingestion-side prefix; query-side uses "search_query:"
  - Without these prefixes, nomic-embed-text loses ~5-8% retrieval accuracy
  - ChromaDB metadata values must be str/int/float/bool — entity lists
    are stored as comma-separated strings
"""
import logging

import httpx

logger = logging.getLogger(__name__)


async def embed_text(
    text: str,
    ollama_base: str,
    model: str = "nomic-embed-text",
) -> list[float]:
    """
    Embed a single text string. Adds "search_document:" prefix.
    Returns 768-dim float list.
    """
    prefixed = f"search_document: {text}"
    async with httpx.AsyncClient(timeout=20.0) as client:
        resp = await client.post(
            f"{ollama_base}/api/embeddings",
            json={"model": model, "prompt": prefixed},
        )
        resp.raise_for_status()
    return resp.json()["embedding"]


async def store_chunk_in_chroma(
    chunk: dict,
    embedding: list[float],
    collection,
) -> None:
    """
    Store a chunk + its embedding in ChromaDB.

    ChromaDB metadata restriction: values must be str/int/float/bool.
    Entity lists (equipment_tags, regulations) are joined as comma-sep strings.
    """
    entities = chunk.get("entities", {})

    def flatten(lst: list) -> str:
        return ",".join(str(x) for x in lst if x)

    metadata = {
        **chunk["metadata"],
        # Flatten entity lists
        "equipment_tags": flatten(entities.get("equipment_tags", [])),
        "regulations":    flatten(entities.get("regulations",    [])),
        "personnel":      flatten(entities.get("personnel",      [])),
        "locations":      flatten(entities.get("locations",      [])),
        # Numeric fields
        "token_count":    chunk.get("token_count", 0),
        "chunk_index":    chunk.get("chunk_index", 0),
    }

    collection.add(
        ids=[chunk["chunk_id"]],
        documents=[chunk["text_for_llm"]],   # clean text for LLM context
        embeddings=[embedding],
        metadatas=[metadata],
    )
    logger.debug(f"Stored chunk {chunk['chunk_id']} in ChromaDB")