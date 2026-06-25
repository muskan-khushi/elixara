"""
services/ingest_service/routers/jobs.py
GET /jobs/{job_id} — polled by frontend every 2 seconds.

Response shape:
{
  "job_id":         "abc-123",
  "status":         "extracting",
  "events": [
    {"message": "MinerU parser started", "ts": "2024-01-15T10:30:00Z"},
    {"message": "Parsed: 20 pages, 47 elements", "ts": "..."},
    {"message": "38 chunks created", "ts": "..."}
  ],
  "total_chunks":   38,
  "total_entities": 156,
  "error":          null
}

Statuses: queued | parsing | chunking | extracting | embedding | graphing | done | failed
"""
import sys
import os

from fastapi import APIRouter, HTTPException

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../../.."))

from services.shared.mongo import get_db

router = APIRouter()


@router.get("/jobs/{job_id}")
async def get_job_status(job_id: str):
    db  = get_db()
    job = await db["jobs"].find_one({"job_id": job_id}, {"_id": 0})
    if not job:
        raise HTTPException(status_code=404, detail=f"Job '{job_id}' not found")
    return job


@router.get("/jobs")
async def list_jobs(limit: int = 20):
    """List recent jobs, newest first."""
    db   = get_db()
    jobs = await db["jobs"].find(
        {}, {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    return jobs