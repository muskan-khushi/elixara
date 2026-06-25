"""
services/graph_service/main.py
FastAPI entry point for the Graph Service (port 5003).

Serves the MongoDB entity-relationship graph to the frontend D3 explorer
and the Pathfinder feature.
"""
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../.."))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from services.shared.config import get_settings
from services.shared.mongo import close_client

from routers import nodes, edges, subgraph, pathfinder

cfg = get_settings()

app = FastAPI(
    title="Elixara Graph Service",
    description="Knowledge graph CRUD, subgraph queries, BFS pathfinder",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[cfg.FRONTEND_URL, "http://localhost:4000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(nodes.router,     tags=["nodes"])
app.include_router(edges.router,     tags=["edges"])
app.include_router(subgraph.router,  tags=["subgraph"])
app.include_router(pathfinder.router, tags=["pathfinder"])


@app.get("/health")
async def health():
    return {"status": "ok", "service": "graph"}


@app.on_event("shutdown")
async def shutdown():
    await close_client()