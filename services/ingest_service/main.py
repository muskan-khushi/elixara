"""
services/ingest_service/main.py
FastAPI entry point for the Ingest Service (port 5001).

Responsibilities:
  - Receive uploaded files from the gateway
  - Run the full ingestion pipeline as a background task
  - Track job progress and expose it via polling endpoint
  - List/query indexed documents
"""
import sys
import os

# Allow importing from services/shared without installing as a package
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../.."))
sys.path.insert(0, os.path.dirname(__file__))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from services.shared.config import get_settings
from services.shared.mongo import get_db, close_client

from routers import upload, jobs, docs

cfg = get_settings()

app = FastAPI(
    title="Elixara Ingest Service",
    description="Document ingestion pipeline: MinerU → Chunk → NER → Embed → Graph",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[cfg.FRONTEND_URL, "http://localhost:4000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount routers
app.include_router(upload.router, tags=["upload"])
app.include_router(jobs.router,   tags=["jobs"])
app.include_router(docs.router,   tags=["documents"])


@app.get("/health")
async def health():
    return {"status": "ok", "service": "ingest"}


@app.on_event("shutdown")
async def shutdown():
    await close_client()