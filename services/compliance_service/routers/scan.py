"""
services/compliance_service/routers/scan.py
POST /scan  — trigger a new compliance scan (async background task).
GET  /scan/{scan_id} — poll scan progress.
"""
import asyncio
import json
import sys, os
import uuid
from datetime import datetime, timezone
from pathlib import Path

import httpx
from fastapi import APIRouter, BackgroundTasks

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../../.."))

from services.shared.config import get_settings
from services.shared.mongo import get_db

router = APIRouter()
cfg    = get_settings()
logger = logging.getLogger(__name__)

# Load regulation DB once at module import
REGS_PATH = Path(__file__).parent.parent / "regulations" / "regulations.json"
REGULATIONS = json.loads(REGS_PATH.read_text(encoding="utf-8"))["regulations"]

CLASSIFY_PROMPT = """\
You are an industrial compliance analyst.

Regulatory requirement:
{requirement}

Answer found in our documents:
{rag_answer}

Based ONLY on the answer above, classify compliance as one of:
  COMPLIANT  - The requirement is clearly and fully addressed
  PARTIAL    - The requirement is partially addressed but with gaps
  GAP        - The requirement is not addressed in our documents

Return ONLY one word: COMPLIANT, PARTIAL, or GAP
No explanation, no punctuation, just the single classification word."""


def utcnow() -> str:
    return datetime.now(timezone.utc).isoformat()


async def _check_one(reg: dict) -> dict:
    """Check a single regulation against the knowledge base via RAG service."""

    # Step 1: query RAG service for evidence
    rag_answer = "No information found."
    try:
        async with httpx.AsyncClient(timeout=90.0) as client:
            resp = await client.post(
                f"{cfg.RAG_SERVICE_URL}/query",
                json={"query": reg["check_query"]},
            )
            if resp.status_code == 200:
                rag_answer = resp.json().get("answer", rag_answer)
    except Exception as e:
        logger.error(f"RAG query failed for reg {reg['id']}: {e}")

    # Step 2: classify compliance with phi4-mini
    status = "PARTIAL"  # safe default
    try:
        prompt = CLASSIFY_PROMPT.format(
            requirement=reg["requirement"],
            rag_answer=rag_answer,
        )
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                f"{cfg.OLLAMA_BASE_URL}/api/generate",
                json={
                    "model":  cfg.OLLAMA_LLM_MODEL,
                    "prompt": prompt,
                    "stream": False,
                    "options": {"temperature": 0, "num_predict": 10},
                },
            )
            word = resp.json().get("response", "").strip().upper()
            if word in ("COMPLIANT", "PARTIAL", "GAP"):
                status = word
    except Exception as e:
        logger.error(f"Ollama generation failed for reg {reg['id']}: {e}")

    return {
        "regulation_id": reg["id"],
        "standard":      reg["standard"],
        "category":      reg["category"],
        "title":         reg["title"],
        "requirement":   reg["requirement"],
        "status":        status,
        "evidence":      rag_answer[:600],
        "check_query":   reg["check_query"],
    }


async def _run_scan(scan_id: str, db):
    """Background task: check all regulations concurrently (max 2 at a time)."""
    sem = asyncio.Semaphore(2)  # don't overwhelm Ollama

    async def check_with_sem(reg):
        async with sem:
            return await _check_one(reg)

    results = await asyncio.gather(*[check_with_sem(r) for r in REGULATIONS])

    summary = {
        "total":     len(results),
        "compliant": sum(1 for r in results if r["status"] == "COMPLIANT"),
        "partial":   sum(1 for r in results if r["status"] == "PARTIAL"),
        "gap":       sum(1 for r in results if r["status"] == "GAP"),
    }

    await db["compliance_scans"].update_one(
        {"_id": scan_id},
        {"$set": {
            "status":       "done",
            "results":      results,
            "summary":      summary,
            "completed_at": utcnow(),
        }},
    )


@router.post("/scan", status_code=202)
async def start_scan(background_tasks: BackgroundTasks):
    db      = get_db()
    scan_id = str(uuid.uuid4())

    await db["compliance_scans"].insert_one({
        "_id":        scan_id,
        "status":     "running",
        "results":    [],
        "summary":    None,
        "started_at": utcnow(),
    })

    background_tasks.add_task(_run_scan, scan_id, db)
    return {"scan_id": scan_id, "status": "running", "total_regulations": len(REGULATIONS)}


@router.get("/scan/{scan_id}")
async def get_scan(scan_id: str):
    from fastapi import HTTPException
    db   = get_db()
    scan = await db["compliance_scans"].find_one({"_id": scan_id}, {"_id": 0})
    if not scan:
        raise HTTPException(404, f"Scan '{scan_id}' not found")
    scan["scan_id"] = scan_id
    return scan