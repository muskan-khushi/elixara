"""
services/compliance_service/main.py
FastAPI entry point for the Compliance Service (port 5004).
"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../.."))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from services.shared.config import get_settings
from services.shared.mongo import close_client

from routers import scan, gaps, report

cfg = get_settings()

app = FastAPI(
    title="Elixara Compliance Service",
    description="Automated regulation gap detection against Indian industrial standards",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[cfg.FRONTEND_URL, "http://localhost:4000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(scan.router,   tags=["scan"])
app.include_router(gaps.router,   tags=["gaps"])
app.include_router(report.router, tags=["report"])


@app.get("/health")
async def health():
    return {"status": "ok", "service": "compliance"}


@app.on_event("shutdown")
async def shutdown():
    await close_client()