"""
services/graph_service/routers/subgraph.py
GET /subgraph/{node_id} — return all nodes and edges within N hops.
"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../../.."))

from fastapi import APIRouter, Query
from services.shared.mongo import get_db

router = APIRouter()


@router.get("/subgraph/{node_id:path}")
async def get_subgraph(
    node_id: str,
    hops:    int = Query(1, ge=1, le=3),
):
    """
    BFS-style subgraph expansion.
    hops=1 → direct neighbors only.
    hops=2 → neighbors of neighbors.
    """
    db            = get_db()
    visited_nodes = {node_id}
    frontier      = {node_id}
    all_edges:    list[dict] = []

    for _ in range(hops):
        if not frontier:
            break

        edges = await db["graph_edges"].find({
            "$or": [
                {"from_node": {"$in": list(frontier)}},
                {"to_node":   {"$in": list(frontier)}},
            ]
        }).to_list(2000)

        all_edges.extend(edges)
        new_nodes: set[str] = set()

        for e in edges:
            new_nodes.add(e["from_node"])
            new_nodes.add(e["to_node"])

        frontier       = new_nodes - visited_nodes
        visited_nodes |= new_nodes

    nodes = await db["graph_nodes"].find(
        {"_id": {"$in": list(visited_nodes)}}
    ).to_list(2000)

    # Deduplicate edges by _id
    seen_edges: set[str] = set()
    unique_edges = []
    for e in all_edges:
        eid = e.get("_id", "")
        if eid not in seen_edges:
            seen_edges.add(eid)
            unique_edges.append(e)

    return {
        "nodes": [
            {
                "id":       n["_id"],
                "type":     n.get("type", "unknown"),
                "label":    n.get("label", n["_id"]),
                "mentions": n.get("mention_count", 1),
            }
            for n in nodes
        ],
        "edges": [
            {
                "source":   e["from_node"],
                "target":   e["to_node"],
                "relation": e.get("relation", ""),
                "weight":   e.get("weight", 1),
            }
            for e in unique_edges
        ],
    }