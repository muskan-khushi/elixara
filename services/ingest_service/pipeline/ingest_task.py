"""
services/ingest_service/pipeline/ingest_task.py
Full pipeline orchestrator. Called as a FastAPI BackgroundTask.

Steps:
  1. Register (done before this task is called)
  2. Parse    — MinerU subprocess
  3. Chunk    — hierarchical Markdown chunker
  4. Extract  — phi4-mini NER (concurrent, max 3 at a time)
  5. Embed    — nomic-embed-text → ChromaDB
  6. Graph    — upsert MongoDB nodes/edges
  7. Complete — mark job and document as done
"""
import asyncio
import logging
import sys
import os
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../../.."))

from services.shared.config import get_settings
from services.shared.chroma import get_collection

from .mineru_runner import run_mineru
from .chunker import chunk_markdown
from .entity_extractor import extract_entities
from .embedder import embed_text, store_chunk_in_chroma
from .graph_builder import build_graph_from_chunks

logger = logging.getLogger(__name__)
cfg    = get_settings()


def utcnow() -> str:
    return datetime.now(timezone.utc).isoformat()


async def _push_event(jobs_coll, job_id: str, message: str):
    await jobs_coll.update_one(
        {"job_id": job_id},
        {"$push": {"events": {"message": message, "ts": utcnow()}}},
    )


async def _set_status(jobs_coll, job_id: str, status: str):
    await jobs_coll.update_one(
        {"job_id": job_id},
        {"$set": {"status": status}},
    )


async def run_pipeline(
    job_id:    str,
    file_path: str,
    doc_type:  str,
    db,
) -> None:
    """
    Full ingestion pipeline. Runs as FastAPI BackgroundTask.
    All failures set job status to 'failed' and store the error message.
    """
    jobs      = db["jobs"]
    documents = db["documents"]
    chunks_c  = db["chunks"]
    doc_name  = Path(file_path).name
    output_dir = f"{cfg.PARSED_DIR}/{job_id}"

    try:
        # ── Step 2: Parse ─────────────────────────────────────────────
        await _set_status(jobs, job_id, "parsing")
        parse_result = await run_mineru(file_path, output_dir, job_id, jobs)

        # ── Step 3: Chunk ─────────────────────────────────────────────
        await _set_status(jobs, job_id, "chunking")
        md_text = Path(parse_result["md_path"]).read_text(encoding="utf-8")
        chunks  = chunk_markdown(
            md_text, job_id, doc_name, doc_type,
            chunk_size=cfg.CHUNK_SIZE,
            chunk_overlap=cfg.CHUNK_OVERLAP,
        )
        await _push_event(jobs, job_id, f"{len(chunks)} chunks created")

        # ── Step 4: Extract entities (concurrent, max 3 LLM calls) ───
        await _set_status(jobs, job_id, "extracting")
        sem = asyncio.Semaphore(3)

        async def extract_one(chunk: dict):
            async with sem:
                chunk["entities"] = await extract_entities(
                    chunk["text_for_llm"],
                    ollama_base=cfg.OLLAMA_BASE_URL,
                    model=cfg.OLLAMA_LLM_MODEL,
                )

        await asyncio.gather(*[extract_one(c) for c in chunks])

        total_entities = sum(
            sum(len(v) for v in c.get("entities", {}).values())
            for c in chunks
        )
        await _push_event(jobs, job_id, f"{total_entities} entities extracted")

        # ── Step 5: Embed + store in ChromaDB ────────────────────────
        await _set_status(jobs, job_id, "embedding")
        collection = get_collection()

        for chunk in chunks:
            embedding = await embed_text(
                chunk["text_for_embedding"],
                ollama_base=cfg.OLLAMA_BASE_URL,
                model=cfg.OLLAMA_EMBED_MODEL,
            )
            await store_chunk_in_chroma(chunk, embedding, collection)

        # Also persist chunks in MongoDB for BM25 index rebuild in RAG service
        if chunks:
            mongo_chunks = [
                {
                    "chunk_id": c["chunk_id"],
                    "doc_id":   job_id,
                    "text":     c["text_for_llm"],
                    "section":  c["section_title"],
                    "entities": c.get("entities", {}),
                }
                for c in chunks
            ]
            await chunks_c.insert_many(mongo_chunks)

        await _push_event(jobs, job_id, f"{len(chunks)} vectors indexed in ChromaDB")

        # ── Step 6: Build knowledge graph ────────────────────────────
        await _set_status(jobs, job_id, "graphing")
        nodes_added, edges_added = await build_graph_from_chunks(
            chunks, job_id, doc_name, db
        )
        await _push_event(
            jobs, job_id,
            f"Knowledge graph updated: {nodes_added} nodes, {edges_added} edges"
        )

        # ── Step 7: Complete ──────────────────────────────────────────
        await jobs.update_one(
            {"job_id": job_id},
            {"$set": {
                "status":          "done",
                "total_chunks":    len(chunks),
                "total_entities":  total_entities,
                "completed_at":    utcnow(),
            }},
        )
        await documents.update_one(
            {"doc_id": job_id},
            {"$set": {
                "status":         "indexed",
                "total_chunks":   len(chunks),
                "total_entities": total_entities,
                "completed_at":   utcnow(),
            }},
        )
        logger.info(
            f"Pipeline complete for job {job_id}: "
            f"{len(chunks)} chunks, {total_entities} entities"
        )

    except Exception as exc:
        logger.error(f"Pipeline failed for job {job_id}: {exc}", exc_info=True)
        err_msg = str(exc)[:500]
        await jobs.update_one(
            {"job_id": job_id},
            {"$set": {"status": "failed", "error": err_msg}},
        )
        await documents.update_one(
            {"doc_id": job_id},
            {"$set": {"status": "failed", "error": err_msg}},
        )