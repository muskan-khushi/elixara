"""
services/graph_service/routers/nodes.py
GET /nodes — list entity nodes with optional type/mention filters.
"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../../.."))

from fastapi import APIRouter, Query
from services.shared.mongo import get_db

router = APIRouter()


@router.get("/nodes")
async def get_nodes(
    type:         str | None = Query(None),   # equipment|regulation|person|...
    min_mentions: int        = Query(1, ge=1),
    limit:        int        = Query(500, le=2000),
):
    db    = get_db()
    query: dict = {}
    if type:              query["type"]          = type
    if min_mentions > 1:  query["mention_count"] = {"$gte": min_mentions}

    nodes = await db["graph_nodes"].find(
        query, {"_id": 1, "type": 1, "label": 1, "mention_count": 1}
    ).sort("mention_count", -1).limit(limit).to_list(limit)

    return [
        {
            "id":       n["_id"],
            "type":     n.get("type", "unknown"),
            "label":    n.get("label", n["_id"]),
            "mentions": n.get("mention_count", 1),
        }
        for n in nodes
    ]


@router.get("/nodes/{node_id:path}")
async def get_node(node_id: str):
    from fastapi import HTTPException
    db   = get_db()
    node = await db["graph_nodes"].find_one({"_id": node_id})
    if not node:
        raise HTTPException(404, f"Node '{node_id}' not found")
    node["id"] = node.pop("_id")
    return node