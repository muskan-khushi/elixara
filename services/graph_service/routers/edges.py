"""
services/graph_service/routers/edges.py
GET /edges — list edges with optional node filter.
"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../../.."))

from fastapi import APIRouter, Query
from services.shared.mongo import get_db

router = APIRouter()


@router.get("/edges")
async def get_edges(
    from_node: str | None = Query(None),
    to_node:   str | None = Query(None),
    relation:  str | None = Query(None),   # mentioned_in|co_occurs
    limit:     int        = Query(1000, le=5000),
):
    db    = get_db()
    query: dict = {}
    if from_node: query["from_node"] = from_node
    if to_node:   query["to_node"]   = to_node
    if relation:  query["relation"]  = relation

    edges = await db["graph_edges"].find(
        query, {"_id": 0}
    ).limit(limit).to_list(limit)

    return [
        {
            "source":   e["from_node"],
            "target":   e["to_node"],
            "relation": e.get("relation", ""),
            "weight":   e.get("weight", 1),
        }
        for e in edges
    ]