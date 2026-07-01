"""
services/ingest_service/routers/upload.py
POST /upload — receives a file from the gateway, registers it in MongoDB,
and kicks off the background ingestion pipeline.

Returns {job_id, status: "queued"} immediately (HTTP 202).
Frontend polls GET /jobs/{job_id} every 2 seconds.
"""
import shutil
import sys
import os
import uuid
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, UploadFile

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../../.."))
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from services.shared.config import get_settings
from services.shared.mongo import get_db

from pipeline.ingest_task import run_pipeline

router = APIRouter()
cfg    = get_settings()

UPLOAD_DIR = Path(cfg.UPLOAD_DIR)
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_EXTENSIONS = {".pdf", ".docx", ".pptx", ".xlsx", ".png", ".jpg", ".jpeg"}


def utcnow() -> str:
    return datetime.now(timezone.utc).isoformat()


@router.post("/upload", status_code=202)
async def upload_document(
    background_tasks: BackgroundTasks,
    file:     UploadFile = File(...),
    doc_type: str        = Form("unknown"),  # manual|inspection|procedure|work_order|regulatory
):
    """
    Accept a file upload, persist to disk, create job record, start pipeline.
    """
    db = get_db()

    # Validate extension
    suffix = Path(file.filename or "").suffix.lower()
    if suffix not in ALLOWED_EXTENSIONS:
        from fastapi import HTTPException
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported file type '{suffix}'. "
                   f"Allowed: {', '.join(sorted(ALLOWED_EXTENSIONS))}",
        )

    job_id    = str(uuid.uuid4())
    safe_name = (file.filename or "upload").replace(" ", "_")
    file_path = UPLOAD_DIR / f"{job_id}_{safe_name}"

    # Save raw file to disk
    with file_path.open("wb") as f:
        shutil.copyfileobj(file.file, f)

    # Create MongoDB document record
    await db["documents"].insert_one({
        "doc_id":    job_id,
        "filename":  file.filename,
        "doc_type":  doc_type,
        "file_path": str(file_path),
        "status":    "queued",
        "created_at": utcnow(),
        "total_chunks":   0,
        "total_entities": 0,
    })

    # Create MongoDB job record
    await db["jobs"].insert_one({
        "job_id":     job_id,
        "doc_id":     job_id,
        "status":     "queued",
        "events":     [{"message": "Job registered", "ts": utcnow()}],
        "created_at": utcnow(),
        "total_chunks":   0,
        "total_entities": 0,
        "error":      None,
    })

    # Kick off background pipeline (non-blocking)
    background_tasks.add_task(
        run_pipeline,
        job_id    = job_id,
        file_path = str(file_path),
        doc_type  = doc_type,
        db        = db,
    )

    return {"job_id": job_id, "status": "queued", "filename": file.filename}